import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('updateEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = typeof userGroups === 'string' ? userGroups.includes('Admin') : (Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin');

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Bạn không có quyền thực hiện hành động này. Yêu cầu nhóm quyền Admin.');
    }

    const pathParams = event.pathParameters || {};
    const id = pathParams.id;

    if (!id) {
      return buildResponse(400, null, 'Thiếu ID sự kiện trong yêu cầu.');
    }

    if (!event.body) {
      return buildResponse(400, null, 'Thiếu dữ liệu cập nhật.');
    }

    const pk = `EVENT#${id}`;
    const sk = 'METADATA';
    const existingEvent = await dbService.getItem(pk, sk);

    if (!existingEvent) {
      return buildResponse(404, null, `Không tìm thấy sự kiện với ID: ${id}`);
    }

    const body = JSON.parse(event.body);
    const updatedEvent = {
      ...existingEvent,
      ...body,
      PK: pk, // Ensure PK/SK and ID remain unchanged
      SK: sk,
      id
    };

    await dbService.putItem(updatedEvent);
    return buildResponse(200, updatedEvent);
  } catch (error: any) {
    logger.error('Error in updateEvent handler', error);
    return buildResponse(500, null, 'Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
  }
};
