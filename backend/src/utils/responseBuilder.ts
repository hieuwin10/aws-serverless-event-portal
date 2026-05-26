export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string | boolean>;
  body: string;
}

export const buildResponse = (
  statusCode: number, 
  data: any, 
  errorMessage?: string
): APIGatewayResponse => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      data: data || null,
      error: errorMessage || null,
      timestamp: new Date().toISOString()
    })
  };
};
