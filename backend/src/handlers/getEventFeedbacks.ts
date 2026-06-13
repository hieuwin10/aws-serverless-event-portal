import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventFeedbacks handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const feedbacks = await dbService.listFeedbacksByEvent(eventId);
    return buildResponse(200, feedbacks);
  } catch (error: any) {
    logger.error('Error in getEventFeedbacks handler', error);
    return buildResponse(500, null, 'Unable to load feedbacks. Please try again later.');
  }
};
