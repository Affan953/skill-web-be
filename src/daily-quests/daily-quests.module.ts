import { Module } from '@nestjs/common';
import { DailyQuestsController } from './daily-quests.controller';
import { DailyQuestsService } from './daily-quests.service';
import { UsersModule } from '../users/users.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, AchievementsModule, NotificationsModule],
  controllers: [DailyQuestsController],
  providers: [DailyQuestsService],
  exports: [DailyQuestsService],
})
export class DailyQuestsModule {}
