import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Get('habits')
  getHabits(@Query('search') search?: string) {
    return this.adminService.getAllHabits(search);
  }

  @Get('achievements')
  getAchievements() {
    return this.adminService.getAchievements();
  }

  @Get('daily-quests')
  getDailyQuests() {
    return this.adminService.getDailyQuests();
  }

  @Get('notifications')
  getNotifications(@Query('search') search?: string) {
    return this.adminService.getNotifications(search);
  }

  @Get('reflections')
  getReflections(@Query('search') search?: string) {
    return this.adminService.getReflections(search);
  }

  @Get('reflection-analytics')
  getReflectionAnalytics() {
    return this.adminService.getReflectionAnalytics();
  }
}
