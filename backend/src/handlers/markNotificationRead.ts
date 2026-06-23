import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('markNotificationRead handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'User must be logged in to update notifications.');
    }

    const notificationId = event.pathParameters?.notificationId;
    if (!notificationId) {
      return buildResponse(400, null, 'Missing notification id.');
    }

    const notification = await dbService.markNotificationAsRead(userId, notificationId);
    if (!notification) {
      return buildResponse(404, null, 'Notification not found.');
    }

    return buildResponse(200, notification);
  } catch (error: any) {
    logger.error('Error in markNotificationRead handler', error);
    return buildResponse(500, null, 'Unable to update notification. Please try again later.');
  }
};
