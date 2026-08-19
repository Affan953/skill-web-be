import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /leaderboard — Retrieve the full leaderboard ranked by XP, Level, Streak
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get the leaderboard ranked by XP, Level, and Streak (descending)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully.',
    type: [LeaderboardEntryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getLeaderboard(): Promise<LeaderboardEntryDto[]> {
    return this.leaderboardService.getTopUsers();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /leaderboard/me — Retrieve the current user's ranking
  // IMPORTANT: Declared before parameterized routes to avoid route conflicts
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({
    summary: "Get the current authenticated user's rank on the leaderboard",
  })
  @ApiResponse({
    status: 200,
    description: 'User rank retrieved successfully.',
    type: LeaderboardEntryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'User not found on the leaderboard.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getMyRank(@Req() req: any): Promise<LeaderboardEntryDto> {
    const entry = await this.leaderboardService.getUserRank(req.user.uid);

    if (!entry) {
      throw new NotFoundException('User not found on the leaderboard.');
    }

    return entry;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /leaderboard/top/:limit — Retrieve the top N players
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('top/:limit')
  @ApiOperation({
    summary: 'Get the top N players on the leaderboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Top players retrieved successfully.',
    type: [LeaderboardEntryDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid limit parameter.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getTopN(
    @Param('limit', ParseIntPipe) limit: number,
  ): Promise<LeaderboardEntryDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    return this.leaderboardService.getTopUsers(safeLimit);
  }
}
