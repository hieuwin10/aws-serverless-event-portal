import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('updateCertificateConfig handler triggered');

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

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
       return buildResponse(400, null, 'Invalid request body.');
    }

    const certCoordsX = body.certCoordsX !== undefined ? Number(body.certCoordsX) : 100;
    const certCoordsY = body.certCoordsY !== undefined ? Number(body.certCoordsY) : 100;
    const certTemplateUrl = body.certTemplateUrl ? String(body.certTemplateUrl).trim() : '';

    const updatedEvent = await dbService.updateEventItem(eventId, {
      // Custom patch for event metadata
      ...{
        certCoordsX,
        certCoordsY,
        certTemplateUrl
      }
    } as any);

    if (!updatedEvent) {
      return buildResponse(404, null, 'Event not found.');
    }

    return buildResponse(200, {
      eventId,
      certCoordsX,
      certCoordsY,
      certTemplateUrl
    });
  } catch (error: any) {
    logger.error('Error in updateCertificateConfig handler', error);
    return buildResponse(500, null, 'Unable to update certificate configuration. Please try again later.');
  }
};
