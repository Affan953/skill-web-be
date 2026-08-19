import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { Habit } from '../habits/habits.interface';
import { CreateReflectionDto } from './dto/create-reflection.dto';
import { ReflectionEntry, ReflectionSummary, WeeklyReview, MonthlyReview } from './dto/reflection-response.dto';
import { XpService } from '../gamification/services/xp.service';
import { LevelService } from '../gamification/services/level.service';
import { StreakService } from '../gamification/services/streak.service';
import { AchievementsService } from '../achievements/achievements.service';
import { DailyQuestsService } from '../daily-quests/daily-quests.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProgressService } from './progress.service';
import { startOfToday } from '../gamification/utils/date.util';
import { toPlainFirestoreObject } from '../common/utils/firestore.util';

const MOTIVATIONAL_INSIGHTS = [
  'You consistently build momentum when you focus on small wins.',
  'Your dedication to reflection shows real self-awareness.',
  'Every session adds up. Your consistency is your superpower.',
  'You are building habits that will compound over time.',
  'The fact that you reflected means you care about growth.',
  'Progress is not always visible, but it is always happening.',
  'Your discipline today builds the foundation for tomorrow.',
  'Staying consistent is harder than starting. You are doing it.',
];

@Injectable()
export class ReflectionsService {
  constructor(
    @Inject(FIRESTORE_DB) private readonly firestore: Firestore,
    private readonly xpService: XpService,
    private readonly levelService: LevelService,
    private readonly streakService: StreakService,
    private readonly achievementsService: AchievementsService,
    private readonly dailyQuestsService: DailyQuestsService,
    private readonly notificationsService: NotificationsService,
    private readonly progressService: ProgressService,
  ) {}

