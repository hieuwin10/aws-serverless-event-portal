import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getCategories handler triggered');

    const categories = await dbService.listCategories();
    return buildResponse(200, categories);
  } catch (error: any) {
    logger.error('Error in getCategories handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach danh muc. Vui long thu lai sau.');
  }
};
