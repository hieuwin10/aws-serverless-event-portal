import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getUserRegistrations handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để xem lịch sử đăng ký.');
    }

    const registrations = await dbService.getUserRegistrations(userId);
    return buildResponse(200, registrations);
  } catch (error: any) {
    logger.error('Error in getUserRegistrations handler', error);
    return buildResponse(500, null, 'Không thể tải lịch sử đăng ký. Vui lòng thử lại sau.');
  }
};
