import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService, mapEventItemToDto, normalizeCategory } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('updateEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n hÃ nh Ä‘á»™ng nÃ y. YÃªu cáº§u nhÃ³m quyá»n Admin.');
    }

    const pathParams = event.pathParameters || {};
    const id = pathParams.id;

    if (!id) {
      return buildResponse(400, null, 'Thiáº¿u ID sá»± kiá»‡n trong yÃªu cáº§u.');
    }

    if (!event.body) {
      return buildResponse(400, null, 'Thiáº¿u dá»¯ liá»‡u cáº­p nháº­t.');
    }

    const body = JSON.parse(event.body);
    const updatedEvent = await dbService.updateEventItem(id, {
      title: body.title,
      description: body.description,
      categoryId: body.category !== undefined ? normalizeCategory(body.category) : undefined,
      locationId: body.location,
      startTime: body.date,
      endTime: body.date,
      totalSeats: body.totalSeats !== undefined ? Number(body.totalSeats) : undefined,
      imageUrl: body.imageUrl
    });

    if (!updatedEvent) {
      return buildResponse(404, null, `KhÃ´ng tÃ¬m tháº¥y sá»± kiá»‡n vá»›i ID: ${id}`);
    }

    return buildResponse(200, mapEventItemToDto(updatedEvent));
  } catch (error: any) {
    logger.error('Error in updateEvent handler', error);
    return buildResponse(500, null, 'KhÃ´ng thá»ƒ cáº­p nháº­t sá»± kiá»‡n. Vui lÃ²ng thá»­ láº¡i sau.');
  }
};
