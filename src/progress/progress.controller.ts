import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { ReflectionsService } from './reflections.service';
import { CreateReflectionDto } from './dto/create-reflection.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(
    private readonly progressService: ProgressService,
    private readonly reflectionsService: ReflectionsService,
  ) {}

  @Get('xp-history')
  @ApiOperation({ summary: 'Get XP history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of XP history entries' })
  getXpHistory(@Req() req: any) {
    return this.progressService.getXpHistory(req.user.uid);
  }

  @Get('habit-history')
  @ApiOperation({ summary: 'Get habit completion history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of habit history entries' })
  getHabitHistory(@Req() req: any) {
    return this.progressService.getHabitHistory(req.user.uid);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive statistics for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User statistics object' })
  getStatistics(@Req() req: any) {
    return this.progressService.getUserStatistics(req.user.uid);
  }

  @Get('reflections')
  @ApiOperation({ summary: 'Get all reflections for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of reflections' })
  getReflections(@Req() req: any) {
    return this.reflectionsService.getReflections(req.user.uid);
  }

  @Get('reflections/summary')
  @ApiOperation({ summary: 'Get weekly reflection summary' })
  @ApiResponse({ status: 200, description: 'Weekly reflection summary' })
  getWeeklySummary(@Req() req: any) {
    return this.reflectionsService.getWeeklySummary(req.user.uid);
  }

  @Get('reflections/weekly-review')
  @ApiOperation({ summary: 'Get weekly growth review' })
  @ApiResponse({ status: 200, description: 'Weekly review data' })
  getWeeklyReview(@Req() req: any) {
    return this.reflectionsService.getWeeklyReview(req.user.uid);
  }

  @Get('reflections/monthly-review')
  @ApiOperation({ summary: 'Get monthly growth review' })
  @ApiResponse({ status: 200, description: 'Monthly review data' })
  getMonthlyReview(@Req() req: any) {
    return this.reflectionsService.getMonthlyReview(req.user.uid);
  }

  @Get('reflections/:id')
  @ApiOperation({ summary: 'Get a specific reflection by ID' })
  @ApiResponse({ status: 200, description: 'Reflection details' })
  @ApiResponse({ status: 404, description: 'Reflection not found' })
  getReflectionById(@Req() req: any, @Param('id') id: string) {
    return this.reflectionsService.getReflectionById(req.user.uid, id);
  }

  @Post('reflections')
  @ApiOperation({ summary: 'Save a reflection and trigger XP/achievements/streaks' })
  @ApiResponse({ status: 201, description: 'Reflection saved, gamification processed' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  saveReflection(@Req() req: any, @Body() dto: CreateReflectionDto) {
    return this.reflectionsService.processReflection(req.user.uid, dto);
  }
}
