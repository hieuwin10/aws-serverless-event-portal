import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

/**
 * GET /events/{id}/waitlist
 * Lấy danh sách người dùng trong hàng đợi chờ vé của một sự kiện
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventWaitlist handler triggered');

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện');
    }

    const waitlist = await dbService.getEventWaitlist(eventId);
    
    // Format waitlist entries for frontend consumption
    const formatted = waitlist.map((entry: any, index: number) => ({
      position: index + 1,
      name: entry.userEmail ? entry.userEmail.split('@')[0] : `User ${entry.userId.slice(-4)}`,
      email: entry.userEmail || 'Ẩn danh',
      registeredAt: entry.joinedAt || new Date(entry.timestamp).toISOString()
    }));

    return buildResponse(200, formatted);
  } catch (error: any) {
    logger.error('Error in getEventWaitlist handler', error);
    return buildResponse(500, null, 'Không thể tải danh sách chờ lúc này.');
  }
};
