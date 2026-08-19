import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { Habit, SessionGoal } from './habits.interface';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { XpService } from '../gamification/services/xp.service';
import { StreakService } from '../gamification/services/streak.service';
import {
  isCompletedToday,
  startOfToday,
} from '../gamification/utils/date.util';

@Injectable()
export class HabitsService {
  constructor(
    @Inject(FIRESTORE_DB) private readonly firestore: Firestore,
    private readonly xpService: XpService,
    private readonly streakService: StreakService,
  ) {}

  // ─── Collection Reference Helpers ───────────────────────────────────────────

  private habitsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/habits`);
  }

  private userDoc(uid: string) {
    return this.firestore.collection('users').doc(uid);
  }

  // ─── Legacy goal fallback: old habits never stored a session goal ─────────────
  // Old clients derived "Estimated Duration" from difficulty (Easy 15, Medium 30,
  // Hard 45). If a legacy doc carries an `estimatedDuration` field, that value wins.
  // ───────────────────────────────────────────────────────────────────────────────

  private readonly LEGACY_FALLBACK_MINUTES: Record<string, number> = {
    Easy: 15,
    Medium: 30,
    Hard: 45,
  };

  private normalizeGoalFields(data: Record<string, unknown>): SessionGoal {
    const activity = (data['activity'] as string | null | undefined) ?? null;
    const goalLabel = (data['goalLabel'] as string | null | undefined) ?? null;
    const goalUnit = (data['goalUnit'] as string | null | undefined) ?? null;
    const goalValue: unknown = data['goalValue'];
    const estimatedDuration: unknown = data['estimatedDuration'];
    const difficulty =
      (data['difficulty'] as string | null | undefined) ?? 'Medium';

    // New-style habit — use the user's own session goal as-is.
    if (
      goalLabel != null &&
      typeof goalValue === 'number' &&
      !Number.isNaN(goalValue)
    ) {
      return { activity, goalLabel, goalValue, goalUnit };
    }

    // Migration path: legacy `estimatedDuration` field (if present).
    if (
      typeof estimatedDuration === 'number' ||
      (typeof estimatedDuration === 'string' && estimatedDuration.trim() !== '')
    ) {
      const minutes = Number(estimatedDuration);
      if (minutes > 0) {
        return {
          activity,
          goalLabel: 'Session Duration',
          goalValue: minutes,
          goalUnit: 'Minutes',
        };
      }
    }

    // Fully legacy habit — derive a sensible default from difficulty.
    const fallback = this.LEGACY_FALLBACK_MINUTES[difficulty] ?? 30;
    return {
      activity: null,
      goalLabel: 'Session Duration',
      goalValue: fallback,
      goalUnit: 'Minutes',
    };
  }

  private needsGoalMigration(data: Record<string, unknown>): boolean {
    return data['goalLabel'] == null && data['goalValue'] == null;
  }

  private async migrateGoalFields(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): Promise<void> {
    const data = doc.data() ?? {};
    if (!this.needsGoalMigration(data)) return;
    const goal = this.normalizeGoalFields(data);
    await doc.ref.update({
      activity: goal.activity,
      goalLabel: goal.goalLabel,
      goalValue: goal.goalValue,
      goalUnit: goal.goalUnit,
      updatedAt: new Date(),
    });
  }

  // ─── Helper: Map Firestore Document to Habit ─────────────────────────────────

  private mapDocToHabit(doc: FirebaseFirestore.DocumentSnapshot): Habit {
    const data = doc.data() ?? {};
    const goal = this.normalizeGoalFields(data);
    return {
      ...data,
      id: doc.id,
      activity: goal.activity,
      goalLabel: goal.goalLabel,
      goalValue: goal.goalValue,
      goalUnit: goal.goalUnit,
      isCompleted: isCompletedToday(data['completedAt']),
    } as Habit;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE — POST /habits
  // ─────────────────────────────────────────────────────────────────────────────

  async create(uid: string, dto: CreateHabitDto): Promise<Habit> {
    const docRef = this.habitsCollection(uid).doc();
    const xpReward = this.xpService.calculateReward(dto.difficulty);

    const habit: Omit<Habit, 'id'> = {
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category,
      activity: dto.activity ?? null,
      goalLabel: dto.goalLabel ?? null,
      goalValue: dto.goalValue ?? null,
      goalUnit: dto.goalUnit ?? null,
      difficulty: dto.difficulty,
      xpReward,
      reminderTime: dto.reminderTime ?? null,
      isCompleted: false,
      streak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    await docRef.set(habit);

    const goal = this.normalizeGoalFields({
      activity: habit.activity,
      goalLabel: habit.goalLabel,
      goalValue: habit.goalValue,
      goalUnit: habit.goalUnit,
      difficulty: habit.difficulty,
    });
    return { id: docRef.id, ...habit, ...goal };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FIND ALL — GET /habits
  // ─────────────────────────────────────────────────────────────────────────────

  async findAll(uid: string): Promise<Habit[]> {
    const snapshot = await this.habitsCollection(uid)
      .orderBy('createdAt', 'desc')
      .get();

    const habits = snapshot.docs.map((doc) => this.mapDocToHabit(doc));

    // Lazy migration: materialize the resolved session goal on legacy docs so
    // old data keeps working and eventually becomes fully new-style.
    const migrations = snapshot.docs
      .filter((doc) => this.needsGoalMigration(doc.data() ?? {}))
      .map((doc) => this.migrateGoalFields(doc));
    if (migrations.length > 0) {
      void Promise.all(migrations).catch(() => {
        // Best-effort migration — reads are always normalized regardless.
      });
    }

    return habits;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FIND TODAY — GET /habits/today
  // ─────────────────────────────────────────────────────────────────────────────

  async findToday(uid: string): Promise<Habit[]> {
    // Returns all habits with isCompleted resolved dynamically to today's date.
    // Frontend can filter by isCompleted as needed.
    return this.findAll(uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FIND ONE — GET /habits/:id
  // ─────────────────────────────────────────────────────────────────────────────

  async findOne(uid: string, id: string): Promise<Habit> {
    const docRef = this.habitsCollection(uid).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Habit with ID "${id}" not found`);
    }

    const data = docSnap.data() ?? {};
    if (data['uid'] && data['uid'] !== uid) {
      throw new ForbiddenException('You do not have access to this habit');
    }

    void this.migrateGoalFields(docSnap).catch(() => {});

    return this.mapDocToHabit(docSnap);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE — PATCH /habits/:id
  // ─────────────────────────────────────────────────────────────────────────────

  async update(uid: string, id: string, dto: UpdateHabitDto): Promise<Habit> {
    const docRef = this.habitsCollection(uid).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Habit with ID "${id}" not found`);
    }

    const updates: Partial<Habit> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.category !== undefined) updates.category = dto.category;
    if (dto.activity !== undefined) updates.activity = dto.activity;
    if (dto.goalLabel !== undefined) updates.goalLabel = dto.goalLabel;
    if (dto.goalValue !== undefined) updates.goalValue = dto.goalValue;
    if (dto.goalUnit !== undefined) updates.goalUnit = dto.goalUnit;
    if (dto.reminderTime !== undefined) updates.reminderTime = dto.reminderTime;

    // When difficulty changes, recalculate the XP reward via XpService
    if (dto.difficulty !== undefined) {
      updates.difficulty = dto.difficulty;
      updates.xpReward = this.xpService.calculateReward(dto.difficulty);
    }

    await docRef.update(updates);

    const updated = await docRef.get();
    return this.mapDocToHabit(updated);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE — DELETE /habits/:id
  // ─────────────────────────────────────────────────────────────────────────────

  async delete(uid: string, id: string): Promise<{ message: string }> {
    const docRef = this.habitsCollection(uid).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Habit with ID "${id}" not found`);
    }

    await docRef.delete();
    return { message: `Habit "${id}" successfully deleted` };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLETE — PATCH /habits/:id/complete
  //
  // Marks the habit as completed for today. Gamification (XP, achievements,
  // notifications, history) is handled by ReflectionsService after the user
  // submits a reflection via POST /progress/reflections.
  // ─────────────────────────────────────────────────────────────────────────────

  async complete(uid: string, id: string): Promise<Habit> {
    const habitDocRef = this.habitsCollection(uid).doc(id);

    const completedHabit = await this.firestore.runTransaction(
      async (transaction) => {
        const habitSnap = await transaction.get(habitDocRef);

        if (!habitSnap.exists) {
          throw new NotFoundException(`Habit with ID "${id}" not found`);
        }

        const habit = (habitSnap.data() ?? {}) as Omit<Habit, 'id'>;
        const goal = this.normalizeGoalFields(habit);

        if (isCompletedToday(habit.completedAt)) {
          throw new BadRequestException(
            'This habit has already been completed today',
          );
        }

        const newHabitStreak = this.streakService.calculateHabitStreak({
          currentStreak: habit.streak ?? 0,
          lastCompletedAt: habit.completedAt,
        });

        const today = startOfToday();

        transaction.update(habitDocRef, {
          completedAt: today,
          streak: newHabitStreak,
          updatedAt: new Date(),
        });

        return {
          id: habitSnap.id,
          ...habit,
          ...goal,
          completedAt: today,
          streak: newHabitStreak,
          isCompleted: true,
          updatedAt: new Date(),
        };
      },
    );

    return completedHabit;
  }
}
