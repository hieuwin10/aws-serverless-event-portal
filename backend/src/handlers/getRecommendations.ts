import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';
import { getUserClaims, isAuthenticated } from '../services/authService';

interface RecommendationEvent {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  location: string;
  imageUrl: string;
  totalSeats: number;
  registeredCount: number;
}

interface ScoredRecommendationEvent extends RecommendationEvent {
  recommendationScore: number;
}

/**
 * GET /events/recommendations
 * Lấy danh sách sự kiện được đề xuất cá nhân hóa dựa trên lịch sử đăng ký của user
 * Yêu cầu xác thực Cognito JWT
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getRecommendations handler triggered');

    // 1. Xác thực người dùng
    const userClaims = getUserClaims(event);
    if (!userClaims || !isAuthenticated(userClaims)) {
      return buildResponse(401, null, 'Bạn cần đăng nhập để xem đề xuất cá nhân hóa');
    }

    // 2. Lấy lịch sử đăng ký của user
    const userRegistrations = await dbService.getUserRegistrations(userClaims.sub);
    
    // 3. Phân tích categories mà user quan tâm
    const categoryFrequency: Record<string, number> = {};
    userRegistrations.forEach((reg: any) => {
      if (reg.event?.category) {
        categoryFrequency[reg.event.category] = (categoryFrequency[reg.event.category] || 0) + 1;
      }
    });

    // Sắp xếp categories theo độ ưu tiên
    const preferredCategories = Object.entries(categoryFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    logger.info(`User ${userClaims.sub} preferred categories:`, preferredCategories);

    // 4. Lấy tất cả sự kiện
    const allEvents = await dbService.listEvents() as RecommendationEvent[];

    // 5. Lọc bỏ các sự kiện đã đăng ký
    const registeredEventIds = new Set(
      userRegistrations.map((reg: any) => reg.eventId)
    );

    const availableEvents = allEvents.filter((evt: RecommendationEvent) =>
      !registeredEventIds.has(evt.id)
    );

    // 6. Scoring & ranking recommendations
    const scoredEvents: ScoredRecommendationEvent[] = availableEvents.map((evt: RecommendationEvent) => {
      let score = 0;

      // Điểm theo category preference
      if (preferredCategories.length > 0) {
        const categoryIndex = preferredCategories.indexOf(evt.category);
        if (categoryIndex !== -1) {
          score += (preferredCategories.length - categoryIndex) * 10; // Category match
        }
      }

      // Điểm theo thời gian (sự kiện sắp diễn ra)
      const eventDate = new Date(evt.date);
      const now = new Date();
      const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilEvent > 0 && daysUntilEvent < 30) {
        score += 5; // Upcoming events bonus
      }

      // Điểm theo độ phổ biến (số lượng đăng ký)
      if (evt.registeredCount > 50) {
        score += 3; // Popular event bonus
      }

      // Điểm theo số chỗ còn trống
      const availableSeats = evt.totalSeats - evt.registeredCount;
      if (availableSeats > 0 && availableSeats < evt.totalSeats * 0.3) {
        score += 2; // Limited seats bonus (tạo urgency)
      }

      return {
        ...evt,
        recommendationScore: score
      };
    });

    // 7. Sắp xếp theo điểm và lấy top 10
    const recommendations = scoredEvents
      .sort((a: ScoredRecommendationEvent, b: ScoredRecommendationEvent) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10)
      .map((evt: ScoredRecommendationEvent) => {
        // Remove internal scoring field before returning
        const { recommendationScore, ...eventData } = evt;
        return eventData;
      });

    logger.info(`Generated ${recommendations.length} recommendations for user ${userClaims.sub}`);

    // 8. Trả về kết quả
    return buildResponse(200, {
      recommendations,
      message: recommendations.length > 0 
        ? 'Dựa trên sở thích của bạn, chúng tôi đề xuất những sự kiện sau:'
        : 'Hiện chưa có đề xuất phù hợp. Hãy khám phá các sự kiện mới!'
    });

  } catch (error: any) {
    logger.error('Error in getRecommendations handler', error);
    return buildResponse(500, null, 'Không thể tải đề xuất lúc này. Vui lòng thử lại sau.');
  }
};
