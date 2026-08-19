import {
  Controller,
  Get,
  Logger,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check health status of the application and Firestore',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status details',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        firestore: { type: 'string', example: 'connected' },
      },
    },
  })
  async checkHealth() {
    try {
      const firestore = this.firebaseService.getDb();
      // Test the connection by trying to fetch collections list
      await firestore.listCollections();
      return {
        status: 'ok',
        firestore: 'connected',
      };
    } catch (e) {
      this.logger.error('Firestore health check failed:', e);
      throw new ServiceUnavailableException('Firestore is unavailable');
    }
  }
}
