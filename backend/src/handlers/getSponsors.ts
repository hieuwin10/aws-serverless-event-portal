import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getSponsors handler triggered');

    const sponsors = await dbService.listSponsors();
    return buildResponse(200, sponsors);
  } catch (error: any) {
    logger.error('Error in getSponsors handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach nha tai tro. Vui long thu lai sau.');
  }
};
