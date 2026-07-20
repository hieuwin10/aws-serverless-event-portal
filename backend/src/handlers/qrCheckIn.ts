import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAdminOrOrganizer } from '../services/authService';

/**
 * POST /events/{id}/checkin
 * Điểm danh người tham gia sự kiện (qua QR code hoặc thủ công)
 * Chỉ Admin/Organizer mới có quyền thực hiện
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('qrCheckIn handler triggered');

    // 1. Xác thực quyền Admin/Organizer
    const userClaims = getUserClaims(event);
    if (!userClaims || !isAdminOrOrganizer(userClaims)) {
      return buildResponse(403, null, 'Bạn không có quyền thực hiện điểm danh. Yêu cầu nhóm quyền Admin hoặc Organizer.');
    }

    // 2. Lấy eventId từ path parameters
    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện');
    }

    // 3. Parse request body
    const body = JSON.parse(event.body || '{}');
    const { ticketCode, manualOverride = false } = body;

    if (!ticketCode) {
      return buildResponse(400, null, 'Thiếu mã vé (ticketCode)');
    }

    // 4. Tìm registration theo ticketCode
    // Trong mock mode, scan để tìm registration có ticketCode matching
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    const registration = registrations.find((reg: any) => reg.ticketCode === ticketCode);

    if (!registration) {
      return buildResponse(404, null, 'Không tìm thấy đăng ký với mã vé này cho sự kiện này');
    }

    // 5. Kiểm tra đã check-in chưa
    if (registration.checkedIn) {
      return buildResponse(400, null, 'Người tham gia này đã điểm danh trước đó');
    }

    // 6. Thực hiện check-in
    const checkinTime = new Date().toISOString();
    const updatedReg = {
      ...registration,
      checkedIn: true,
      checkedInAt: checkinTime,
      checkedInBy: userClaims.sub,
      manualOverride
    };

    await dbService.putItem(updatedReg);

    // 7. Cộng loyalty points cho user (10 points)
    const loyaltyPoints = 10;
    logger.info(`Adding ${loyaltyPoints} loyalty points to user ${registration.userId}`);
    await dbService.incrementUserLoyaltyPoints(registration.userId, loyaltyPoints);

    // 8. Trả về kết quả thành công
    return buildResponse(200, {
      status: 'CHECKED_IN',
      message: `Hợp lệ. Đã cộng ${loyaltyPoints} Loyalty Points cho user.`,
      checkedInAt: checkinTime,
      registration: updatedReg
    });

  } catch (error: any) {
    logger.error('Error in qrCheckIn handler', error);
    return buildResponse(500, null, 'Không thể thực hiện điểm danh lúc này. Vui lòng thử lại sau.');
  }
};
