import { IsOptional, IsString, Length, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'The updated username (min length 3, max length 50)',
    example: 'alex_skiller',
  })
  @IsString()
  @IsOptional()
  @Length(3, 50)
  username?: string;

  @ApiPropertyOptional({
    description: 'The updated URL for the user profile picture',
    example: 'https://example.com/photo.png',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'photoUrl must be a valid URL' })
  photoUrl?: string;
}
