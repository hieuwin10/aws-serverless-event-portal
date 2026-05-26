import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('deleteEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Bạn không có quyền thực hiện hành động này. Yêu cầu nhóm quyền Admin.');
    }

    const pathParams = event.pathParameters || {};
    const id = pathParams.id;

    if (!id) {
      return buildResponse(400, null, 'Thiếu ID sự kiện trong yêu cầu.');
    }

    const pk = `EVENT#${id}`;
    const sk = 'METADATA';
    const existingEvent = await dbService.getItem(pk, sk);

    if (!existingEvent) {
      return buildResponse(404, null, `Không tìm thấy sự kiện với ID: ${id}`);
    }

    await dbService.deleteEvent(id);
    return buildResponse(200, { message: `Đã xóa thành công sự kiện ${id} cùng tất cả lượt đăng ký.` });
  } catch (error: any) {
    logger.error('Error in deleteEvent handler', error);
    return buildResponse(500, null, 'Không thể xóa sự kiện. Vui lòng thử lại sau.');
  }
};
