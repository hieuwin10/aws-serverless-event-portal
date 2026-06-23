import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { buildEventKeys, dbService, mapFeedbackItemToDto } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('createEventFeedback handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'User must be logged in to submit feedback.');
    }

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

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return buildResponse(400, null, 'Rating must be an integer from 1 to 5.');
    }

    const eventKeys = buildEventKeys(eventId);
    const eventItem = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventItem || (eventItem.entityType && eventItem.entityType !== 'EVENT')) {
      return buildResponse(404, null, 'Event not found.');
    }

    const registration = await dbService.getRegistrationByUserAndEvent(userId, eventId);
    if (!registration) {
      return buildResponse(403, null, 'User must register before leaving feedback.');
    }

    const feedback = await dbService.createFeedbackItem({
      feedbackId: `fb_${uuidv4()}`,
      eventId,
      userId,
      rating,
      comment: body.comment === undefined || body.comment === null ? '' : String(body.comment)
    });

    return buildResponse(200, mapFeedbackItemToDto(feedback));
  } catch (error: any) {
    logger.error('Error in createEventFeedback handler', error);
    return buildResponse(500, null, 'Unable to submit feedback. Please try again later.');
  }
};
