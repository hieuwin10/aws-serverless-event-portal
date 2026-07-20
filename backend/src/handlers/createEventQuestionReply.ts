import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('createEventQuestionReply handler triggered');

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

    const content = body.content ? String(body.content).trim() : '';
    if (!content) {
      return buildResponse(400, null, 'Reply content cannot be empty.');
    }

    if (content.length > 500) {
      return buildResponse(400, null, 'Reply content must be under 500 characters.');
    }

    const adminId = claims?.sub || claims?.userId || 'usr_admin_9999_9999_9999_9999';
    const adminName = claims?.name || 'Ban tổ chức';
    const replyId = `r_${uuidv4()}`;

    const question = await dbService.addQuestionReply(eventId, questionId, {
      replyId,
      adminId,
      adminName,
      content
    });

    return buildResponse(200, question);
  } catch (error: any) {
    logger.error('Error in createEventQuestionReply handler', error);
    return buildResponse(500, null, error.message || 'Unable to submit reply. Please try again later.');
  }
};
