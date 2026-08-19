import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notifications.interface';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'The type of notification',
    enum: NotificationType,
    example: NotificationType.HabitCompleted,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'The title of the notification',
    example: 'Habit Completed!',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title: string;

  @ApiProperty({
    description: 'A detailed description of the notification',
    example: 'You completed "Read 20 pages" and earned 25 XP.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  description: string;

  @ApiPropertyOptional({
    description: 'Optional metadata object (e.g. habitId, xpEarned)',
    example: { habitId: 'abc123', xpEarned: 25 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
