import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getUserPayments handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'User must be logged in to view payments.');
    }

    const payments = await dbService.listPaymentsByUser(userId);
    return buildResponse(200, payments);
  } catch (error: any) {
    logger.error('Error in getUserPayments handler', error);
    return buildResponse(500, null, 'Unable to load payments. Please try again later.');
  }
};
