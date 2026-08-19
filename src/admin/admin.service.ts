import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { UsersService } from '../users/users.service';
import { ACHIEVEMENT_LIST } from '../achievements/achievements.constants';
import { DAILY_QUEST_DEFINITIONS } from '../daily-quests/daily-quests.constants';
import { isCompletedToday } from '../gamification/utils/date.util';

export interface AdminStats {
  totalUsers: number;
  totalHabits: number;
  totalCompletions: number;
  totalXpEarned: number;
  totalAchievementsUnlocked: number;
  totalNotifications: number;
  totalQuestsCompleted: number;
}

export interface AdminUserRow {
  uid: string;
  username: string;
  email: string;
  photoUrl: string | null;
  role: string;
  level: number;
  xp: number;
  currentStreak: number;
  totalHabits: number;
  createdAt: Date | string;
}

export interface AdminHabitRow {
  id: string;
  uid: string;
  ownerName: string;
  title: string;
  category: string;
  difficulty: string;
  xpReward: number;
  streak: number;
  isCompleted: boolean;
  createdAt: Date | string;
}

export interface AdminAchievementRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  unlockedCount: number;
}

export interface AdminQuestRow {
  id: string;
  title: string;
  description: string;
  category: string;
  target: number;
  rewardXP: number;
  totalAssigned: number;
  totalCompleted: number;
}

