import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ACHIEVEMENT_LIST,
  AchievementDefinition,
} from './achievements.constants';
import { Achievement, UserStats } from './achievements.interface';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import {
  toDate,
  isMet,
  resolveProgress,
  mapToResponseDto,
  buildDefaultAchievement,
} from './utils/achievements.utils';

// ─────────────────────────────────────────────────────────────────────────────
// AchievementsService
//
// Responsibilities:
//   1. Initialize default achievement documents for every new user
//   2. Evaluate unlock conditions against live user stats
//   3. Atomically unlock newly earned achievements (Firestore transaction)
//   4. Provide getAll / getUnlocked / getProgress / getOne read methods
//
// NEVER recalculates XP, Level, or Streak — delegates to UsersService
// which already stores the pre-computed values updated by GamificationModule.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AchievementsService {
  constructor(
    @Inject(FIRESTORE_DB) private readonly firestore: Firestore,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Collection Reference Helper ─────────────────────────────────────────────

  private achievementsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/achievements`);
  }

  // ─── Internal: Load User Stats ───────────────────────────────────────────────

  /**
   * Loads the user document via UsersService and extracts only the stats
   * needed for achievement evaluation.
   *
   * @throws NotFoundException when the user profile does not exist
   */
  private async loadUserStats(uid: string): Promise<UserStats> {
    const user = await this.usersService.findOne(uid);
    if (!user) {
      throw new NotFoundException(`User profile not found for uid: ${uid}`);
    }
    return {
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      totalHabits: user.totalHabits ?? 0,
      currentStreak: user.currentStreak ?? 0,
    };
  }

  // ─── Internal: Map Firestore Doc → Achievement ───────────────────────────────

  private mapDocToAchievement(
    docId: string,
    data: FirebaseFirestore.DocumentData,
  ): Achievement {
    return {
      id: docId,
      title: data['title'] as string,
      description: data['description'] as string,
      icon: data['icon'] as string,
      category: data['category'],
      unlocked: data['unlocked'] as boolean,
      unlockedAt: toDate(
        data['unlockedAt'] as Timestamp | Date | null | undefined,
      ),
      progress: data['progress'] as number,
      target: data['target'] as number,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — initializeDefaults
  //
  // Writes a locked achievement document for every definition that does not yet
  // exist in Firestore. Idempotent — safe to call on every login or request.
  // ─────────────────────────────────────────────────────────────────────────────

  async initializeDefaults(uid: string): Promise<void> {
    try {
      const stats = await this.loadUserStats(uid);
      const snapshot = await this.achievementsCollection(uid).get();
      const existing = new Set(snapshot.docs.map((d) => d.id));

      const batch = this.firestore.batch();
      let hasPendingWrites = false;

      for (const definition of ACHIEVEMENT_LIST) {
        if (existing.has(definition.id)) continue;

        const docRef = this.achievementsCollection(uid).doc(definition.id);
        const defaultDoc = buildDefaultAchievement(definition, stats);
        // Remove `id` from the Firestore payload — it is stored as the document key
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _achievementDocId, ...payload } = defaultDoc;
        batch.set(docRef, payload);
        hasPendingWrites = true;
      }

      if (hasPendingWrites) {
        await batch.commit();
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error initializing achievements for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to initialize default achievements.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — checkAchievements
  //
  // Evaluates all unlock conditions and atomically unlocks each newly
  // satisfied achievement. Designed to be called after any stat change
  // (habit completion, XP award, level-up).
  // ─────────────────────────────────────────────────────────────────────────────

  async checkAchievements(uid: string): Promise<void> {
    try {
      await this.initializeDefaults(uid);
      const stats = await this.loadUserStats(uid);

      // Read current state in one round-trip
      const snapshot = await this.achievementsCollection(uid).get();
      const docMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      snapshot.docs.forEach((d) => docMap.set(d.id, d));

      // Evaluate every definition sequentially to keep transactions simple
      for (const definition of ACHIEVEMENT_LIST) {
        if (!isMet(definition, stats)) {
          // Update progress even when not yet unlocked
          const doc = docMap.get(definition.id);
          if (doc?.exists) {
            const currentProgress = (doc.data()?.['progress'] as number) ?? 0;
            const newProgress = resolveProgress(definition, stats);
            if (
              newProgress !== currentProgress &&
              !(doc.data()?.['unlocked'] as boolean)
            ) {
              await this.achievementsCollection(uid)
                .doc(definition.id)
                .update({ progress: newProgress });
            }
          }
          continue;
        }

        const doc = docMap.get(definition.id);
        if (doc?.exists && (doc.data()?.['unlocked'] as boolean)) {
          continue; // Already unlocked — skip
        }

        await this.unlock(uid, definition, stats);
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error checking achievements for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to evaluate achievement conditions.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — unlock
  //
  // Atomically marks an achievement as unlocked for the user.
  // Idempotent — duplicate calls are ignored inside the transaction.
  // ─────────────────────────────────────────────────────────────────────────────

  async unlock(
    uid: string,
    definition: AchievementDefinition,
    stats: UserStats,
  ): Promise<Achievement> {
    const docRef = this.achievementsCollection(uid).doc(definition.id);

    try {
      let isNewlyUnlocked = false;
      const unlockedAchievement = await this.firestore.runTransaction(
        async (tx) => {
          const snap = await tx.get(docRef);

          // Idempotency guard
          if (snap.exists && (snap.data()?.['unlocked'] as boolean)) {
            return this.mapDocToAchievement(snap.id, snap.data()!);
          }

          isNewlyUnlocked = true;
          const now = new Date();
          const progress = resolveProgress(definition, stats);

          const payload: Omit<Achievement, 'id'> = {
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            category: definition.category,
            unlocked: true,
            unlockedAt: now,
            progress,
            target: definition.target,
          };

          // set() covers both first-write and update scenarios
          tx.set(docRef, payload);

          return { id: definition.id, ...payload };
        },
      );

      if (isNewlyUnlocked) {
        try {
          await this.notificationsService.createAchievementUnlockedNotification(
            uid,
            definition.title,
            definition.description,
          );
        } catch (notifError) {
          console.error(
            `Failed to create achievement notification for user ${uid}:`,
            notifError,
          );
        }
      }

      return unlockedAchievement;
    } catch (error) {
      console.error(
        `Error unlocking achievement "${definition.id}" for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to unlock achievement "${definition.title}".`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getAll
  //
  // Returns all achievements (locked and unlocked) with live progress values.
  // ─────────────────────────────────────────────────────────────────────────────

  async getAll(uid: string): Promise<AchievementResponseDto[]> {
    await this.checkAchievements(uid);

    try {
      const stats = await this.loadUserStats(uid);
      const snapshot = await this.achievementsCollection(uid).get();
      const docMap = new Map<string, Achievement>();

      snapshot.docs.forEach((doc) => {
        docMap.set(doc.id, this.mapDocToAchievement(doc.id, doc.data()));
      });

      return ACHIEVEMENT_LIST.map((definition) => {
        const stored = docMap.get(definition.id);
        if (stored) {
          // Refresh progress from live stats when not yet unlocked
          if (!stored.unlocked) {
            stored.progress = resolveProgress(definition, stats);
          }
          return mapToResponseDto(stored);
        }
        // Fallback: definition exists but doc somehow missing
        return mapToResponseDto(buildDefaultAchievement(definition, stats));
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error fetching all achievements for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve achievements.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getUnlocked
  //
  // Returns only unlocked achievements for the user.
  // ─────────────────────────────────────────────────────────────────────────────

  async getUnlocked(uid: string): Promise<AchievementResponseDto[]> {
    await this.checkAchievements(uid);

    try {
      const snapshot = await this.achievementsCollection(uid)
        .where('unlocked', '==', true)
        .get();

      return snapshot.docs.map((doc) =>
        mapToResponseDto(this.mapDocToAchievement(doc.id, doc.data())),
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(
        `Error fetching unlocked achievements for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve unlocked achievements.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getProgress
  //
  // Returns all achievements with live progress and target — ideal for
  // progress-bar rendering on the frontend.
  // ─────────────────────────────────────────────────────────────────────────────

  async getProgress(uid: string): Promise<AchievementResponseDto[]> {
    await this.checkAchievements(uid);

    try {
      const stats = await this.loadUserStats(uid);
      const snapshot = await this.achievementsCollection(uid).get();
      const docMap = new Map<string, Achievement>();

      snapshot.docs.forEach((doc) => {
        docMap.set(doc.id, this.mapDocToAchievement(doc.id, doc.data()));
      });

      return ACHIEVEMENT_LIST.map((definition) => {
        const stored = docMap.get(definition.id);
        const achievement: Achievement = stored
          ? {
              ...stored,
              progress: stored.unlocked
                ? stored.target
                : resolveProgress(definition, stats),
            }
          : buildDefaultAchievement(definition, stats);
        return mapToResponseDto(achievement);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(
        `Error fetching achievement progress for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve achievement progress.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getOne
  //
  // Returns the full detail of a single achievement by its ID.
  // ─────────────────────────────────────────────────────────────────────────────

  async getOne(
    uid: string,
    achievementId: string,
  ): Promise<AchievementResponseDto> {
    // Validate the ID exists in the static registry
    const definition = ACHIEVEMENT_LIST.find((d) => d.id === achievementId);
    if (!definition) {
      throw new NotFoundException(
        `Achievement with id "${achievementId}" does not exist.`,
      );
    }

    await this.checkAchievements(uid);

    try {
      const stats = await this.loadUserStats(uid);
      const docRef = this.achievementsCollection(uid).doc(achievementId);
      const snap = await docRef.get();

      if (!snap.exists) {
        // Docs are initialized by checkAchievements above — this is a safety fallback
        return mapToResponseDto(buildDefaultAchievement(definition, stats));
      }

      const achievement = this.mapDocToAchievement(snap.id, snap.data()!);
      if (!achievement.unlocked) {
        achievement.progress = resolveProgress(definition, stats);
      }

      return mapToResponseDto(achievement);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(
        `Error fetching achievement "${achievementId}" for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve achievement "${achievementId}".`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — isUnlocked (utility — consumed by other modules)
  // ─────────────────────────────────────────────────────────────────────────────

  async isUnlocked(uid: string, achievementId: string): Promise<boolean> {
    try {
      const snap = await this.achievementsCollection(uid)
        .doc(achievementId)
        .get();
      if (!snap.exists) return false;
      return (snap.data()?.['unlocked'] as boolean) === true;
    } catch (error) {
      console.error(
        `Error checking isUnlocked for "${achievementId}" / user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to check achievement unlock status.',
      );
    }
  }
}
