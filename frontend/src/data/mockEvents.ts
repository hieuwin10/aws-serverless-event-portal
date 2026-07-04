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
    title: 'AWS Community Day 2026',
    description: 'A full-day community event with cloud architecture talks, hands-on demos, and student project showcases.',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
    location: 'Ho Chi Minh City Campus',
    date: futureDate(12, 9),
    organizer: 'AWS Vietnam User Group',
    category: 'technology',
    totalSeats: 300,
    registeredCount: 214,
    availableSeats: 86
  },
  {
    id: 'mock-serverless-workshop',
    title: 'Serverless Workshop',
    description: 'Build an event registration API with Lambda, API Gateway, DynamoDB, and Cognito in one practical workshop.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
    location: 'Online - Zoom',
    date: futureDate(18, 14),
    organizer: 'Serverless Saigon',
    category: 'education',
    totalSeats: 180,
    registeredCount: 92,
    availableSeats: 88
  },
  {
    id: 'mock-dynamodb-hands-on-lab',
    title: 'DynamoDB Hands-on Lab',
    description: 'Learn single-table design, GSIs, access patterns, and local mock testing with guided exercises.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
    location: 'Hanoi Event Hall',
    date: futureDate(24, 13),
    organizer: 'Cloud Database Lab',
    category: 'education',
    totalSeats: 120,
    registeredCount: 76,
    availableSeats: 44
  },
  {
    id: 'mock-ai-voice-agents-conference',
    title: 'AI Voice Agents Conference',
    description: 'Explore GenAI, voice automation, contact center use cases, and real-time serverless integrations.',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80',
    location: 'Da Nang Innovation Hub',
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
    description: 'A focused meetup on IAM, least privilege, serverless security, logging, and incident readiness.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1600&q=80',
    location: 'Cybersecurity Center HCMC',
    date: futureDate(38, 18),
    organizer: 'Cloud Security Circle',
    category: 'technology',
    totalSeats: 150,
    registeredCount: 109,
    availableSeats: 41
  },
  {
    id: 'mock-aws-genai-bootcamp',
    title: 'AWS GenAI Bootcamp',
    description: 'A beginner-friendly bootcamp on prompt workflows, Bedrock concepts, and event-driven AI apps.',
    imageUrl: 'https://images.unsplash.com/photo-1684369175809-f9642140a7a3?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1684369175809-f9642140a7a3?auto=format&fit=crop&w=1600&q=80',
    location: 'University Tech Lab',
    date: futureDate(45, 8),
    organizer: 'AWS Student Club',
    category: 'education',
    totalSeats: 200,
    registeredCount: 132,
    availableSeats: 68
  },
  {
    id: 'mock-devops-night',
    title: 'DevOps Night',
    description: 'Lightning talks and demos about CI/CD, GitHub Actions, observability, and deployment automation.',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
    location: 'Tech Community Space',
    date: futureDate(52, 19),
    organizer: 'DevOps Vietnam',
    category: 'technology',
    totalSeats: 160,
    registeredCount: 118,
    availableSeats: 42
  },
  {
    id: 'mock-startup-cloud-summit',
    title: 'Startup Cloud Summit',
    description: 'A founder-focused summit about cloud cost optimization, scaling, serverless MVPs, and startup architecture.',
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
