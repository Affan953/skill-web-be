import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { DailyQuestsService } from './daily-quests.service';
import { DailyQuestResponseDto } from './dto/daily-quest-response.dto';

@ApiTags('Daily Quests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('daily-quests')
export class DailyQuestsController {
  constructor(private readonly dailyQuestsService: DailyQuestsService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /daily-quests — Retrieve today's daily quests
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get daily quests for today',
    description:
      "Retrieves today's active and completed daily quests. Automatically generates fresh ones if it is a new day.",
  })
  @ApiResponse({
    status: 200,
    description: "Today's list of daily quests.",
    type: [DailyQuestResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getTodayQuests(@Req() req: any): Promise<DailyQuestResponseDto[]> {
    const uid = req.user.uid;
    return this.dailyQuestsService.getTodayQuests(uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /daily-quests/completed — Retrieve all completed daily quests
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('completed')
  @ApiOperation({
    summary: 'Get all completed daily quests',
    description:
      'Retrieves a history of all completed daily quests for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of completed daily quests.',
    type: [DailyQuestResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getCompletedQuests(@Req() req: any): Promise<DailyQuestResponseDto[]> {
    const uid = req.user.uid;
    return this.dailyQuestsService.getCompletedQuests(uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /daily-quests/progress — Retrieve quests with detailed progress
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('progress')
  @ApiOperation({
    summary: 'Get daily quest progress',
    description:
      'Retrieves daily quests and progress values, useful for progress bars.',
  })
  @ApiResponse({
    status: 200,
    description:
      "Today's daily quests with their current progress and target values.",
    type: [DailyQuestResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getQuestsProgress(@Req() req: any): Promise<DailyQuestResponseDto[]> {
    const uid = req.user.uid;
    return this.dailyQuestsService.getQuestsProgress(uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /daily-quests/regenerate — Regenerate daily quests if none exist
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('regenerate')
  @ApiOperation({
    summary: "Regenerate today's daily quests (Developer endpoint)",
    description:
      'Force-regenerates quests for today only if no active quests currently exist in the database.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully generated and returned new daily quests.',
    type: [DailyQuestResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - today's quests already exist.",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async regenerateQuests(@Req() req: any): Promise<DailyQuestResponseDto[]> {
    const uid = req.user.uid;
    return this.dailyQuestsService.regenerateQuests(uid);
  }
}
