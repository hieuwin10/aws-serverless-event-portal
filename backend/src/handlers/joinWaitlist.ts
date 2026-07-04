import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAuthenticated } from '../services/authService';

/**
 * POST /events/{id}/waitlist
 * Đăng ký vào danh sách chờ khi sự kiện hết vé
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('joinWaitlist handler triggered');

    // 1. Xác thực người dùng
    const userClaims = getUserClaims(event);
    if (!userClaims || !isAuthenticated(userClaims)) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để tham gia danh sách chờ');
    }

    // 2. Lấy eventId từ path parameters
    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện');
    }

    // 3. Kiểm tra sự kiện có tồn tại không
    const eventPK = `EVENT#${eventId}`;
    const eventData = await dbService.getItem(eventPK, 'METADATA');
    if (!eventData) {
      return buildResponse(404, null, 'Không tìm thấy sự kiện');
    }

    // 4. Kiểm tra user đã đăng ký hoặc trong waitlist chưa
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    const alreadyRegistered = registrations.some((reg: any) => 
      reg.SK === `USER#${userClaims.sub}`
    );

    if (alreadyRegistered) {
      return buildResponse(400, null, 'Bạn đã đăng ký sự kiện này rồi');
    }

    // Kiểm tra đã trong waitlist chưa (scan items with SK begins_with WAITLIST#)
    // Trong production, nên dùng query hoặc GSI
    const existingWaitlist = registrations.filter((item: any) => 
      item.SK?.startsWith('WAITLIST#') && item.userId === userClaims.sub
    );

    if (existingWaitlist.length > 0) {
      return buildResponse(400, null, 'Bạn đã có trong danh sách chờ rồi');
    }

    // 5. Thêm vào danh sách chờ
    const timestamp = Date.now();
    const waitlistEntry = {
      PK: eventPK,
      SK: `WAITLIST#${timestamp}`,
      GSI2PK: `USER#${userClaims.sub}`,
      GSI2SK: eventPK,
      eventId,
      userId: userClaims.sub,
      userEmail: userClaims.email,
      joinedAt: new Date().toISOString(),
      timestamp,
      autoEnroll: true, // Tự động chuyển thành registration khi có chỗ trống
      status: 'WAITING'
    };

    await dbService.putItem(waitlistEntry);

    logger.info(`User ${userClaims.sub} joined waitlist for event ${eventId}`);

    // 6. Trả về kết quả
    return buildResponse(200, {
      message: 'Đã thêm bạn vào danh sách chờ. Chúng tôi sẽ thông báo khi có chỗ trống.',
      waitlistEntry: {
        eventId,
        eventTitle: eventData.title,
        joinedAt: waitlistEntry.joinedAt,
        position: 'Đang xử lý...' // Có thể tính position bằng cách đếm số waitlist entries trước đó
      }
    });

  } catch (error: any) {
    logger.error('Error in joinWaitlist handler', error);
    return buildResponse(500, null, 'Không thể thêm vào danh sách chờ lúc này. Vui lòng thử lại sau.');
  }
};