export interface AdminNotificationRow {
  id: string;
  uid: string;
  ownerName: string;
  type: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: Date | string;
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(FIRESTORE_DB) private readonly firestore: Firestore,
    private readonly usersService: UsersService,
  ) {}

  private get usersCollection() {
    return this.firestore.collection('users');
  }

  // ─── Helper: Paginate through all users ──────────────────────────────────

  private async getAllUsersPaginated(
    pageSize = 100,
  ): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    while (true) {
      let query = this.usersCollection.orderBy('__name__').limit(pageSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      const snapshot = await query.get();
      if (snapshot.empty) break;
      allDocs.push(...snapshot.docs);
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < pageSize) break;
    }

    return allDocs;
  }

  // ─── getStats ────────────────────────────────────────────────────────────

  async getStats(): Promise<AdminStats> {
    const totalUsers = await this.usersService.countAll();

    let totalHabits = 0;
    let totalCompletions = 0;
    let totalXpEarned = 0;
    let totalAchievementsUnlocked = 0;
    let totalNotifications = 0;
    let totalQuestsCompleted = 0;

    const allUsers = await this.getAllUsersPaginated();

    const counts = await Promise.all(
      allUsers.map(async (userDoc) => {
        const uid = userDoc.id;
        const userData = userDoc.data();
        let userHabits = 0;
        let userCompletions = 0;
        let userAchievements = 0;
        let userNotifications = 0;
        let userQuestsCompleted = 0;

        try {
          const habitsSnap = await this.firestore
            .collection(`users/${uid}/habits`)
            .get();
          userHabits = habitsSnap.size;
          // Use completedAt (consistent with HabitsService) instead of raw isCompleted
          userCompletions = habitsSnap.docs.filter(
            (d) => d.data()['completedAt'] != null,
          ).length;
        } catch {
          // skip — user may have no habits subcollection
        }

        try {
          const achSnap = await this.firestore
            .collection(`users/${uid}/achievements`)
            .where('unlocked', '==', true)
            .get();
          userAchievements = achSnap.size;
        } catch {
          // skip — user may have no achievements subcollection
        }

        try {
          const notifSnap = await this.firestore
            .collection(`users/${uid}/notifications`)
            .get();
          userNotifications = notifSnap.size;
        } catch {
          // skip — user may have no notifications subcollection
        }

        try {
          const questSnap = await this.firestore
            .collection(`users/${uid}/dailyQuests`)
            .where('completed', '==', true)
            .get();
          userQuestsCompleted = questSnap.size;
        } catch {
          // skip — user may have no quests subcollection
        }

        return {
          habits: userHabits,
          completions: userCompletions,
          xp: (userData['xp'] as number) ?? 0,
          achievements: userAchievements,
          notifications: userNotifications,
          questsCompleted: userQuestsCompleted,
        };
      }),
    );

    for (const c of counts) {
      totalHabits += c.habits;
      totalCompletions += c.completions;
      totalXpEarned += c.xp;
      totalAchievementsUnlocked += c.achievements;
      totalNotifications += c.notifications;
      totalQuestsCompleted += c.questsCompleted;
    }

    return {
      totalUsers,
      totalHabits,
      totalCompletions,
      totalXpEarned,
      totalAchievementsUnlocked,
      totalNotifications,
      totalQuestsCompleted,
    };
  }

  // ─── getUsers ────────────────────────────────────────────────────────────

  async getUsers(search?: string, limit = 100): Promise<AdminUserRow[]> {
    let users = await this.usersService.findAll(limit);

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    return users.map((u) => ({
      uid: u.uid,
      username: u.username,
      email: u.email,
      photoUrl: u.photoUrl,
      role: u.role ?? 'user',
      level: u.level,
      xp: u.xp,
      currentStreak: u.currentStreak,
      totalHabits: u.totalHabits,
      createdAt: u.createdAt,
    }));
  }

  // ─── getAllHabits ────────────────────────────────────────────────────────

  async getAllHabits(search?: string, limit = 100): Promise<AdminHabitRow[]> {
    const allUsers = await this.getAllUsersPaginated();
    const allHabits: AdminHabitRow[] = [];

    const results = await Promise.all(
      allUsers.map(async (userDoc) => {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const ownerName = userData['username'] as string;

        try {
          const habitsSnap = await this.firestore
            .collection(`users/${uid}/habits`)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

          return habitsSnap.docs.map((doc) => {
            const d = doc.data();
            // Use isCompletedToday(completedAt) for consistency with HabitsService
            return {
              id: doc.id,
              uid,
              ownerName,
              title: d['title'] as string,
              category: d['category'] as string,
              difficulty: d['difficulty'] as string,
              xpReward: (d['xpReward'] as number) ?? 0,
              streak: (d['streak'] as number) ?? 0,
              isCompleted: isCompletedToday(d['completedAt']),
              createdAt: d['createdAt'],
            };
          });
        } catch {
          return [];
        }
      }),
    );

    for (const r of results) {
      allHabits.push(...r);
    }

    if (search) {
      const q = search.toLowerCase();
      return allHabits.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q) ||
          h.ownerName.toLowerCase().includes(q),
      );
    }

    return allHabits;
  }

  // ─── getAchievements ─────────────────────────────────────────────────────

  async getAchievements(): Promise<AdminAchievementRow[]> {
    const allUsers = await this.getAllUsersPaginated();

    const unlockCounts = new Map<string, number>();

    await Promise.all(
      allUsers.map(async (userDoc) => {
        const uid = userDoc.id;
        try {
          const achSnap = await this.firestore
            .collection(`users/${uid}/achievements`)
            .where('unlocked', '==', true)
            .get();
          achSnap.docs.forEach((doc) => {
            unlockCounts.set(doc.id, (unlockCounts.get(doc.id) ?? 0) + 1);
          });
        } catch {
          // skip — user may have no achievements
        }
      }),
    );

    return ACHIEVEMENT_LIST.map((def) => ({
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      target: def.target,
      unlockedCount: unlockCounts.get(def.id) ?? 0,
    }));
  }

  // ─── getDailyQuests ──────────────────────────────────────────────────────

  async getDailyQuests(): Promise<AdminQuestRow[]> {
    const allUsers = await this.getAllUsersPaginated();

    const questStats = new Map<
      string,
      { assigned: number; completed: number }
    >();

    for (const def of DAILY_QUEST_DEFINITIONS) {
      questStats.set(def.id, { assigned: 0, completed: 0 });
    }

    await Promise.all(
      allUsers.map(async (userDoc) => {
        const uid = userDoc.id;
        try {
          const questSnap = await this.firestore
            .collection(`users/${uid}/dailyQuests`)
            .get();
          questSnap.docs.forEach((doc) => {
            const d = doc.data();
            const templateId = d['id'] as string;
            const existing = questStats.get(templateId) ?? {
              assigned: 0,
              completed: 0,
            };
            existing.assigned += 1;
            if (d['completed'] === true) {
              existing.completed += 1;
            }
            questStats.set(templateId, existing);
          });
        } catch {
          // skip — user may have no quests
        }
      }),
    );

    return DAILY_QUEST_DEFINITIONS.map((def) => {
      const stats = questStats.get(def.id) ?? { assigned: 0, completed: 0 };
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        category: def.category,
        target: def.target,
        rewardXP: def.rewardXP,
        totalAssigned: stats.assigned,
        totalCompleted: stats.completed,
      };
    });
  }

  // ─── getNotifications ────────────────────────────────────────────────────

  async getNotifications(
    search?: string,
    limit = 100,
  ): Promise<AdminNotificationRow[]> {
    const allUsers = await this.getAllUsersPaginated();
    const allNotifications: AdminNotificationRow[] = [];

    const results = await Promise.all(
      allUsers.map(async (userDoc) => {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const ownerName = userData['username'] as string;

        try {
          const notifSnap = await this.firestore
            .collection(`users/${uid}/notifications`)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

          return notifSnap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              uid,
              ownerName,
              type: d['type'] as string,
              title: d['title'] as string,
              description: d['description'] as string,
              isRead: (d['isRead'] as boolean) ?? false,
              createdAt: d['createdAt'],
            };
          });
        } catch {
          return [];
        }
      }),
    );

    for (const r of results) {
      allNotifications.push(...r);
    }

    allNotifications.sort((a, b) => {
      const dateA =
        a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB =
        b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    if (search) {
      const q = search.toLowerCase();
      return allNotifications.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.ownerName.toLowerCase().includes(q),
      );
    }

    return allNotifications.slice(0, limit);
  }

  async getReflections(search?: string, limit = 100) {
    const usersSnap = await this.firestore.collection('users').get();
    const allReflections: any[] = [];

    const results = await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        try {
          const snap = await this.firestore
            .collection(`users/${userDoc.id}/reflections`)
            .orderBy('createdAt', 'desc')
            .get();

          return snap.docs.map((doc) => ({
            id: doc.id,
            uid: userDoc.id,
            ownerName:
              (userDoc.data()['username'] as string) ??
              (userDoc.data()['email'] as string) ??
              'Unknown',
            ...doc.data(),
          }));
        } catch {
          return [];
        }
      }),
    );

    for (const r of results) {
      allReflections.push(...r);
    }

    allReflections.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    if (search) {
      const q = search.toLowerCase();
      return allReflections.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.reflection?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.ownerName?.toLowerCase().includes(q),
      );
    }

    return allReflections.slice(0, limit);
  }

  async getReflectionAnalytics() {
    const usersSnap = await this.firestore.collection('users').get();
    let totalReflections = 0;
    let totalProofOfProgress = 0;
    let totalSessionDuration = 0;
    let sessionsWithDuration = 0;
    const categoryCounts = new Map<string, number>();
    const reflectionLengths: number[] = [];

    for (const userDoc of usersSnap.docs) {
      try {
        const snap = await this.firestore
          .collection(`users/${userDoc.id}/reflections`)
          .get();
        for (const doc of snap.docs) {
          const data = doc.data();
          totalReflections++;
          if (data['proofOfProgress'] && Object.keys(data['proofOfProgress']).length > 0) {
            totalProofOfProgress++;
          }
          if (data['sessionMetadata']?.durationMinutes) {
            totalSessionDuration += data['sessionMetadata'].durationMinutes;
            sessionsWithDuration++;
          }
          const cat = (data['category'] as string) || 'Custom';
          categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
          if (data['reflection']) {
            reflectionLengths.push((data['reflection'] as string).length);
          }
        }
      } catch {}
    }

    const mostActiveCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const avgReflectionLength = reflectionLengths.length > 0
      ? Math.round(reflectionLengths.reduce((a, b) => a + b, 0) / reflectionLengths.length)
      : 0;

    const avgSessionDuration = sessionsWithDuration > 0
      ? Math.round(totalSessionDuration / sessionsWithDuration)
      : 0;

    return {
      totalReflections,
      totalProofOfProgress,
      mostActiveCategories,
      averageReflectionLength: avgReflectionLength,
      averageSessionDuration: avgSessionDuration,
      completionRate: totalReflections > 0
        ? Math.round((totalProofOfProgress / totalReflections) * 100)
        : 0,
    };
  }
}
