import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object representing a Daily Quest in API responses.
 */
export class DailyQuestResponseDto {
  @ApiProperty({
    description: 'The unique ID of the quest',
    example: 'complete_1_habit',
  })
  id: string;

  @ApiProperty({
    description: 'The display title of the daily quest',
    example: 'Complete 1 Habit',
  })
  title: string;

  @ApiProperty({
    description: 'A detailed description of the daily quest task',
    example: 'Complete at least one habit today.',
  })
  description: string;

  @ApiProperty({
    description: 'The category of the quest',
    example: 'Habit',
  })
  category: 'Habit' | 'XP' | 'Streak';

  @ApiProperty({
    description: 'The target value to complete the quest',
    example: 1,
  })
  target: number;

  @ApiProperty({
    description: "The user's current progress value toward the target",
    example: 0,
  })
  progress: number;

  @ApiProperty({
    description: 'The amount of XP rewarded upon quest completion',
    example: 20,
  })
  rewardXP: number;

  @ApiProperty({
    description: 'Whether the quest has been completed by the user',
    example: false,
  })
  completed: boolean;

  @ApiProperty({
    description: 'The ISO timestamp of completion, or null if uncompleted',
    example: '2026-07-16T10:00:00.000Z',
    nullable: true,
    type: String,
  })
  completedAt: Date | null;

  @ApiProperty({
    description:
      'The ISO timestamp when the quest was created (midnight today)',
    example: '2026-07-16T00:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The ISO timestamp when the quest expires (midnight tomorrow)',
    example: '2026-07-16T23:59:59.999Z',
    type: String,
  })
  expiresAt: Date;
}
