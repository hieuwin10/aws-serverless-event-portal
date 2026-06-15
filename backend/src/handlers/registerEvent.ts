import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { buildEventKeys, dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { writeAuditLogSafely } from '../utils/auditLogger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('registerEvent handler triggered');
    
    // Check Authorization
    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    
    const userId = claims?.sub || claims?.userId;
    const email = claims?.email;

    if (!userId || !email) {
      return buildResponse(401, null, 'Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ Ä‘Äƒng kÃ½ tham gia sá»± kiá»‡n.');
    }

    const pathParams = event.pathParameters || {};
    const id = pathParams.id; // EventId

    if (!id) {
      return buildResponse(400, null, 'Thiáº¿u ID sá»± kiá»‡n trong yÃªu cáº§u.');
    }

    // 1. Check if event exists
    const eventKeys = buildEventKeys(id);
    const eventMeta = await dbService.getItem(eventKeys.PK, eventKeys.SK);
    if (!eventMeta) {
      return buildResponse(404, null, 'KhÃ´ng tÃ¬m tháº¥y sá»± kiá»‡n.');
    }

    const existingUser = await dbService.getUserById(userId);
    if (!existingUser) {
      await dbService.createUserItem({
        userId,
        email,
        fullName: claims?.name || claims?.fullName || email,
        role: claims?.role || 'User'
      });
    }

    // 2. Check if already registered
    const existingReg = await dbService.getRegistrationByUserAndEvent(userId, id);
    if (existingReg) {
      return buildResponse(400, null, 'Báº¡n Ä‘Ã£ Ä‘Äƒng kÃ½ tham gia sá»± kiá»‡n nÃ y rá»“i.');
    }

    // 3. Check seats
    const totalSeats = Number(eventMeta.totalSeats || 0);
    const registeredCount =
      eventMeta.registeredCount !== undefined
        ? Number(eventMeta.registeredCount || 0)
        : Math.max(0, totalSeats - Number(eventMeta.remainingSeats || 0));
    const remainingSeats =
      eventMeta.remainingSeats !== undefined
        ? Number(eventMeta.remainingSeats || 0)
        : Math.max(0, totalSeats - registeredCount);

    if (remainingSeats <= 0 || registeredCount >= totalSeats) {
      return buildResponse(400, null, 'Ráº¥t tiáº¿c! Sá»± kiá»‡n nÃ y Ä‘Ã£ háº¿t vÃ© trá»‘ng tham gia.');
    }

    const ticketId = 'GENERAL';
    await dbService.listTicketsByEvent(id);

    // 4. Generate registration and ticketCode
    const registrationId = `reg_${uuidv4()}`;
    const eventPrefix = id.slice(4, 8).toUpperCase();
    const userSuffix = userId.slice(-4).toUpperCase();
    const ticketCode = `TKT-AWS-${eventPrefix}-${userSuffix}`;
    const registeredAt = new Date().toISOString();

    const newRegistration = await dbService.createRegistrationItem({
      registrationId,
      userId,
      eventId: id,
      email,
      registeredAt,
      ticketCode,
      ticketId
    });

    // Decrement remaining seats and keep compatibility counters in sync
    await dbService.decrementRemainingSeats(id);
    await dbService.decrementTicketRemainingQuantity(id, ticketId);

    await writeAuditLogSafely({
      action: 'REGISTER_EVENT',
      actorId: userId,
      actorEmail: email,
      resourceType: 'REGISTRATION',
      resourceId: registrationId,
      details: {
        eventId: id,
        ticketId
      }
    });

    return buildResponse(200, {
      registrationId: newRegistration.registrationId,
      eventId: newRegistration.eventId,
      userId: newRegistration.userId,
      email: newRegistration.email,
      registeredAt: newRegistration.registeredAt,
      ticketCode: newRegistration.ticketCode
    });
  } catch (error: any) {
    logger.error('Error in registerEvent handler', error);
    return buildResponse(500, null, 'KhÃ´ng thá»ƒ hoÃ n táº¥t Ä‘Äƒng kÃ½ sá»± kiá»‡n. Vui lÃ²ng thá»­ láº¡i sau.');
  }
};
