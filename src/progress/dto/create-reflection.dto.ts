import { IsString, IsNotEmpty, IsOptional, IsObject, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SessionMetadataDto {
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;
}

export class CreateReflectionDto {
  @IsString()
  @IsNotEmpty()
  habitId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  reflection: string;

  @IsOptional()
  @IsObject()
  proofOfProgress?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SessionMetadataDto)
  sessionMetadata?: SessionMetadataDto;

  @IsOptional()
  @IsString()
  proudOf?: string;

  @IsOptional()
  @IsString()
  challenged?: string;

  @IsOptional()
  @IsString()
  improve?: string;
}
