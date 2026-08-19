import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.provider';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.interface';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
    private readonly usersService: UsersService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async verifyAndGetUser(token: string): Promise<User> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(token);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException(
          'Firebase ID token does not contain an email address',
        );
      }

      let user = await this.usersService.findOne(uid);

      if (!user) {
        const username = name || email.split('@')[0] || 'User';
        const photoUrl = picture || null;
        user = await this.usersService.create(uid, email, username, photoUrl);
        // Initialize default locked achievements for the newly created user profile
        try {
          await this.achievementsService.initializeDefaults(uid);
        } catch (error) {
          console.error(
            `Failed to initialize default achievements for new user ${uid}:`,
            error,
          );
        }
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }
  }
}
