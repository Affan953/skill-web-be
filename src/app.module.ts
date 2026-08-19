import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import firebaseConfig from './config/firebase.config';
import { validate } from './config/env.validation';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HabitsModule } from './habits/habits.module';
import { GamificationModule } from './gamification/gamification.module';
import { AchievementsModule } from './achievements/achievements.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ProgressModule } from './progress/progress.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './common/health.controller';
import { DailyQuestsModule } from './daily-quests/daily-quests.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, firebaseConfig],
      validate,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    FirebaseModule,
    GamificationModule,
    AuthModule,
    UsersModule,
    HabitsModule,
    AchievementsModule,
    LeaderboardModule,
    ProgressModule,
    NotificationsModule,
    DailyQuestsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
