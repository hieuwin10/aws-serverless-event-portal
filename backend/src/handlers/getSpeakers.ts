import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getSpeakers handler triggered');

    const speakers = await dbService.listSpeakers();
    return buildResponse(200, speakers);
  } catch (error: any) {
    logger.error('Error in getSpeakers handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach dien gia. Vui long thu lai sau.');
  }
};
