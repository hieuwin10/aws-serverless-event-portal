import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('deleteEvent handler triggered');
    
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

    const pk = `EVENT#${id}`;
    const sk = 'METADATA';
    const existingEvent = await dbService.getItem(pk, sk);

    if (!existingEvent) {
      return buildResponse(404, null, `KhÃ´ng tÃ¬m tháº¥y sá»± kiá»‡n vá»›i ID: ${id}`);
    }

    await dbService.deleteEventCascade(id);
    return buildResponse(200, { message: `ÄÃ£ xÃ³a thÃ nh cÃ´ng sá»± kiá»‡n ${id} cÃ¹ng táº¥t cáº£ lÆ°á»£t Ä‘Äƒng kÃ½.` });
  } catch (error: any) {
    logger.error('Error in deleteEvent handler', error);
    return buildResponse(500, null, 'KhÃ´ng thá»ƒ xÃ³a sá»± kiá»‡n. Vui lÃ²ng thá»­ láº¡i sau.');
  }
};
