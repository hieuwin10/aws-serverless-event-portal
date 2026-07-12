import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAdminOrOrganizer } from '../services/authService';

/**
 * POST /events/{id}/checkout
 * Check-out attendee after they have already checked in.
 * Only Admin/Organizer can perform this action.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('checkoutEvent handler triggered');

    const userClaims = getUserClaims(event);
    if (!userClaims || !isAdminOrOrganizer(userClaims)) {
      return buildResponse(403, null, 'Ban khong co quyen thuc hien check-out.');
    }

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thieu ID su kien');
    }

    const body = JSON.parse(event.body || '{}');
    const { ticketCode, manualOverride = false } = body;

    if (!ticketCode) {
      return buildResponse(400, null, 'Thieu ma ve (ticketCode)');
    }

    const normalizedTicketCode = String(ticketCode).trim().toUpperCase();
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    const registration = registrations.find(
      (reg: any) => String(reg.ticketCode || '').trim().toUpperCase() === normalizedTicketCode
    );

    if (!registration) {
      return buildResponse(404, null, 'Khong tim thay dang ky voi ma ve nay cho su kien nay');
    }

    if (!registration.checkedIn) {
      return buildResponse(400, null, 'Nguoi tham du chua check-in nen chua the check-out.');
    }

    if (registration.checkedOut) {
      return buildResponse(400, null, 'Nguoi tham du nay da check-out truoc do.');
    }

    const checkedOutAt = new Date().toISOString();
    const updatedReg = {
      ...registration,
      checkedOut: true,
      checkedOutAt,
      checkedOutBy: userClaims.sub,
      manualOverride
    };

    await dbService.putItem(updatedReg);

    return buildResponse(200, {
      status: 'CHECKED_OUT',
      message: 'Check-out thanh cong cho nguoi tham du.',
      checkedOutAt,
      registration: updatedReg
    });
  } catch (error: any) {
    logger.error('Error in checkoutEvent handler', error);
    return buildResponse(500, null, 'Khong the thuc hien check-out luc nay. Vui long thu lai sau.');
  }
};
