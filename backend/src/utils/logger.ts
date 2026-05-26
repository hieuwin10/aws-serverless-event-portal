export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, ...meta }));
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, ...meta }));
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(JSON.stringify({ 
      level: 'ERROR', 
      timestamp: new Date().toISOString(), 
      message, 
      errorMessage: error?.message, 
      stack: error?.stack,
      ...meta 
    }));
  }
};
