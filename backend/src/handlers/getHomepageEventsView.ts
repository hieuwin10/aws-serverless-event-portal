import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

const HOMEPAGE_EVENTS_VIEW = 'HOMEPAGE_EVENTS';

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('getHomepageEventsView handler triggered');

    const currentEpochSeconds = Math.floor(Date.now() / 1000);
    const existingView = await dbService.getMaterializedView(HOMEPAGE_EVENTS_VIEW);

    if (existingView && existingView.ttl > currentEpochSeconds) {
      return buildResponse(200, existingView.data);
    }

    const refreshedView = await dbService.refreshHomepageView();
    return buildResponse(200, refreshedView.data || []);
  } catch (error: any) {
    logger.error('Error in getHomepageEventsView handler', error);
    return buildResponse(500, null, 'Unable to load homepage events view. Please try again later.');
  }
};
