import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.provider';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.interface';

@Injectable()
export class FirebaseAuthStrategy {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
    private readonly usersService: UsersService,
  ) {}

  async validate(token: string): Promise<User> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(token);
      const user = await this.usersService.findOne(decodedToken.uid);
      if (!user) {
        throw new UnauthorizedException('User profile not found in database');
      }
      return user;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}
