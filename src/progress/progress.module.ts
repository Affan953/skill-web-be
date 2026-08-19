import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ReflectionsService } from './reflections.service';
import { AchievementsModule } from '../achievements/achievements.module';
import { DailyQuestsModule } from '../daily-quests/daily-quests.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AchievementsModule,
    DailyQuestsModule,
    NotificationsModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, ReflectionsService],
  exports: [ProgressService, ReflectionsService],
})
export class ProgressModule {}
