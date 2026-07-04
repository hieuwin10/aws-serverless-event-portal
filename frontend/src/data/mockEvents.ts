import type { Event } from '../context/EventContext';

export type MockEvent = Event & {
  organizer: string;
  availableSeats: number;
  banner: string;
};

const futureDate = (daysFromNow: number, hour = 9): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const mockEvents: MockEvent[] = [
  {
    id: 'mock-aws-community-day-2026',
    title: 'AWS Community Day 2026 - Ngày hội Cộng đồng AWS',
    description: 'Sự kiện cộng đồng trọn ngày với các bài chia sẻ kiến trúc cloud, demo thực hành và showcase dự án sinh viên.',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
    location: 'Cơ sở TP. Hồ Chí Minh',
    date: futureDate(12, 9),
    organizer: 'AWS Vietnam User Group',
    category: 'technology',
    totalSeats: 300,
    registeredCount: 214,
    availableSeats: 86
  },
  {
    id: 'mock-serverless-workshop',
    title: 'Workshop AWS Serverless',
    description: 'Xây dựng API đăng ký sự kiện với Lambda, API Gateway, DynamoDB và Cognito trong một buổi thực hành.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
    location: 'Trực tuyến - Zoom',
    date: futureDate(18, 14),
    organizer: 'Serverless Sài Gòn',
    category: 'education',
    totalSeats: 180,
    registeredCount: 92,
    availableSeats: 88
  },
  {
    id: 'mock-dynamodb-hands-on-lab',
    title: 'DynamoDB Hands-on Lab',
    description: 'Thực hành thiết kế single-table, GSI, access pattern và kiểm thử local mock qua bài lab có hướng dẫn.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
    location: 'Hội trường sự kiện Hà Nội',
    date: futureDate(24, 13),
    organizer: 'Cloud Database Lab',
    category: 'education',
    totalSeats: 120,
    registeredCount: 76,
    availableSeats: 44
  },
  {
    id: 'mock-ai-voice-agents-conference',
    title: 'Xây dựng AI Voice Agents',
    description: 'Khám phá GenAI, tự động hóa giọng nói, bài toán contact center và tích hợp serverless thời gian thực.',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80',
    location: 'Trung tâm Đổi mới sáng tạo Đà Nẵng',
    date: futureDate(31, 10),
    organizer: 'AI Builders Vietnam',
    category: 'technology',
    totalSeats: 240,
    registeredCount: 188,
    availableSeats: 52
  },
  {
    id: 'mock-cloud-security-meetup',
    title: 'Cloud Security Meetup',
    description: 'Buổi meetup về IAM, nguyên tắc least privilege, bảo mật serverless, logging và xử lý sự cố.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1600&q=80',
    location: 'Trung tâm An ninh mạng TP. Hồ Chí Minh',
    date: futureDate(38, 18),
    organizer: 'Cộng đồng Cloud Security',
    category: 'technology',
    totalSeats: 150,
    registeredCount: 109,
    availableSeats: 41
  },
  {
    id: 'mock-aws-genai-bootcamp',
    title: 'AWS GenAI Bootcamp',
    description: 'Bootcamp thân thiện cho người mới về prompt workflow, khái niệm Amazon Bedrock và ứng dụng AI hướng sự kiện.',
    imageUrl: 'https://images.unsplash.com/photo-1684369175809-f9642140a7a3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1684369175809-f9642140a7a3?auto=format&fit=crop&w=1600&q=80',
    location: 'Phòng lab công nghệ trường đại học',
    date: futureDate(45, 8),
    organizer: 'AWS Student Club',
    category: 'education',
    totalSeats: 200,
    registeredCount: 132,
    availableSeats: 68
  },
  {
    id: 'mock-devops-night',
    title: 'DevOps Night - Đêm CI/CD và Cloud',
    description: 'Các lightning talk và demo về CI/CD, GitHub Actions, observability và tự động hóa triển khai.',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
    location: 'Không gian cộng đồng công nghệ',
    date: futureDate(52, 19),
    organizer: 'DevOps Việt Nam',
    category: 'technology',
    totalSeats: 160,
    registeredCount: 118,
    availableSeats: 42
  },
  {
    id: 'mock-startup-cloud-summit',
    title: 'Startup Cloud Summit',
    description: 'Hội thảo dành cho startup về tối ưu chi phí cloud, scaling, serverless MVP và kiến trúc sản phẩm.',
    imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1600&q=80',
    location: 'Saigon Startup Hub',
    date: futureDate(60, 9),
    organizer: 'Startup Cloud Network',
    category: 'technology',
    totalSeats: 220,
    registeredCount: 154,
    availableSeats: 66
  }
];
