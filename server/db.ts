import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket support
neonConfig.webSocketConstructor = ws;

// Enhanced connection configuration for production deployment
neonConfig.poolQueryViaFetch = true;

// Handle missing DATABASE_URL gracefully in production
let pool: Pool | null = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  // Create connection pool with optimized settings for deployment
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5, // Reduced for faster startup
    idleTimeoutMillis: 10000, // 10 seconds
    connectionTimeoutMillis: 5000, // 5 seconds for faster failure
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });
  
  db = drizzle({ client: pool, schema });
} else {
  // In production, log warning but don't crash
  if (process.env.NODE_ENV === 'production') {
    console.warn('WARNING: DATABASE_URL not set. Database features will be disabled.');
    console.warn('To enable database features, add a PostgreSQL database in your Replit deployment settings.');
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

export { pool, db };