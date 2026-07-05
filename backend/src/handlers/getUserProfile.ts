import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAuthenticated } from '../services/authService';

/**
 * GET /users/profile
 * Lấy thông tin hồ sơ người dùng hiện tại từ DynamoDB bao gồm cả loyaltyPoints
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getUserProfile handler triggered');

    const userClaims = getUserClaims(event);
    if (!userClaims || !isAuthenticated(userClaims)) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để xem thông tin hồ sơ.');
    }

    const userId = userClaims.sub;
    const email = userClaims.email;

    let user = await dbService.getUserById(userId);
    if (!user) {
      const role = userClaims.groups.includes('Admin') ? 'Admin' : (userClaims.groups.includes('Organizer') ? 'Organizer' : 'User');
      user = await dbService.createUserItem({
        userId,
        email,
        fullName: email.split('@')[0] || email,
        role
      });
    }

    return buildResponse(200, user);
  } catch (error: any) {
    logger.error('Error in getUserProfile handler', error);
    return buildResponse(500, null, 'Không thể tải thông tin hồ sơ lúc này.');
  }
};
