import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getOrganizers handler triggered');

    const organizers = await dbService.listOrganizers();
    return buildResponse(200, organizers);
  } catch (error: any) {
    logger.error('Error in getOrganizers handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach don vi to chuc. Vui long thu lai sau.');
  }
};
