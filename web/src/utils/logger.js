/**
 * Production-safe logger utility
 * Strips sensitive data and only logs in development
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Safe logger that only logs in development
 */
export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    // Warnings are useful even in production, but sanitize sensitive data
    const sanitized = sanitizeLogData(args);
    console.warn(...sanitized);
  },
  
  error: (...args) => {
    // Errors should be logged in production, but sanitize sensitive data
    const sanitized = sanitizeLogData(args);
    console.error(...sanitized);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

/**
 * Sanitize log data to remove sensitive information
 * @param {Array} args - Log arguments
 * @returns {Array} Sanitized arguments
 */
function sanitizeLogData(args) {
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Remove potential tokens, keys, passwords
      return arg
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+/gi, 'Bearer [REDACTED]')
        .replace(/apikey[=:]\s*[A-Za-z0-9\-._~+/]+/gi, 'apikey=[REDACTED]')
        .replace(/password[=:]\s*[^\s,}]+/gi, 'password=[REDACTED]')
        .replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+/gi, 'token=[REDACTED]');
    }
    
    if (typeof arg === 'object' && arg !== null) {
      const sanitized = { ...arg };
      
      // Remove sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'access_token',
        'refresh_token',
        'apikey',
        'api_key',
        'secret',
        'private_key',
        'authorization'
      ];
      
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      // Sanitize nested objects
      Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = sanitizeLogData([sanitized[key]])[0];
        }
      });
      
      return sanitized;
    }
    
    return arg;
  });
}

/**
 * Log error safely without exposing stack traces in production
 */
export function logError(error, context = '') {
  if (isDevelopment) {
    console.error(`[${context}]`, error);
  } else {
    // In production, only log safe error messages
    const safeError = {
      message: error?.message || 'An error occurred',
      name: error?.name || 'Error',
      context
    };
    console.error(`[${context}]`, safeError);
    
    // Optionally send to error tracking service (Sentry, etc.)
    // trackError(safeError, context);
  }
}










