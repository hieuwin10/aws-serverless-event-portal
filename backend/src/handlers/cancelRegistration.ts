import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAuthenticated } from '../services/authService';
import { randomUUID } from 'crypto';

/**
 * DELETE /events/{id}/register
 * Hủy đăng ký vé tham gia sự kiện. Nếu có người trong danh sách chờ, tự động đôn họ lên.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('cancelRegistration handler triggered');

    const userClaims = getUserClaims(event);
    if (!userClaims || !isAuthenticated(userClaims)) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để hủy đăng ký tham gia sự kiện.');
    }

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện trong yêu cầu.');
    }

    const userId = userClaims.sub;

    // 1. Kiểm tra thông tin đăng ký hiện tại
    const registration = await dbService.getRegistrationByUserAndEvent(userId, eventId);
    if (!registration) {
      return buildResponse(404, null, 'Không tìm thấy thông tin đăng ký của bạn cho sự kiện này.');
    }

    // 2. Thực hiện xóa đăng ký trong database
    await dbService.deleteRegistration(userId, eventId);

    // 3. Giải phóng chỗ trống
    await dbService.incrementRemainingSeats(eventId);
    await dbService.incrementTicketRemainingQuantity(eventId, 'GENERAL');

    logger.info(`User ${userId} cancelled registration for event ${eventId}`);

    // 4. Tự động hóa Waitlist
    const waitlist = await dbService.getEventWaitlist(eventId);
    const waitingEntry = waitlist.find((entry: any) => entry.status === 'WAITING' || entry.SK?.startsWith('WAITLIST#'));

    if (waitingEntry) {
      logger.info(`Promoting user ${waitingEntry.userId} from waitlist for event ${eventId}`);

      const newRegId = `reg_${randomUUID()}`;
      const eventPrefix = eventId.slice(4, 8).toUpperCase();
      const userSuffix = waitingEntry.userId.slice(-4).toUpperCase();
      const ticketCode = `TKT-AWS-${eventPrefix}-${userSuffix}`;
      const registeredAt = new Date().toISOString();

      await dbService.createRegistrationItem({
        registrationId: newRegId,
        userId: waitingEntry.userId,
        eventId,
        email: waitingEntry.userEmail || `${waitingEntry.userId}@example.com`,
        registeredAt,
        ticketCode,
        ticketId: 'GENERAL'
      });

      // Giảm lại chỗ trống vừa được phân phối
      await dbService.decrementRemainingSeats(eventId);
      await dbService.decrementTicketRemainingQuantity(eventId, 'GENERAL');

      // Xóa waitlist entry cũ để tránh đôn trùng lặp
      if (waitingEntry.SK) {
        await dbService.deleteItem(waitingEntry.PK, waitingEntry.SK);
      }

      logger.info(`Successfully promoted user ${waitingEntry.userId} from waitlist.`);
    }

    return buildResponse(200, {
      message: 'Hủy đăng ký vé sự kiện thành công.'
    });

  } catch (error: any) {
    logger.error('Error in cancelRegistration handler', error);
    return buildResponse(500, null, 'Không thể hủy đăng ký vé lúc này. Vui lòng thử lại sau.');
  }
};
