import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from '../utils/logger';

export interface UserClaims {
  sub: string; // Cognito User ID
  email: string;
  groups: string[]; // ['Admin', 'Organizer', 'User']
}

/**
 * Extract and parse user claims from Cognito JWT in API Gateway authorizer context
 */
export const getUserClaims = (event: APIGatewayProxyEvent): UserClaims | null => {
  try {
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      logger.warn('No authorizer claims found in request context');
      return null;
    }

    const userId = claims.sub;
    const email = claims.email || '';
    const groupsString = claims['cognito:groups'] || '';
    const groups = typeof groupsString === 'string' 
      ? groupsString.split(',').map(g => g.trim())
      : Array.isArray(groupsString) 
        ? groupsString 
        : [];

    return {
      sub: userId,
      email,
      groups
    };
  } catch (error) {
    logger.error('Error extracting user claims', error);
    return null;
  }
};

/**
 * Check if user has Admin role
 */
export const isAdmin = (claims: UserClaims | null): boolean => {
  return claims?.groups?.includes('Admin') || false;
};

/**
 * Check if user has Organizer role
 */
export const isOrganizer = (claims: UserClaims | null): boolean => {
  return claims?.groups?.includes('Organizer') || false;
};

/**
 * Check if user has Admin or Organizer role
 */
export const isAdminOrOrganizer = (claims: UserClaims | null): boolean => {
  return isAdmin(claims) || isOrganizer(claims);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (claims: UserClaims | null): boolean => {
  return claims !== null && !!claims.sub;
};
