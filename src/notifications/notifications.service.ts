import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { Notification, NotificationType } from './notifications.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsService
//
// Responsibilities:
//   1. CRUD operations for notification documents in Firestore
//   2. Mark single / all notifications as read
//   3. Unread count query for badge display
//   4. Reusable helper methods for other modules to create notifications
//
// Firestore path: users/{uid}/notifications/{notificationId}
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  constructor(@Inject(FIRESTORE_DB) private readonly firestore: Firestore) {}

  // ─── Collection Reference Helper ─────────────────────────────────────────────

  private notificationsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/notifications`);
  }

  // ─── Internal: Map Firestore Doc → Notification ─────────────────────────────

  private mapDocToNotification(
    docId: string,
    data: FirebaseFirestore.DocumentData,
  ): Notification {
    const metadata = data['metadata'];
    return {
      id: docId,
      type: data['type'] as NotificationType,
      title: data['title'] as string,
      description: data['description'] as string,
      isRead: data['isRead'] as boolean,
      metadata:
        metadata != null ? (metadata as Record<string, any>) : undefined,
      createdAt: toDate(data['createdAt']),
    };
  }

  // ─── Internal: Map to Response DTO ──────────────────────────────────────────

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      description: notification.description,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getNotifications
  //
  // Returns all notifications for the user, sorted by newest first.
  // ─────────────────────────────────────────────────────────────────────────────

  async getNotifications(uid: string): Promise<NotificationResponseDto[]> {
    try {
      const snapshot = await this.notificationsCollection(uid)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.toResponseDto(this.mapDocToNotification(doc.id, doc.data())),
      );
    } catch (error) {
      console.error(`Error fetching notifications for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve notifications.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — getUnreadCount
  //
  // Returns the count of unread notifications for badge display.
  // ─────────────────────────────────────────────────────────────────────────────

  async getUnreadCount(uid: string): Promise<number> {
    try {
      const snapshot = await this.notificationsCollection(uid)
        .where('isRead', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error(`Error fetching unread count for user ${uid}:`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve unread notification count.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — createNotification
  //
  // Creates a new notification document for the user.
  // Returns the created notification.
  // ─────────────────────────────────────────────────────────────────────────────

  async createNotification(
    uid: string,
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      const docRef = this.notificationsCollection(uid).doc();

      const notification: Omit<Notification, 'id'> = {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        isRead: false,
        metadata: dto.metadata ?? undefined,
        createdAt: new Date(),
      };

      await docRef.set(notification);

      return this.toResponseDto({ id: docRef.id, ...notification });
    } catch (error) {
      console.error(`Error creating notification for user ${uid}:`, error);
      throw new InternalServerErrorException('Failed to create notification.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — markAsRead
  //
  // Marks a single notification as read.
  // ─────────────────────────────────────────────────────────────────────────────

  async markAsRead(
    uid: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const docRef = this.notificationsCollection(uid).doc(notificationId);

    try {
      const snap = await docRef.get();

      if (!snap.exists) {
        throw new NotFoundException(
          `Notification with ID "${notificationId}" not found.`,
        );
      }

      await docRef.update({ isRead: true });

      const updated = await docRef.get();
      return this.toResponseDto(
        this.mapDocToNotification(updated.id, updated.data()!),
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(
        `Error marking notification "${notificationId}" as read for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to mark notification as read.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — markAllAsRead
  //
  // Marks every notification for the user as read using a batch write.
  // ─────────────────────────────────────────────────────────────────────────────

  async markAllAsRead(uid: string): Promise<{ message: string }> {
    try {
      const snapshot = await this.notificationsCollection(uid)
        .where('isRead', '==', false)
        .get();

      if (snapshot.empty) {
        return { message: 'All notifications are already read.' };
      }

      const batch = this.firestore.batch();

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();

      return { message: `Marked ${snapshot.size} notification(s) as read.` };
    } catch (error) {
      console.error(
        `Error marking all notifications as read for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to mark all notifications as read.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC — deleteNotification
  //
  // Deletes a single notification.
  // ─────────────────────────────────────────────────────────────────────────────

  async deleteNotification(
    uid: string,
    notificationId: string,
  ): Promise<{ message: string }> {
    const docRef = this.notificationsCollection(uid).doc(notificationId);

    try {
      const snap = await docRef.get();

      if (!snap.exists) {
        throw new NotFoundException(
          `Notification with ID "${notificationId}" not found.`,
        );
      }

      await docRef.delete();

      return {
        message: `Notification "${notificationId}" successfully deleted.`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error(
        `Error deleting notification "${notificationId}" for user ${uid}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to delete notification.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRATION HELPERS — Reusable methods for other modules
  //
  // These methods internally call createNotification() and are designed
  // to be called from Habits, Achievements, DailyQuests, and Gamification
  // modules in the future.
  // ─────────────────────────────────────────────────────────────────────────────

  async createHabitCompletedNotification(
    uid: string,
    habitTitle: string,
    xpEarned: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.HabitCompleted,
      title: 'Habit Completed!',
      description: `You completed "${habitTitle}" and earned ${xpEarned} XP.`,
      metadata: { habitTitle, xpEarned },
    });
  }

  async createAchievementUnlockedNotification(
    uid: string,
    achievementTitle: string,
    achievementDescription: string,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.AchievementUnlocked,
      title: 'Achievement Unlocked!',
      description: `You unlocked "${achievementTitle}": ${achievementDescription}`,
      metadata: { achievementTitle },
    });
  }

  async createLevelUpNotification(
    uid: string,
    newLevel: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.LevelUp,
      title: 'Level Up!',
      description: `Congratulations! You reached Level ${newLevel}!`,
      metadata: { newLevel },
    });
  }

  async createDailyQuestNotification(
    uid: string,
    questTitle: string,
    rewardXP: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.DailyQuestCompleted,
      title: 'Daily Quest Complete!',
      description: `You completed "${questTitle}" and earned ${rewardXP} XP.`,
      metadata: { questTitle, rewardXP },
    });
  }

  async createStreakNotification(
    uid: string,
    streakCount: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.StreakMilestone,
      title: 'Streak Milestone!',
      description: `Amazing! You've maintained a ${streakCount}-day streak!`,
      metadata: { streakCount },
    });
  }

  async createSystemNotification(
    uid: string,
    title: string,
    description: string,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.System,
      title,
      description,
    });
  }

  async createReflectionSavedNotification(
    uid: string,
    habitTitle: string,
    xpEarned: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.ReflectionSaved,
      title: 'Reflection Saved!',
      description: `You reflected on "${habitTitle}" and earned ${xpEarned} XP.`,
      metadata: { habitTitle, xpEarned },
    });
  }

  async createJourneySavedNotification(
    uid: string,
    habitTitle: string,
    xpEarned: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.JourneySaved,
      title: 'Journey Saved!',
      description: `You completed "${habitTitle}" and earned ${xpEarned} XP. Keep growing!`,
      metadata: { habitTitle, xpEarned },
    });
  }

  async createWeeklyReviewNotification(
    uid: string,
    habitsCompleted: number,
    xpEarned: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.WeeklyReview,
      title: 'Weekly Review Ready!',
      description: `You completed ${habitsCompleted} habits this week and earned ${xpEarned} XP. Check your progress!`,
      metadata: { habitsCompleted, xpEarned },
    });
  }

  async createMonthlyReviewNotification(
    uid: string,
    month: string,
    totalXp: number,
  ): Promise<NotificationResponseDto> {
    return this.createNotification(uid, {
      type: NotificationType.MonthlyReview,
      title: `${month} Growth Report`,
      description: `Your ${month} report is ready! You earned ${totalXp} XP this month.`,
      metadata: { month, totalXp },
    });
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate() as Date;
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000 + (value.nanoseconds ?? 0) / 1e6);
  }
  return new Date(value as string | number);
}
