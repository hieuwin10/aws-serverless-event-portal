import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('updateEventQuestionStatus handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;
    const questionId = pathParams.questionId;

    if (!eventId || !questionId) {
      return buildResponse(400, null, 'Param event id or question id missing.');
    }

    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
       return buildResponse(400, null, 'Invalid request body.');
    }

    const status = body.status;
    if (status !== 'pending' && status !== 'answering' && status !== 'answered') {
      return buildResponse(400, null, 'Invalid question status. Must be pending, answering, or answered.');
    }

    const question = await dbService.updateQuestionStatus(eventId, questionId, status);
    if (!question) {
       return buildResponse(404, null, 'Question not found.');
    }

    return buildResponse(200, question);
  } catch (error: any) {
    logger.error('Error in updateEventQuestionStatus handler', error);
    return buildResponse(500, null, 'Unable to update question status. Please try again later.');
  }
};
