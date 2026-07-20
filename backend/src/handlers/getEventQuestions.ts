import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventQuestions handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const questions = await dbService.getEventQuestions(eventId);
    return buildResponse(200, questions);
  } catch (error: any) {
    logger.error('Error in getEventQuestions handler', error);
    return buildResponse(500, null, 'Unable to load questions. Please try again later.');
  }
};
