import crypto from 'crypto';

// Security configuration
export const securityConfig = {
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    saltLength: 32,
    tagLength: 16,
    ivLength: 16
  },
  
  // Rate limiting
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    airtable: {
      windowMs: 60 * 1000, // 1 minute
      max: 10 // Conservative to respect Airtable's 5 req/sec limit
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // Strict for auth endpoints
    }
  },
  
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const
  },
  
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // API versioning
  apiVersion: 'v1',
  
  // Monitoring
  monitoring: {
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableMetrics: true,
    enableTracing: process.env.NODE_ENV === 'production'
  }
};

// Encryption utilities
export class TokenEncryption {
  private key: Buffer;
  
  constructor() {
    // In production, use environment variable for encryption key
    const secretKey = process.env.ENCRYPTION_KEY || 'development-key-do-not-use-in-prod';
    const salt = process.env.ENCRYPTION_SALT || 'development-salt';
    
    // Derive key from secret
    this.key = crypto.pbkdf2Sync(
      secretKey,
      salt,
      securityConfig.encryption.iterations,
      32,
      'sha256'
    );
  }
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
    const cipher = crypto.createCipheriv(
      securityConfig.encryption.algorithm,
      this.key,
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(
      securityConfig.encryption.algorithm,
      this.key,
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Audit logging
export class AuditLogger {
  private static instance: AuditLogger;
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }
  
  logApiCall(
    method: string,
    path: string,
    userId: string | null,
    statusCode: number,
    duration: number,
    metadata?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'API_CALL',
      method,
      path,
      userId,
      statusCode,
      duration,
      metadata,
      environment: process.env.NODE_ENV
    };
    
    // In production, this would go to a proper logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., CloudWatch, Datadog)
      console.log(JSON.stringify(logEntry));
    } else {
      console.log('[AUDIT]', logEntry);
    }
  }
  
  logSecurityEvent(
    eventType: string,
    userId: string | null,
    details: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      eventType,
      userId,
      details,
      environment: process.env.NODE_ENV
    };
    
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }
  
  logDataAccess(
    action: string,
    resource: string,
    userId: string,
    recordCount: number
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'DATA_ACCESS',
      action,
      resource,
      userId,
      recordCount,
      environment: process.env.NODE_ENV
    };
    
    // For GDPR compliance
    console.log('[DATA_ACCESS]', JSON.stringify(logEntry));
  }
}

// Input sanitization
export const sanitizeInput = {
  // Remove potentially dangerous characters
  sanitizeString(input: string, maxLength: number = 255): string {
    if (!input) return '';
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    sanitized = sanitized.substring(0, maxLength);
    
    return sanitized;
  },
  
  // Sanitize for SQL (additional to parameterized queries)
  sanitizeForSQL(input: string): string {
    if (!input) return '';
    
    // Remove SQL injection patterns
    let sanitized = input.replace(/['";\\]/g, '');
    sanitized = sanitized.replace(/--/g, '');
    sanitized = sanitized.replace(/\/\*/g, '');
    sanitized = sanitized.replace(/\*\//g, '');
    
    return this.sanitizeString(sanitized);
  },
  
  // Sanitize for HTML output
  sanitizeForHTML(input: string): string {
    if (!input) return '';
    
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
  }
};

// Health check for monitoring
export const healthCheck = {
  getStatus(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: securityConfig.apiVersion,
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      }
    };
  }
};