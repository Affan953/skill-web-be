import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsController
//
// All routes are protected by AuthGuard (Firebase ID Token).
// No business logic lives here — every action is delegated to NotificationsService.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /notifications — Return all notifications for the authenticated user
  // ─────────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get all notifications',
    description:
      'Returns all notifications for the authenticated user, sorted by newest first.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications.',
    type: [NotificationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getNotifications(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.getNotifications(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /notifications/unread-count — Return unread notification count
  // IMPORTANT: Declared before /:id to avoid route conflict.
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Returns the number of unread notifications for badge display.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count.',
    schema: { example: { unreadCount: 5 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getUnreadCount(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsService.getUnreadCount(
      req.user.uid,
    );
    return { unreadCount };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /notifications/read-all — Mark all notifications as read
  // IMPORTANT: Declared before /:id to avoid route conflict.
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks every notification for the authenticated user as read.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
    schema: { example: { message: 'Marked 5 notification(s) as read.' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async markAllAsRead(
    @Req() req: Request & { user: { uid: string } },
  ): Promise<{ message: string }> {
    return this.notificationsService.markAllAsRead(req.user.uid);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /notifications/:id — Return a specific notification
  // ─────────────────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Returns a single notification by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique ID of the notification',
    example: 'notif_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification detail.',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getNotificationById(
    @Req() req: Request & { user: { uid: string } },
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    // Fetch all and find by ID (single-doc fetch would be more efficient,
    // but we reuse the existing service pattern for consistency)
    const notifications = await this.notificationsService.getNotifications(
      req.user.uid,
    );
    const notification = notifications.find((n) => n.id === id);

    if (!notification) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException(`Notification with ID "${id}" not found.`);
    }

    return notification;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /notifications — Create a new notification
  // Used internally and for future admin tools.
  // ─────────────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a notification',
    description:
      'Creates a new notification for the authenticated user. Used internally and for future admin tools.',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully.',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async createNotification(
    @Req() req: Request & { user: { uid: string } },
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.createNotification(
      req.user.uid,
      createNotificationDto,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /notifications/:id/read — Mark a notification as read
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a single notification as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique ID of the notification',
    example: 'notif_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read.',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async markAsRead(
    @Req() req: Request & { user: { uid: string } },
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(req.user.uid, id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /notifications/:id — Delete a notification
  // ─────────────────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Deletes a notification permanently.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique ID of the notification',
    example: 'notif_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully.',
    schema: { example: { message: 'Notification successfully deleted.' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async deleteNotification(
    @Req() req: Request & { user: { uid: string } },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.notificationsService.deleteNotification(req.user.uid, id);
  }
}
