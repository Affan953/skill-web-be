import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AchievementsService } from './achievements.service';
import { AchievementResponseDto } from './dto/achievement-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// AchievementsController
//
// All routes are protected by AuthGuard (Firebase ID Token).
// No business logic lives here — every action is delegated to AchievementsService.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Achievements')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /achievements
  // Returns every achievement (locked and unlocked) with live progress.
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get all achievements',
    description:
      'Returns all achievements for the authenticated user, including locked ones. ' +
      'Progress values are calculated live from user statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'All achievements with unlock status and current progress.',
    type: [AchievementResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAllAchievements(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<AchievementResponseDto[]> {
    return this.achievementsService.getAll(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /achievements/unlocked
  // Returns only the achievements that have been unlocked by the user.
  // IMPORTANT: Declared before /:id to avoid route conflict.
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('unlocked')
  @ApiOperation({
    summary: 'Get unlocked achievements',
    description:
      'Returns only the achievements the authenticated user has already unlocked.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of unlocked achievements.',
    type: [AchievementResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getUnlockedAchievements(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<AchievementResponseDto[]> {
    return this.achievementsService.getUnlocked(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /achievements/progress
  // Returns every achievement with progress and target — ideal for progress bars.
  // IMPORTANT: Declared before /:id to avoid route conflict.
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('progress')
  @ApiOperation({
    summary: 'Get achievement progress',
    description:
      'Returns all achievements with their current progress value and unlock target. ' +
      'Designed for rendering progress bars on the frontend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Achievement list with progress and target values.',
    type: [AchievementResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAchievementsProgress(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<AchievementResponseDto[]> {
    return this.achievementsService.getProgress(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /achievements/:id
  // Returns a single achievement by its ID.
  // ─────────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Get achievement by ID',
    description:
      'Returns the full detail of a single achievement, including live progress.',
  })
  @ApiParam({
    name: 'id',
    description:
      'The unique string ID of the achievement (e.g. "first_step", "level_5")',
    example: 'first_step',
  })
  @ApiResponse({
    status: 200,
    description: 'Achievement detail.',
    type: AchievementResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Achievement not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAchievementById(
    @Req() req: Request & { user: { uid: string } },
    @Param('id') id: string,
  ): Promise<AchievementResponseDto> {
    return this.achievementsService.getOne(req.user.uid, id);
  }
}