  private reflectionsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/reflections`);
  }

  private habitsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/habits`);
  }

  private userDoc(uid: string) {
    return this.firestore.collection('users').doc(uid);
  }

  async processReflection(uid: string, dto: CreateReflectionDto): Promise<ReflectionEntry> {
    const habitDocRef = this.habitsCollection(uid).doc(dto.habitId);
    const userDocRef = this.userDoc(uid);
    const reflectionDocRef = this.reflectionsCollection(uid).doc();

    let xpEarned = 0;
    let levelUpNewLevel: number | null = null;
    let milestoneStreak: number | null = null;
    let newXpTotal = 0;
    let streakAfter = 0;
    let levelAfter = 1;

    const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

    const completedHabit = await this.firestore.runTransaction(async (transaction) => {
      const [habitSnap, userSnap] = await Promise.all([
        transaction.get(habitDocRef),
        transaction.get(userDocRef),
      ]);

      if (!habitSnap.exists) {
        throw new NotFoundException(`Habit with ID "${dto.habitId}" not found`);
      }
      if (!userSnap.exists) {
        throw new NotFoundException('User profile not found');
      }

      const habit = (habitSnap.data() ?? {}) as Omit<Habit, 'id'>;
      const user = (userSnap.data() ?? {}) as Record<string, any>;

      xpEarned = habit.xpReward != null
        ? habit.xpReward
        : this.xpService.calculateReward(habit.difficulty);

      const newXp = this.xpService.addXP(user['xp'] ?? 0, xpEarned);
      const newLevel = this.levelService.calculateLevel(newXp);

      const { newCurrentStreak, newLongestStreak } =
        this.streakService.calculateUserStreak({
          currentStreak: user['currentStreak'] ?? 0,
          longestStreak: user['longestStreak'] ?? 0,
          lastHabitCompletedAt: user['lastHabitCompletedAt'],
        });

      const oldStreak = user['currentStreak'] ?? 0;
      if (newCurrentStreak > oldStreak && STREAK_MILESTONES.includes(newCurrentStreak)) {
        milestoneStreak = newCurrentStreak;
      }

      if (newLevel > (user['level'] ?? 1)) {
        levelUpNewLevel = newLevel;
      }

      newXpTotal = newXp;
      streakAfter = newCurrentStreak;
      levelAfter = newLevel;

      const newHabitStreak = this.streakService.calculateHabitStreak({
        currentStreak: habit.streak ?? 0,
        lastCompletedAt: habit.completedAt,
      });

      transaction.update(habitDocRef, {
        completedAt: startOfToday(),
        streak: newHabitStreak,
        updatedAt: new Date(),
      });

      transaction.update(userDocRef, {
        xp: newXp,
        level: newLevel,
        totalHabits: (user['totalHabits'] ?? 0) + 1,
        currentStreak: newLongestStreak > (user['longestStreak'] ?? 0) ? newCurrentStreak : (user['currentStreak'] ?? 0),
        longestStreak: newLongestStreak,
        lastHabitCompletedAt: startOfToday(),
        updatedAt: new Date(),
      });

      return { id: habitSnap.id, title: habit.title, category: habit.category, xpEarned };
    });

    const reflectionData = toPlainFirestoreObject({
      habitId: dto.habitId,
      title: dto.title,
      category: dto.category,
      reflection: dto.reflection,
      proofOfProgress: dto.proofOfProgress ?? null,
      sessionMetadata: dto.sessionMetadata
        ? {
            durationMinutes: dto.sessionMetadata.durationMinutes,
            startedAt: dto.sessionMetadata.startedAt,
            completedAt: dto.sessionMetadata.completedAt,
          }
        : null,
      proudOf: dto.proudOf ?? null,
      challenged: dto.challenged ?? null,
      improve: dto.improve ?? null,
      xpEarned,
      streakAfter,
      levelAfter,
      createdAt: new Date().toISOString(),
    });

    await reflectionDocRef.set(reflectionData);

    // Fire-and-forget side effects
    this.fireSideEffects(uid, completedHabit, xpEarned, newXpTotal, streakAfter, levelUpNewLevel, milestoneStreak, dto).catch(() => {});

    return { id: reflectionDocRef.id, ...reflectionData } as ReflectionEntry;
  }

  private async fireSideEffects(
    uid: string,
    habit: { title: string; category: string; xpEarned: number },
    xpEarned: number,
    newXpTotal: number,
    streakAfter: number,
    levelUp: number | null,
    milestoneStreak: number | null,
    dto: CreateReflectionDto,
  ) {
    try { await this.notificationsService.createHabitCompletedNotification(uid, habit.title, xpEarned); } catch {}
    if (levelUp !== null) {
      try { await this.notificationsService.createLevelUpNotification(uid, levelUp); } catch {}
    }
    if (milestoneStreak !== null) {
      try { await this.notificationsService.createStreakNotification(uid, milestoneStreak); } catch {}
    }
    try { await this.dailyQuestsService.checkQuests(uid); } catch {}
    try { await this.achievementsService.checkAchievements(uid); } catch {}
    try { await this.progressService.addXpHistory(uid, xpEarned, `reflection:${dto.title}`, newXpTotal); } catch {}
    try { await this.progressService.addHabitHistory(uid, dto.habitId, habit.title, habit.category, xpEarned, streakAfter); } catch {}
    try {
      await this.notificationsService.createNotification(uid, {
        type: 'REFLECTION_SAVED' as any,
        title: 'Journey Saved!',
        description: `You completed "${dto.title}" and earned ${xpEarned} XP.`,
        metadata: { habitId: dto.habitId, xpEarned, category: dto.category },
      });
    } catch {}
  }

  async getReflections(uid: string): Promise<ReflectionEntry[]> {
    const snapshot = await this.reflectionsCollection(uid).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ReflectionEntry[];
  }

  async getReflectionById(uid: string, id: string): Promise<ReflectionEntry> {
    const doc = await this.reflectionsCollection(uid).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Reflection with ID "${id}" not found`);
    return { id: doc.id, ...doc.data() } as ReflectionEntry;
  }

  async getWeeklySummary(uid: string): Promise<ReflectionSummary> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const allSnap = await this.reflectionsCollection(uid).orderBy('createdAt', 'desc').get();
    const all = allSnap.docs.map((d) => d.data());

    const weekly = all.filter((r) => {
      const c = r['createdAt'];
      if (!c) return false;
      const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
      return date >= weekAgo;
    });

    const categoriesExplored = [...new Set(weekly.map((r) => r['category'] as string).filter(Boolean))];
    const weeklyXp = weekly.reduce((s, r) => s + ((r['xpEarned'] as number) ?? 0), 0);
    const avgLen = weekly.length > 0
      ? Math.round(weekly.reduce((s, r) => s + ((r['reflection'] as string)?.length ?? 0), 0) / weekly.length)
      : 0;

    return {
      totalReflections: all.length,
      weeklyReflections: weekly.length,
      categoriesExplored,
      weeklyXpFromReflections: weeklyXp,
      streakDays: weekly.length,
      averageReflectionLength: avgLen,
    };
  }

  async getWeeklyReview(uid: string): Promise<WeeklyReview> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [reflectionsSnap, historySnap, userSnap] = await Promise.all([
      this.reflectionsCollection(uid).orderBy('createdAt', 'desc').get(),
      this.firestore.collection(`users/${uid}/habit-history`).orderBy('completedAt', 'desc').get(),
      this.userDoc(uid).get(),
    ]);

    const reflections = reflectionsSnap.docs.map((d) => d.data());
    const history = historySnap.docs.map((d) => d.data());
    const user = userSnap.data() ?? {};

    const weekReflections = reflections.filter((r) => {
      const c = r['createdAt'];
      if (!c) return false;
      const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
      return date >= weekAgo;
    });

    const weekHistory = history.filter((h) => {
      const c = h['completedAt'];
      if (!c) return false;
      const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
      return date >= weekAgo;
    });

    const categoryCount = new Map<string, number>();
    for (const r of weekReflections) {
      const cat = (r['category'] as string) || 'Custom';
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
    }
    let bestCategory = 'Custom';
    let maxCount = 0;
    for (const [cat, count] of categoryCount) {
      if (count > maxCount) { bestCategory = cat; maxCount = count; }
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = new Map<string, { completions: number; xp: number }>();
    for (const h of weekHistory) {
      const d = h['completedAt'];
      const date = typeof d === 'string' ? new Date(d) : d?.toDate?.() ?? new Date(d);
      const day = dayNames[date.getDay()];
      const existing = dayCounts.get(day) ?? { completions: 0, xp: 0 };
      existing.completions++;
      existing.xp += (h['xpEarned'] as number) ?? 0;
      dayCounts.set(day, existing);
    }
    let mostActiveDay = 'N/A';
    let maxDay = 0;
    for (const [day, data] of dayCounts) {
      if (data.completions > maxDay) { mostActiveDay = day; maxDay = data.completions; }
    }

    const dailyBreakdown = dayNames.map((day) => ({
      day,
      completions: dayCounts.get(day)?.completions ?? 0,
      xp: dayCounts.get(day)?.xp ?? 0,
    }));

    const xpEarned = weekReflections.reduce((s, r) => s + ((r['xpEarned'] as number) ?? 0), 0);

    const insightIdx = Math.abs(now.getDate()) % MOTIVATIONAL_INSIGHTS.length;

    return {
      weekStart: weekAgo.toISOString(),
      weekEnd: now.toISOString(),
      habitsCompleted: weekHistory.length,
      xpEarned,
      reflectionCount: weekReflections.length,
      bestCategory,
      longestStreak: user['longestStreak'] ?? 0,
      mostActiveDay,
      mostProductiveHour: 'Evening',
      personalInsight: MOTIVATIONAL_INSIGHTS[insightIdx],
      dailyBreakdown,
    };
  }

  async getMonthlyReview(uid: string): Promise<MonthlyReview> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [reflectionsSnap, historySnap] = await Promise.all([
      this.reflectionsCollection(uid).orderBy('createdAt', 'desc').get(),
      this.firestore.collection(`users/${uid}/habit-history`).orderBy('completedAt', 'desc').get(),
    ]);

    const reflections = reflectionsSnap.docs.map((d) => d.data());
    const history = historySnap.docs.map((d) => d.data());

    const monthReflections = reflections.filter((r) => {
      const c = r['createdAt'];
      if (!c) return false;
      const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
      return date >= monthStart;
    });

    const monthHistory = history.filter((h) => {
      const c = h['completedAt'];
      if (!c) return false;
      const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
      return date >= monthStart;
    });

    const categoryMap = new Map<string, { count: number; xp: number }>();
    for (const r of monthReflections) {
      const cat = (r['category'] as string) || 'Custom';
      const existing = categoryMap.get(cat) ?? { count: 0, xp: 0 };
      existing.count++;
      existing.xp += (r['xpEarned'] as number) ?? 0;
      categoryMap.set(cat, existing);
    }

    let bestCategory = 'Custom';
    let maxXp = 0;
    for (const [cat, data] of categoryMap) {
      if (data.xp > maxXp) { bestCategory = cat; maxXp = data.xp; }
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      xp: data.xp,
    }));

    const xpByWeek: { week: string; xp: number }[] = [];
    for (let w = 0; w < 5; w++) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), w * 7 + 1);
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), (w + 1) * 7 + 1);
      const weekXp = monthReflections.filter((r) => {
        const c = r['createdAt'];
        if (!c) return false;
        const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
        return date >= weekStart && date < weekEnd;
      }).reduce((s, r) => s + ((r['xpEarned'] as number) ?? 0), 0);
      xpByWeek.push({ week: `Week ${w + 1}`, xp: weekXp });
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const uniqueDays = new Set(
      monthHistory.map((h) => {
        const c = h['completedAt'];
        const date = typeof c === 'string' ? new Date(c) : c?.toDate?.() ?? new Date(c);
        return date.toISOString().slice(0, 10);
      }),
    );
    const consistencyScore = Math.round((uniqueDays.size / daysInMonth) * 100);

    const totalXp = monthReflections.reduce((s, r) => s + ((r['xpEarned'] as number) ?? 0), 0);

    return {
      month: now.toLocaleString('en-US', { month: 'long' }),
      year: now.getFullYear(),
      totalHabitsCompleted: monthHistory.length,
      totalXpEarned: totalXp,
      totalReflections: monthReflections.length,
      bestCategory,
      longestStreak: Math.max(uniqueDays.size, 0),
      categoryBreakdown,
      xpByWeek,
      consistencyScore,
      growthSummary: `You completed ${monthHistory.length} habits this month, earning ${totalXp} XP across ${monthReflections.length} reflections. Your best category was ${bestCategory}.`,
    };
  }
}
