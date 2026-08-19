import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenDto {
  @ApiProperty({
    description:
      'The Firebase ID Token obtained from Firebase Client SDK authentication',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ5N2U1ZmNm...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
