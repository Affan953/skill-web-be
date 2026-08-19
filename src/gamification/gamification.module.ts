import { Global, Module } from '@nestjs/common';
import { XpService } from './services/xp.service';
import { LevelService } from './services/level.service';
import { StreakService } from './services/streak.service';

// ─────────────────────────────────────────────────────────────────────────────
// GamificationModule
//
// @Global() — providers are available application-wide once this module
// is imported in AppModule. No need to add GamificationModule to the
// imports array of any other feature module.
// ─────────────────────────────────────────────────────────────────────────────

@Global()
@Module({
  providers: [XpService, LevelService, StreakService],
  exports: [XpService, LevelService, StreakService],
})
export class GamificationModule {}
