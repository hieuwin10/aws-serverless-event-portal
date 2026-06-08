import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { dbService, mapEventItemToDto, normalizeCategory } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('createEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer; // supporting both APIGW and mock local context
    
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Bạn không có quyền thực hiện hành động này. Yêu cầu nhóm quyền Admin.');
    }

    if (!event.body) {
      return buildResponse(400, null, 'Thiếu dữ liệu sự kiện.');
    }

    const body = JSON.parse(event.body);
    const { title, category, description, date, location, imageUrl, totalSeats } = body;

    if (!title || !category || !date || !location || !totalSeats) {
      return buildResponse(400, null, 'Vui lòng cung cấp đầy đủ các trường thông tin bắt buộc: title, category, date, location, totalSeats.');
    }

    const eventId = `evt_${uuidv4()}`;
    const organizerId = claims?.sub || claims?.userId || 'usr_admin_9999_9999_9999_9999';
    const normalizedCategory = normalizeCategory(category);
    const startTime = date;
    const seatCount = Number(totalSeats);

    const newEvent = await dbService.createEventItem({
      eventId,
      organizerId,
      categoryId: normalizedCategory,
      locationId: location,
      title,
      description: description || '',
      startTime,
      endTime: startTime,
      totalSeats: seatCount,
      remainingSeats: seatCount,
      status: 'PUBLISHED',
      imageUrl
    });

    return buildResponse(201, mapEventItemToDto(newEvent));
  } catch (error: any) {
    logger.error('Error in createEvent handler', error);
    return buildResponse(500, null, 'Không thể tạo sự kiện mới. Vui lòng thử lại sau.');
  }
};
