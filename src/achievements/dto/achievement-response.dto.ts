import { ApiProperty } from '@nestjs/swagger';
import { AchievementCategory } from '../achievements.constants';

// ─────────────────────────────────────────────────────────────────────────────
// AchievementResponseDto
//
// Returned by all achievement endpoints.
// Never exposes raw Firestore document objects.
// ─────────────────────────────────────────────────────────────────────────────

export class AchievementResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the achievement',
    example: 'first_step',
  })
  id: string;

  @ApiProperty({
    description: 'Display title of the achievement',
    example: 'First Step',
  })
  title: string;

  @ApiProperty({
    description: 'Description explaining how to unlock the achievement',
    example: 'Complete your first habit.',
  })
  description: string;

  @ApiProperty({
    description: 'Emoji icon representing the achievement',
    example: '👣',
  })
  icon: string;

  @ApiProperty({
    description: 'Category that groups this achievement',
    enum: AchievementCategory,
    example: AchievementCategory.Habit,
  })
  category: AchievementCategory;

  @ApiProperty({
    description: 'Whether the user has unlocked this achievement',
    example: false,
  })
  unlocked: boolean;

  @ApiProperty({
    description:
      'ISO timestamp of when the achievement was unlocked, or null if still locked',
    example: '2026-07-16T03:00:00.000Z',
    nullable: true,
    type: String,
  })
  unlockedAt: Date | null;

  @ApiProperty({
    description: 'Current progress value toward the target',
    example: 7,
  })
  progress: number;

  @ApiProperty({
    description: 'The target value required to unlock this achievement',
    example: 10,
  })
  target: number;
}
