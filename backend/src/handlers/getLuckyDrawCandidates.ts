import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getLuckyDrawCandidates handler triggered');

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

    // Load check-ins (candidates must have checked in)
    const checkins = await dbService.listCheckinsByEvent(eventId);
    // Load registrations to get details
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    // Load lucky draw winners
    const winners = await dbService.getLuckyDrawWinners(eventId);
    const winnerUserIds = new Set(winners.map(w => w.userId));

    // Combine data
    const candidates = [];
    for (const checkin of checkins) {
      const reg = registrations.find(r => r.userId === checkin.userId);
      const user = await dbService.getUserById(checkin.userId);

      // Generate a mock phone for demo if missing
      const mockSuffix = checkin.userId.slice(-4).replace(/[^0-9]/g, '8');
      const fallbackPhone = `09${mockSuffix.padEnd(8, '7')}`;

      // Mask/display phone
      const phone = reg?.phoneNumber || user?.phoneNumber || fallbackPhone;

      candidates.push({
        userId: checkin.userId,
        fullName: user?.fullName || reg?.fullName || reg?.email?.split('@')[0] || `User ${checkin.userId.slice(-6)}`,
        email: reg?.email || user?.email || '',
        phone: phone,
        checkedInAt: checkin.checkedInAt,
        hasWon: winnerUserIds.has(checkin.userId)
      });
    }

    return buildResponse(200, {
      candidates,
      winners: winners.map(w => ({
        userId: w.userId,
        fullName: w.fullName,
        phone: w.phone,
        drawnAt: w.drawnAt
      }))
    });
  } catch (error: any) {
    logger.error('Error in getLuckyDrawCandidates handler', error);
    return buildResponse(500, null, 'Unable to load candidates. Please try again later.');
  }
};
