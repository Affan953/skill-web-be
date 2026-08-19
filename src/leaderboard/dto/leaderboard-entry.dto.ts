import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({
    description: 'The rank of the user in the leaderboard, starting from 1',
    example: 1,
  })
  rank: number;

  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 'user-uid-123',
  })
  uid: string;

  @ApiProperty({
    description: 'The display name of the user',
    example: 'Affan',
  })
  displayName: string;

  @ApiProperty({
    description: "The URL of the user's profile photo",
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  photoURL: string | null;

  @ApiProperty({
    description: "The user's current level",
    example: 15,
  })
  level: number;

  @ApiProperty({
    description: 'The total experience points (XP) accumulated by the user',
    example: 2450,
  })
  xp: number;

  @ApiProperty({
    description: 'The current habit streak of the user',
    example: 12,
  })
  streak: number;
}
