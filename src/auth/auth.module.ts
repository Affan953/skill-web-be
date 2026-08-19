import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { AuthGuard } from './auth.guard';
import { UsersModule } from '../users/users.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Global()
@Module({
  imports: [UsersModule, AchievementsModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthStrategy, AuthGuard],
  exports: [FirebaseAuthStrategy, AuthGuard],
})
export class AuthModule {}
