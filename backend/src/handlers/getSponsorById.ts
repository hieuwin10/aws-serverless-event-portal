import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getSponsorById handler triggered');

    const sponsorId = event.pathParameters?.id;
    if (!sponsorId) {
      return buildResponse(400, null, 'Missing sponsor id.');
    }

    const sponsor = await dbService.getSponsorById(sponsorId);
    if (!sponsor) {
      return buildResponse(404, null, 'Sponsor not found.');
    }

    return buildResponse(200, sponsor);
  } catch (error: any) {
    logger.error('Error in getSponsorById handler', error);
    return buildResponse(500, null, 'Khong the tai thong tin nha tai tro. Vui long thu lai sau.');
  }
};
