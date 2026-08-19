import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class CompleteHabitDto {
  @ApiPropertyOptional({
    description: 'Optional note to attach to the completion log',
    example: 'Finished the whole chapter!',
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  note?: string;
}
