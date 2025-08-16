import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';

// Rate limiting configurations
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const airtableRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Airtable API allows 5 requests/second, we're more conservative
  message: 'Airtable API rate limit exceeded. Please wait before retrying.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
export const validateAirtableConfig = [
  body('accessToken')
    .trim()
    .matches(/^pat[a-zA-Z0-9._-]+$/)
    .withMessage('Invalid Airtable access token format'),
  body('baseId')
    .trim()
    .matches(/^app[a-zA-Z0-9]+$/)
    .withMessage('Invalid Airtable base ID format'),
];

export const validateTableName = [
  body('tableName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Invalid table name format'),
];

export const validateDataType = [
  body('dataType')
    .isIn(['models', 'options'])
    .withMessage('Invalid data type. Must be "models" or "options"'),
];

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
  }
  next();
};

// Sanitize error messages to avoid exposing internal details
export const sanitizeErrorMessage = (error: any): string => {
  // Don't expose stack traces or internal paths
  if (error instanceof Error) {
    // Check for common error types
    if (error.message.includes('ECONNREFUSED')) {
      return 'Unable to connect to external service';
    }
    if (error.message.includes('ETIMEDOUT')) {
      return 'Request timed out';
    }
    if (error.message.includes('Invalid credentials')) {
      return 'Authentication failed';
    }
    // Generic message for other errors
    return 'An error occurred processing your request';
  }
  return 'An unknown error occurred';
};

// Request logging middleware
export const logApiRequest = (service: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request
    console.log(`[${service}] ${requestId} ${req.method} ${req.path} - Started`);
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${service}] ${requestId} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  };
};

// Timeout middleware for external API calls
export const apiTimeout = (seconds: number = 30) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, seconds * 1000);
    
    res.on('finish', () => clearTimeout(timeout));
    next();
  };
};