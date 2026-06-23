import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventTickets handler triggered');
    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const tickets = await dbService.listTicketsByEvent(eventId);
    return buildResponse(200, tickets);
  } catch (error: any) {
    logger.error('Error in getEventTickets handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach ve. Vui long thu lai sau.');
  }
};
