import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { CompleteHabitDto } from './dto/complete-habit.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Habits')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /habits — Create a new habit
  // ─────────────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new habit for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Habit created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Req() req: any, @Body() createHabitDto: CreateHabitDto) {
    return this.habitsService.create(req.user.uid, createHabitDto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /habits — Return all habits
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all habits of the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of habits' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Req() req: any) {
    return this.habitsService.findAll(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /habits/today — Return today's habits
  // IMPORTANT: This route must be declared BEFORE /:id to avoid route conflicts
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('today')
  @ApiOperation({
    summary: "Get today's habits with dynamic completion status",
  })
  @ApiResponse({ status: 200, description: "Today's habits list" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findToday(@Req() req: any) {
    return this.habitsService.findToday(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /habits/:id — Return a specific habit
  // ─────────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific habit by ID' })
  @ApiResponse({ status: 200, description: 'Habit details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.habitsService.findOne(req.user.uid, id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /habits/:id — Update a habit
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Update habit properties (difficulty changes recalculate XP)',
  })
  @ApiResponse({ status: 200, description: 'Updated habit details' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateHabitDto: UpdateHabitDto,
  ) {
    return this.habitsService.update(req.user.uid, id, updateHabitDto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /habits/:id — Delete a habit
  // ─────────────────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a habit' })
  @ApiResponse({ status: 200, description: 'Habit deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  delete(@Req() req: any, @Param('id') id: string) {
    return this.habitsService.delete(req.user.uid, id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /habits/:id/complete — Mark a habit as completed
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch(':id/complete')
  @ApiOperation({
    summary:
      'Mark a habit as completed. Prevents duplicate daily completions. Updates XP, level, and streaks atomically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit marked as completed, user stats updated',
  })
  @ApiResponse({ status: 400, description: 'Habit already completed today' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  complete(
    @Req() req: any,
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() _completeHabitDto: CompleteHabitDto,
  ) {
    return this.habitsService.complete(req.user.uid, id);
  }
}
