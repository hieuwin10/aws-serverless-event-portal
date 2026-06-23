import { dbService } from '../services/dbService';
import { logger } from './logger';

export const writeAuditLogSafely = async (input: {
  action: string;
  actorId?: string;
  actorEmail?: string;
  resourceType: string;
  resourceId: string;
  details?: any;
}): Promise<void> => {
  try {
    await dbService.createAuditLog(input);
  } catch (error) {
    logger.error('Unable to write audit log', error);
  }
};
