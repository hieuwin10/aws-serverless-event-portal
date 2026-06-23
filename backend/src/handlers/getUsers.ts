import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getUsers handler triggered');

    const users = await dbService.listUsers();
    return buildResponse(200, users);
  } catch (error: any) {
    logger.error('Error in getUsers handler', error);
    return buildResponse(500, null, 'Khong the tai danh sach nguoi dung. Vui long thu lai sau.');
  }
};
