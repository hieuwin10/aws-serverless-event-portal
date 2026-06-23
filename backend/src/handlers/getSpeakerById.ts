import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getSpeakerById handler triggered');

    const speakerId = event.pathParameters?.id;
    if (!speakerId) {
      return buildResponse(400, null, 'Missing speaker id.');
    }

    const speaker = await dbService.getSpeakerById(speakerId);
    if (!speaker) {
      return buildResponse(404, null, 'Speaker not found.');
    }

    return buildResponse(200, speaker);
  } catch (error: any) {
    logger.error('Error in getSpeakerById handler', error);
    return buildResponse(500, null, 'Khong the tai thong tin dien gia. Vui long thu lai sau.');
  }
};
