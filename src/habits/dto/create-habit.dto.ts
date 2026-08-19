import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HabitCategory, HabitDifficulty } from '../habits.interface';

export class CreateHabitDto {
  @ApiProperty({
    description: 'The title of the habit',
    example: 'Read 20 pages',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string;

  @ApiPropertyOptional({
    description: 'A short description of the habit',
    example: 'Read at least 20 pages of a non-fiction book every day',
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'The category the habit belongs to',
    enum: HabitCategory,
    example: HabitCategory.Reading,
  })
  @IsEnum(HabitCategory)
  @IsNotEmpty()
  category: HabitCategory;

  @ApiPropertyOptional({
    description: 'The specific activity the user wants to perform',
    example: 'Running',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  activity?: string;

  @ApiPropertyOptional({
    description: 'Human-readable session goal label (e.g. Target Distance)',
    example: 'Target Distance',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  goalLabel?: string;

  @ApiPropertyOptional({
    description: 'The user-defined session goal value',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  goalValue?: number;

  @ApiPropertyOptional({
    description: 'Unit of the session goal value (e.g. KM, Pages, Reps)',
    example: 'KM',
  })
  @IsString()
  @IsOptional()
  @Length(1, 30)
  goalUnit?: string;

  @ApiProperty({
    description: 'The difficulty level of the habit',
    enum: HabitDifficulty,
    example: HabitDifficulty.Medium,
  })
  @IsEnum(HabitDifficulty)
  @IsNotEmpty()
  difficulty: HabitDifficulty;

  @ApiPropertyOptional({
    description: 'Optional reminder time in HH:MM 24-hour format',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminderTime must be in HH:MM 24-hour format',
  })
  reminderTime?: string;
}
