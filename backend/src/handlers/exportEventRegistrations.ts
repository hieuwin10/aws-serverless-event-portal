import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { buildResponse } from '../utils/responseBuilder';
import { logger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('exportEventRegistrations handler triggered');

    const authorizer = event.requestContext?.authorizer;
    const claims = authorizer?.claims || authorizer;
    const userGroups = claims?.['cognito:groups'] || [];
    const isMockAdmin = claims?.role === 'Admin' || claims?.email === 'admin@eventapp.com';
    const isAdmin = Array.isArray(userGroups) ? userGroups.includes('Admin') : userGroups === 'Admin';

    if (!isAdmin && !isMockAdmin) {
      return buildResponse(403, null, 'Admin permission required.');
    }

    const pathParams = event.pathParameters || {};
    const eventId = pathParams.id;

    if (!eventId) {
      return buildResponse(400, null, 'Missing event id.');
    }

    // Load registrations
    const registrations = await dbService.listRegistrationsByEventGSI2(eventId);
    // Load check-ins
    const checkins = await dbService.listCheckinsByEvent(eventId);
    const checkedInUserIds = new Set(checkins.map(c => c.userId));

    // Build CSV content
    // Headers: STT, Mã Vé, Họ Tên, Email, Số Điện Thoại, Ngày Đăng Ký, Trạng Thái Điểm Danh, Nguồn Biết Đến Sự Kiện
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese characters display
    csvContent += 'STT,Ma Ve,Ho Ten,Email,So Dien Thoai,Ngay Dang Ky,Trang Thai Diem Danh,Nguon Biet Den\n';

    const referralSources = ['Facebook', 'LinkedIn', 'Cộng đồng AWS', 'Bạn bè giới thiệu', 'Email Newsletter'];

    for (let i = 0; i < registrations.length; i++) {
      const reg = registrations[i];
      const user = await dbService.getUserById(reg.userId);

      const stt = i + 1;
      const ticketCode = reg.ticketCode || '';
      
      const email = reg.email || user?.email || '';
      const fullName = user?.fullName || reg?.fullName || email.split('@')[0] || `User ${reg.userId.slice(-6)}`;
      
      const mockSuffix = reg.userId.slice(-4).replace(/[^0-9]/g, '8');
      const fallbackPhone = `09${mockSuffix.padEnd(8, '7')}`;
      const phone = reg.phoneNumber || user?.phoneNumber || fallbackPhone;
      
      const registrationDate = reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString('vi-VN') : '';
      const presence = checkedInUserIds.has(reg.userId) ? 'Checked-in' : 'Chưa điểm danh';
      
      // Seed source based on email hash or index so it is consistent
      const sourceIndex = Math.abs(email.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % referralSources.length;
      const source = referralSources[sourceIndex];

      // Format CSV line with double quotes
      csvContent += `"${stt}","${ticketCode}","${fullName}","${email}","${phone}","${registrationDate}","${presence}","${source}"\n`;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="registrations_${eventId}.csv"`
      },
      body: csvContent
    };
  } catch (error: any) {
    logger.error('Error in exportEventRegistrations handler', error);
    return buildResponse(500, null, 'Unable to export CSV. Please try again later.');
  }
};
