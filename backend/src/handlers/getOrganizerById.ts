import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getOrganizerById handler triggered');

    const organizerId = event.pathParameters?.id;
    if (!organizerId) {
      return buildResponse(400, null, 'Missing organizer id.');
    }

    const organizer = await dbService.getOrganizerById(organizerId);
    if (!organizer) {
      return buildResponse(404, null, 'Organizer not found.');
    }

    return buildResponse(200, organizer);
  } catch (error: any) {
    logger.error('Error in getOrganizerById handler', error);
    return buildResponse(500, null, 'Khong the tai thong tin don vi to chuc. Vui long thu lai sau.');
  }
};
