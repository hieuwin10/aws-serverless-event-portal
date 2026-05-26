import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('registerEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userId = claims?.sub || claims?.userId;
    const email = claims?.email;

    if (!userId || !email) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để đăng ký tham gia sự kiện.');
    }

    const pathParams = event.pathParameters || {};
    const id = pathParams.id; // EventId

    if (!id) {
      return buildResponse(400, null, 'Thiếu ID sự kiện trong yêu cầu.');
    }

    // 1. Check if event exists
    const eventMeta = await dbService.getItem(`EVENT#${id}`, 'METADATA');
    if (!eventMeta) {
      return buildResponse(404, null, 'Không tìm thấy sự kiện.');
    }

    // 2. Check if already registered
    const existingReg = await dbService.getItem(`EVENT#${id}`, `USER#${userId}`);
    if (existingReg) {
      return buildResponse(400, null, 'Bạn đã đăng ký tham gia sự kiện này rồi.');
    }

    // 3. Check seats
    const totalSeats = Number(eventMeta.totalSeats || 0);
    const registeredCount = Number(eventMeta.registeredCount || 0);
    if (registeredCount >= totalSeats) {
      return buildResponse(400, null, 'Rất tiếc! Sự kiện này đã hết vé trống tham gia.');
    }

    // 4. Generate registration and ticketCode
    const registrationId = `reg_${uuidv4()}`;
    const eventPrefix = id.slice(4, 8).toUpperCase();
    const userSuffix = userId.slice(-4).toUpperCase();
    const ticketCode = `TKT-AWS-${eventPrefix}-${userSuffix}`;

    const newRegistration = {
      PK: `EVENT#${id}`,
      SK: `USER#${userId}`,
      registrationId,
      eventId: id,
      userId,
      email,
      registeredAt: new Date().toISOString(),
      ticketCode
    };

    // Save registration
    await dbService.putItem(newRegistration);
    // Increment seat count
    await dbService.updateEventSeats(id, 1);

    return buildResponse(200, newRegistration);
  } catch (error: any) {
    logger.error('Error in registerEvent handler', error);
    return buildResponse(500, null, 'Không thể hoàn tất đăng ký sự kiện. Vui lòng thử lại sau.');
  }
};
