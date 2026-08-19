import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../notifications.interface';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationResponseDto
//
// Returned by all notification endpoints.
// Never exposes raw Firestore document objects.
// ─────────────────────────────────────────────────────────────────────────────

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the notification',
    example: 'notif_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'The type of notification',
    enum: NotificationType,
    example: NotificationType.HabitCompleted,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'The display title of the notification',
    example: 'Habit Completed!',
  })
  title: string;

  @ApiProperty({
    description: 'A detailed description of the notification',
    example: 'You completed "Read 20 pages" and earned 25 XP.',
  })
  description: string;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Optional metadata (e.g. habitId, xpEarned)',
    example: { habitId: 'abc123', xpEarned: 25 },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ISO timestamp of when the notification was created',
    example: '2026-07-22T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;
}
