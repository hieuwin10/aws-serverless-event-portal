import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('upvoteEventQuestion handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;
    const questionId = pathParams.questionId;

    if (!eventId || !questionId) {
      return buildResponse(400, null, 'Param event id or question id missing.');
    }

    const question = await dbService.upvoteQuestion(eventId, questionId);
    if (!question) {
       return buildResponse(404, null, 'Question not found.');
    }

    return buildResponse(200, question);
  } catch (error: any) {
    logger.error('Error in upvoteEventQuestion handler', error);
    return buildResponse(500, null, 'Unable to upvote question. Please try again later.');
  }
};
