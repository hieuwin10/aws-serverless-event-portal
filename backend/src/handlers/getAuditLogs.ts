import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getAuditLogs handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const date = event.queryStringParameters?.date;
    const auditLogs = date
      ? await dbService.listAuditLogsByDate(date)
      : await dbService.listAuditLogs();

    return buildResponse(200, auditLogs);
  } catch (error: any) {
    logger.error('Error in getAuditLogs handler', error);
    return buildResponse(500, null, 'Unable to load audit logs. Please try again later.');
  }
};
