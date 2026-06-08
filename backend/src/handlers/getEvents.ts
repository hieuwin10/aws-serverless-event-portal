import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEvents handler triggered');
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category;
    const search = queryParams.search;

    const events = category
      ? await dbService.scanEvents(category, search)
      : await dbService.listEvents(search);
    return buildResponse(200, events);
  } catch (error: any) {
    logger.error('Error in getEvents handler', error);
    return buildResponse(500, null, 'Không thể tải danh sách sự kiện lúc này. Vui lòng thử lại sau.');
  }
};
