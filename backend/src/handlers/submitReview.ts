import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAuthenticated } from '../services/authService';

/**
 * POST /events/{id}/reviews
 * Viết đánh giá cho sự kiện (chỉ người đã check-in mới được đánh giá)
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('submitReview handler triggered');

    // 1. Xác thực người dùng
    const userClaims = getUserClaims(event);
    if (!userClaims || !isAuthenticated(userClaims)) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để viết đánh giá');
    }

    // 2. Lấy eventId từ path parameters
    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return buildResponse(400, null, 'Thiếu ID sự kiện');
    }

    // 3. Parse request body
    const body = JSON.parse(event.body || '{}');
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return buildResponse(400, null, 'Đánh giá phải từ 1 đến 5 sao');
    }

    // 4. Kiểm tra user đã đăng ký và check-in chưa
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    const userRegistration = registrations.find((reg: any) => 
      reg.userId === userClaims.sub || 
      (reg.GSI2SK && reg.GSI2SK === `USER#${userClaims.sub}`)
    );

    if (!userRegistration) {
      return buildResponse(403, null, 'Bạn chưa đăng ký sự kiện này');
    }

    if (!userRegistration.checkedIn) {
      return buildResponse(403, null, 'Chỉ người đã tham dự (check-in) mới được viết đánh giá');
    }

    // 5. Kiểm tra đã review chưa
    const pk = `EVENT#${eventId}`;
    const sk = `REVIEW#${userClaims.sub}`;
    const existingReview = await dbService.getItem(pk, sk);

    if (existingReview) {
      return buildResponse(400, null, 'Bạn đã viết đánh giá cho sự kiện này rồi');
    }

    // 6. Tạo review mới
    const review = {
      PK: pk,
      SK: sk,
      GSI1PK: `USER#${userClaims.sub}`,
      GSI1SK: `REVIEW#${eventId}`,
      eventId,
      userId: userClaims.sub,
      userEmail: userClaims.email,
      rating,
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    await dbService.putItem(review);

    logger.info(`Review submitted for event ${eventId} by user ${userClaims.sub}`);

    // 7. Trả về kết quả
    return buildResponse(201, {
      message: 'Cảm ơn bạn đã đánh giá sự kiện!',
      review
    });

  } catch (error: any) {
    logger.error('Error in submitReview handler', error);
    return buildResponse(500, null, 'Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.');
  }
};
