import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HabitCategory, HabitDifficulty } from '../habits.interface';

export class UpdateHabitDto {
  @ApiPropertyOptional({
    description: 'Updated title of the habit',
    example: 'Read 30 pages',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the habit',
    example: 'Read at least 30 pages of a non-fiction book every day',
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated category of the habit',
    enum: HabitCategory,
    example: HabitCategory.Coding,
  })
  @IsEnum(HabitCategory)
  @IsOptional()
  category?: HabitCategory;

  @ApiPropertyOptional({
    description:
      'Updated difficulty level — XP reward will be recalculated automatically',
    enum: HabitDifficulty,
    example: HabitDifficulty.Hard,
  })
  @IsEnum(HabitDifficulty)
  @IsOptional()
  difficulty?: HabitDifficulty;

  @ApiPropertyOptional({
    description: 'Updated specific activity name',
    example: 'Morning Run',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  activity?: string;

  @ApiPropertyOptional({
    description: 'Updated session goal label (e.g. Target Distance)',
    example: 'Target Distance',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  goalLabel?: string;

  @ApiPropertyOptional({
    description: 'Updated session goal value',
    example: 8,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  goalValue?: number;

  @ApiPropertyOptional({
    description: 'Updated session goal unit (e.g. KM, Pages, Reps)',
    example: 'KM',
  })
  @IsString()
  @IsOptional()
  @Length(1, 30)
  goalUnit?: string;

  @ApiPropertyOptional({
    description: 'Updated reminder time in HH:MM 24-hour format',
    example: '09:30',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminderTime must be in HH:MM 24-hour format',
  })
  reminderTime?: string;
}
