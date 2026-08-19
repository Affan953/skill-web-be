import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authStrategy: FirebaseAuthStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header must follow "Bearer <token>" format',
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    const user = await this.authStrategy.validate(token);
    request.user = user;
    return true;
  }
}
