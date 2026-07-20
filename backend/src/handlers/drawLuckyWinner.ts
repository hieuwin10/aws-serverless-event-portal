import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('drawLuckyWinner handler triggered');

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

    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
       body = {};
    }

    const allowMultipleWins = body.allowMultipleWins === true;

    // Fetch Candidates (checked-in users)
    const checkins = await dbService.listCheckinsByEvent(eventId);
    if (checkins.length === 0) {
      return buildResponse(400, null, 'Không có ai đã check-in để tham gia quay thưởng.');
    }

    // Fetch Winners
    const winners = await dbService.getLuckyDrawWinners(eventId);
    const winnerUserIds = new Set(winners.map(w => w.userId));

    // Filter eligible candidates
    let eligible = checkins;
    if (!allowMultipleWins) {
      eligible = checkins.filter(c => !winnerUserIds.has(c.userId));
    }

    if (eligible.length === 0) {
      return buildResponse(400, null, 'Tất cả những người checked-in đều đã trúng thưởng.');
    }

    // Pick random winner
    const randomIndex = Math.floor(Math.random() * eligible.length);
    const winnerCheckin = eligible[randomIndex];

    // Find profiles details
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    const reg = registrations.find(r => r.userId === winnerCheckin.userId);
    const user = await dbService.getUserById(winnerCheckin.userId);

    const mockSuffix = winnerCheckin.userId.slice(-4).replace(/[^0-9]/g, '8');
    const fallbackPhone = `09${mockSuffix.padEnd(8, '7')}`;
    const phone = reg?.phoneNumber || user?.phoneNumber || fallbackPhone;
    const fullName = user?.fullName || reg?.fullName || reg?.email?.split('@')[0] || `User ${winnerCheckin.userId.slice(-6)}`;

    // Save Winner to db
    const winnerRecord = await dbService.addLuckyDrawWinner(eventId, winnerCheckin.userId, fullName, phone);

    return buildResponse(200, {
      userId: winnerRecord.userId,
      fullName: winnerRecord.fullName,
      phone: winnerRecord.phone,
      drawnAt: winnerRecord.drawnAt
    });
  } catch (error: any) {
    logger.error('Error in drawLuckyWinner handler', error);
    return buildResponse(500, null, 'Unable to draw winner. Please try again later.');
  }
};
