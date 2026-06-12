import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getLocations handler triggered');

    const locations = await dbService.listLocations();
    return buildResponse(200, locations);
  } catch (error: any) {
    logger.error('Error in getLocations handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach dia diem. Vui long thu lai sau.');
  }
};
