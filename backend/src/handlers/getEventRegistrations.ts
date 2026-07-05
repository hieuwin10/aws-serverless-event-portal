import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAdminOrOrganizer } from '../services/authService';

/**
 * GET /events/{id}/registrations
 * Lấy danh sách đăng ký của một sự kiện (chỉ dành cho Admin/Organizer)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventRegistrations handler triggered');

    const userClaims = getUserClaims(event);
    if (!userClaims || !isAdminOrOrganizer(userClaims)) {
      return buildResponse(403, null, 'Bạn không có quyền xem danh sách đăng ký.');
    }

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện');
    }

    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    return buildResponse(200, registrations);
  } catch (error: any) {
    logger.error('Error in getEventRegistrations handler', error);
    return buildResponse(500, null, 'Không thể tải danh sách đăng ký.');
  }
};
