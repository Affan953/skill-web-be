import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Verify Firebase ID Token and return user profile details (registers user if new)',
  })
  @ApiResponse({
    status: 201,
    description: 'Verified/Registered user profile details',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    return this.authService.verifyAndGetUser(verifyTokenDto.token);
  }
}
