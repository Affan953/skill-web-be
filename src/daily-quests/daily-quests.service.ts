import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { UsersService } from '../users/users.service';
import { XpService } from '../gamification/services/xp.service';
import { LevelService } from '../gamification/services/level.service';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DAILY_QUEST_DEFINITIONS } from './daily-quests.constants';
import { DailyQuest } from './daily-quests.interface';
import { DailyQuestResponseDto } from './dto/daily-quest-response.dto';
import { startOfToday, toDate } from '../gamification/utils/date.util';
import {
  startOfTomorrow,
  mapDocToDailyQuest,
  mapToResponseDto,
} from './utils/daily-quests.utils';

@Injectable()
export class DailyQuestsService {
  constructor(
    @Inject(FIRESTORE_DB) private readonly firestore: Firestore,
    private readonly usersService: UsersService,
    private readonly xpService: XpService,
    private readonly levelService: LevelService,
    private readonly achievementsService: AchievementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Collection Reference Helper ─────────────────────────────────────────────

  private dailyQuestsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/dailyQuests`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — generateQuestsForToday
  //
  // Generates 6 default quests for today if none exist.
  // Idempotent and self-healing: clears expired quests.
  // ─────────────────────────────────────────────────────────────────────────────

  async generateQuestsForToday(uid: string): Promise<void> {
    try {
      const user = await this.usersService.findOne(uid);
      if (!user) {
        throw new NotFoundException(`User profile not found for uid: ${uid}`);
      }

      const now = new Date();
      const todayStart = startOfToday();
      const tomorrowStart = startOfTomorrow();

      // 1. Fetch current active quests
      const activeSnapshot = await this.dailyQuestsCollection(uid)
        .where('expiresAt', '>', now)
        .get();

      if (!activeSnapshot.empty) {
        return; // Today's quests are already generated
      }

      // 2. Clear old expired quests
      const expiredSnapshot = await this.dailyQuestsCollection(uid)
        .where('expiresAt', '<=', now)
        .get();

      if (!expiredSnapshot.empty) {
        const deleteBatch = this.firestore.batch();
        expiredSnapshot.docs.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
      }

      // 3. Batch write the 6 fresh daily quests
      const writeBatch = this.firestore.batch();

      DAILY_QUEST_DEFINITIONS.forEach((definition) => {
        const docRef = this.dailyQuestsCollection(uid).doc(definition.id);
        const payload: Omit<DailyQuest, 'id'> = {
          title: definition.title,
          description: definition.description,
          category: definition.category,
          target: definition.target,
          progress: 0,
          rewardXP: definition.rewardXP,
          completed: false,
          completedAt: null,
          createdAt: todayStart,
          expiresAt: tomorrowStart,
        };
        writeBatch.set(docRef, payload);
      });

      await writeBatch.commit();
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error generating daily quests for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to generate daily quests.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — checkQuests
  //
  // Evaluates today's completed habits, calculates progress, and unlocks
  // completed quests. Awards rewards atomically via transactions.
  // ─────────────────────────────────────────────────────────────────────────────

  async checkQuests(uid: string): Promise<void> {
    try {
      // 1. Guarantee quests exist for today
      await this.generateQuestsForToday(uid);

      const now = new Date();
      const todayStart = startOfToday();
      const tomorrowStart = startOfTomorrow();

      // 2. Fetch today's uncompleted quests
      const questsSnapshot = await this.dailyQuestsCollection(uid)
        .where('expiresAt', '>', now)
        .where('completed', '==', false)
        .get();

      if (questsSnapshot.empty) {
        return; // All quests completed or expired
      }

      // 3. Query all habits completed today (range query is robust to
      //    Date/Timestamp precision and timezone edge cases)
      const habitsSnapshot = await this.firestore
        .collection(`users/${uid}/habits`)
        .where('completedAt', '>=', todayStart)
        .where('completedAt', '<', tomorrowStart)
        .get();

      const completedHabits = habitsSnapshot.docs.map((doc) => doc.data());

      // 4. Calculate progress aggregates from today's habits
      const habitsCount = completedHabits.length;
      const learningCount = completedHabits.filter(
        (h) => h.category === 'Learning',
      ).length;
      const healthCount = completedHabits.filter(
        (h) => h.category === 'Health',
      ).length;
      const xpEarnedToday = completedHabits.reduce(
        (sum, h) => sum + (h.xpReward ?? 0),
        0,
      );
      const streakMaintained = habitsCount >= 1 ? 1 : 0;

      // 5. Evaluate progress for each active quest
      for (const doc of questsSnapshot.docs) {
        const quest = mapDocToDailyQuest(doc.id, doc.data());
        const definition = DAILY_QUEST_DEFINITIONS.find(
          (d) => d.id === quest.id,
        );
        if (!definition) continue;

        let liveProgress = 0;

        switch (definition.category) {
          case 'Habit':
            if (definition.subtype === 'Learning') {
              liveProgress = learningCount;
            } else if (definition.subtype === 'Health') {
              liveProgress = healthCount;
            } else {
              liveProgress = habitsCount;
            }
            break;
          case 'XP':
            liveProgress = xpEarnedToday;
            break;
          case 'Streak':
            liveProgress = streakMaintained;
            break;
        }

        const clampedProgress = Math.min(liveProgress, quest.target);

        // If progress changed, update it. If target met, complete it atomically.
        if (clampedProgress >= quest.target) {
          await this.completeQuest(uid, quest.id);
        } else if (clampedProgress !== quest.progress) {
          await doc.ref.update({ progress: clampedProgress });
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(`Error checking daily quests for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to evaluate daily quests.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — completeQuest
  //
  // Transaction: Marks quest completed and awards XP to user profile.
  // ─────────────────────────────────────────────────────────────────────────────

  async completeQuest(uid: string, questId: string): Promise<DailyQuest> {
    const questDocRef = this.dailyQuestsCollection(uid).doc(questId);
    const userDocRef = this.firestore.collection('users').doc(uid);

    try {
      let isNewlyCompleted = false;
      let levelUpNewLevel: number | null = null;

      const completedQuest = await this.firestore.runTransaction(
        async (transaction) => {
          const [questSnap, userSnap] = await Promise.all([
            transaction.get(questDocRef),
            transaction.get(userDocRef),
          ]);

          if (!questSnap.exists) {
            throw new NotFoundException(`Daily Quest ${questId} not found`);
          }
          if (!userSnap.exists) {
            throw new NotFoundException('User profile not found');
          }

          const questData = questSnap.data()!;
          if (questData.completed) {
            return mapDocToDailyQuest(questSnap.id, questData);
          }

          isNewlyCompleted = true;
          const userData = userSnap.data()!;
          const rewardXP = questData.rewardXP ?? 0;

          // 1. Calculate new XP and Level
          const currentLevel = userData.level ?? 1;
          const newXp = this.xpService.addXP(userData.xp ?? 0, rewardXP);
          const newLevel = this.levelService.calculateLevel(newXp);

          if (newLevel > currentLevel) {
            levelUpNewLevel = newLevel;
          }

          const now = new Date();

          // 2. Commit transaction updates
          transaction.update(questDocRef, {
            progress: questData.target,
            completed: true,
            completedAt: now,
          });

          transaction.update(userDocRef, {
            xp: newXp,
            level: newLevel,
            updatedAt: now,
          });

          // 3. Return updated quest state
          const completedQuest: DailyQuest = {
            id: questSnap.id,
            title: questData.title,
            description: questData.description,
            category: questData.category,
            target: questData.target,
            progress: questData.target,
            rewardXP,
            completed: true,
            completedAt: now,
            createdAt: toDate(questData.createdAt) || new Date(),
            expiresAt: toDate(questData.expiresAt) || startOfTomorrow(),
          };

          // Asynchronously check achievements now that stats updated
          this.achievementsService.checkAchievements(uid).catch((err) => {
            console.error(
              `Error checking achievements after daily quest completion:`,
              err,
            );
          });

          return completedQuest;
        },
      );

      if (isNewlyCompleted) {
        try {
          await this.notificationsService.createDailyQuestNotification(
            uid,
            completedQuest.title,
            completedQuest.rewardXP,
          );
        } catch (notifError) {
          console.error(
            `Failed to create daily quest notification for user ${uid}:`,
            notifError,
          );
        }

        if (levelUpNewLevel !== null) {
          try {
            await this.notificationsService.createLevelUpNotification(
              uid,
              levelUpNewLevel,
            );
          } catch (notifError) {
            console.error(
              `Failed to create level up notification for user ${uid}:`,
              notifError,
            );
          }
        }
      }

      return completedQuest;
    } catch (error) {
      console.error(
        `Error completing quest ${questId} for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to process daily quest completion.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getTodayQuests
  // ─────────────────────────────────────────────────────────────────────────────

  async getTodayQuests(uid: string): Promise<DailyQuestResponseDto[]> {
    // 1. Enforce checks first
    await this.checkQuests(uid);

    try {
      const now = new Date();
      const snapshot = await this.dailyQuestsCollection(uid)
        .where('expiresAt', '>', now)
        .get();

      return snapshot.docs.map((doc) =>
        mapToResponseDto(mapDocToDailyQuest(doc.id, doc.data())),
      );
    } catch (error) {
      console.error(
        `Error loading active daily quests for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch daily quests.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getCompletedQuests
  // ─────────────────────────────────────────────────────────────────────────────

  async getCompletedQuests(uid: string): Promise<DailyQuestResponseDto[]> {
    try {
      const snapshot = await this.dailyQuestsCollection(uid)
        .where('completed', '==', true)
        .get();

      return snapshot.docs.map((doc) =>
        mapToResponseDto(mapDocToDailyQuest(doc.id, doc.data())),
      );
    } catch (error) {
      console.error(
        `Error loading completed daily quests for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to fetch completed daily quests.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getQuestsProgress
  // ─────────────────────────────────────────────────────────────────────────────

  async getQuestsProgress(uid: string): Promise<DailyQuestResponseDto[]> {
    // progress and list are equal in this design since all active quests maintain live progress
    return this.getTodayQuests(uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — regenerateQuests (Development/Manual override)
  // ─────────────────────────────────────────────────────────────────────────────

  async regenerateQuests(uid: string): Promise<DailyQuestResponseDto[]> {
    try {
      const now = new Date();
      const activeSnapshot = await this.dailyQuestsCollection(uid)
        .where('expiresAt', '>', now)
        .get();

      if (!activeSnapshot.empty) {
        throw new BadRequestException(
          'Quests for today have already been generated.',
        );
      }

      await this.generateQuestsForToday(uid);
      return this.getTodayQuests(uid);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error(`Error regenerating daily quests for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to regenerate daily quests.',
      );
    }
  }
}
