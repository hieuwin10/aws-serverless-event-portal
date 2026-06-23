import { dbService } from '../services/dbService';
import { logger } from './logger';

export const createNotificationSafely = async (input: {
  userId: string;
  title: string;
  message: string;
  type?: string;
}): Promise<void> => {
  try {
    await dbService.createNotificationItem(input);
  } catch (error) {
    logger.error('Unable to create notification', error);
  }
};
