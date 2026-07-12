import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { dbService, mapPaymentItemToDto } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('createRegistrationPayment handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userId = claims?.sub || claims?.userId;

    if (!userId) {
      return buildResponse(401, null, 'User must be logged in to create a payment.');
    }

    const registrationId = event.pathParameters?.registrationId;
    if (!registrationId) {
      return buildResponse(400, null, 'Missing registration id.');
    }

    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return buildResponse(400, null, 'Invalid request body.');
    }

    const registrations = await dbService.getUserRegistrations(userId);
    const registration = registrations.find(item => item.registrationId === registrationId);
    if (!registration) {
      return buildResponse(404, null, 'Registration not found.');
    }

    const existingPayments = await dbService.listPaymentsByRegistration(registrationId);
    const hasActivePayment = existingPayments.some(p => ['PENDING', 'SUCCESS'].includes(String(p.state || '').toUpperCase()));
    if (hasActivePayment) {
      return buildResponse(400, null, 'Thanh toán cho mã đăng ký này đang xử lý hoặc đã được hoàn tất trước đó.');
    }

    const amount = body.amount === undefined || body.amount === null ? 0 : Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return buildResponse(400, null, 'Amount must be a non-negative number.');
    }

    const transactionId = body.transactionId ? String(body.transactionId) : `txn_${uuidv4()}`;
    const payment = await dbService.createPaymentItem({
      paymentId: `pay_${uuidv4()}`,
      registrationId,
      userId,
      eventId: registration.eventId || '',
      amount,
      currency: body.currency ? String(body.currency) : 'VND',
      provider: body.provider ? String(body.provider) : 'MOCK',
      state: body.state ? String(body.state) : 'SUCCESS',
      transactionId
    });

    return buildResponse(200, mapPaymentItemToDto(payment));
  } catch (error: any) {
    logger.error('Error in createRegistrationPayment handler', error);
    return buildResponse(500, null, 'Unable to create payment. Please try again later.');
  }
};
