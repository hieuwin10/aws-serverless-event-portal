import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getEventById handler triggered');
    const pathParams = event.pathParameters || {};
    const id = pathParams.id;

    if (!id) {
      return buildResponse(400, null, 'Thiếu ID sự kiện trong yêu cầu.');
    }

    const pk = `EVENT#${id}`;
    const sk = 'METADATA';
    const eventData = await dbService.getItem(pk, sk);

    if (!eventData) {
      return buildResponse(404, null, `Không tìm thấy sự kiện với ID: ${id}`);
    }

    return buildResponse(200, eventData);
  } catch (error: any) {
    logger.error('Error in getEventById handler', error);
    return buildResponse(500, null, 'Không thể tải chi tiết sự kiện. Vui lòng thử lại sau.');
  }
};
