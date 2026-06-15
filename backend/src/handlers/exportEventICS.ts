import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dbService } from '../services/dbService';
import { logger } from '../utils/logger';

/**
 * GET /events/{id}/export
 * Xuất file lịch .ics (iCalendar format) để thêm vào Google Calendar, Outlook, etc.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('exportEventICS handler triggered');

    // 1. Lấy eventId từ path parameters
    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Thiếu ID sự kiện' })
      };
    }

    // 2. Lấy thông tin sự kiện
    const eventPK = `EVENT#${eventId}`;
    const eventData = await dbService.getItem(eventPK, 'METADATA');
    
    if (!eventData) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Không tìm thấy sự kiện' })
      };
    }

    // 3. Chuyển đổi sang định dạng iCalendar (.ics)
    const eventDate = new Date(eventData.date);
    const eventEndDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // Giả định sự kiện kéo dài 2 giờ

    // Format datetime theo chuẩn iCalendar: YYYYMMDDTHHmmssZ
    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Event Portal//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${eventId}@event-portal.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(eventDate)}`,
      `DTEND:${formatICSDate(eventEndDate)}`,
      `SUMMARY:${eventData.title}`,
      `DESCRIPTION:${(eventData.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${eventData.location || 'TBA'}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:0`,
      `BEGIN:VALARM`,
      `TRIGGER:-PT1H`, // Nhắc nhở trước 1 giờ
      `ACTION:DISPLAY`,
      `DESCRIPTION:Sự kiện sắp bắt đầu trong 1 giờ`,
      `END:VALARM`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // 4. Trả về file .ics
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: icsContent
    };

  } catch (error: any) {
    logger.error('Error in exportEventICS handler', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Không thể xuất file lịch lúc này. Vui lòng thử lại sau.' 
      })
    };
  }
};
