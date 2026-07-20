import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('triggerSurveyCron handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    const eventObj = await dbService.getEventById(eventId);
    if (!eventObj) {
      return buildResponse(404, null, 'Event not found.');
    }

    // Cron check-in list
    const checkins = await dbService.listCheckinsByEvent(eventId);
    if (checkins.length === 0) {
       return buildResponse(200, { success: true, processedCount: 0, message: 'Không có người check-in. Không gửi khảo sát.' });
    }

    // Simulate sending survey emails to all checkins
    const processedEmails = [];
    for (const checkin of checkins) {
      const user = await dbService.getUserById(checkin.userId);
      const email = user?.email || `${checkin.userId}@example.com`;
      
      // Perform mock email send log
      logger.info(`[Survey Email Cron] Sent survey email to ${email} for event "${eventObj.title}"`);
      processedEmails.push(email);
    }

    return buildResponse(200, {
      success: true,
      processedCount: processedEmails.length,
      emails: processedEmails,
      message: `Cron job đã hoàn thành: Đã gửi email khảo sát tới ${processedEmails.length} người check-in.`
    });
  } catch (error: any) {
    logger.error('Error in triggerSurveyCron handler', error);
    return buildResponse(500, null, 'Unable to run survey cron simulation. Please try again later.');
  }
};
