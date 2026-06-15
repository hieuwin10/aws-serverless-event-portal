import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getUserNotifications handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'User must be logged in to view notifications.');
    }

    const notifications = await dbService.listNotificationsByUser(userId);
    return buildResponse(200, notifications);
  } catch (error: any) {
    logger.error('Error in getUserNotifications handler', error);
    return buildResponse(500, null, 'Unable to load notifications. Please try again later.');
  }
};
