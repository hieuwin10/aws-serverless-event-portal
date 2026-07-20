import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('createEventQuestion handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
       return buildResponse(400, null, 'Invalid request body.');
    }

    const content = body.content ? String(body.content).trim() : '';
    if (!content) {
      return buildResponse(400, null, 'Question content cannot be empty.');
    }

    if (content.length > 250) {
      return buildResponse(400, null, 'Question content must be under 250 characters.');
    }

    const userName = body.userName ? String(body.userName).trim() : 'Anonymous';
    const questionId = `q_${uuidv4()}`;

    const question = await dbService.createQuestionItem({
      questionId,
      eventId,
      userName,
      content
    });

    return buildResponse(201, question);
  } catch (error: any) {
    logger.error('Error in createEventQuestion handler', error);
    return buildResponse(500, null, 'Unable to create question. Please try again later.');
  }
};
