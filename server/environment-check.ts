import { log } from "./vite";

export function validateEnvironment() {
  // In production, DATABASE_URL might be injected differently by Replit
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = isProduction ? [] : ['DATABASE_URL'];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // In production, warn if DATABASE_URL is missing but don't fail
  if (isProduction && !process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL not set in production - database features will be disabled');
  }

  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push('NODE_ENV not set, defaulting to development mode');
  } else if (!['development', 'production', 'test'].includes(nodeEnv)) {
    warnings.push(`Invalid NODE_ENV: ${nodeEnv}. Should be 'development', 'production', or 'test'`);
  }

  // Check PORT
  const port = process.env.PORT;
  if (!port) {
    warnings.push('PORT not set, defaulting to 5000');
  } else {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Invalid PORT: ${port}. Must be a number between 1 and 65535`);
    }
  }

  // Log validation results
  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(error => console.error(`  ❌ ${error}`));
    throw new Error('Environment validation failed');
  }

  if (warnings.length > 0) {
    log('Environment validation warnings:');
    warnings.forEach(warning => log(`  ⚠️  ${warning}`));
  }

  log('✅ Environment validation passed');
  
  // Log current environment status
  log(`Environment: ${nodeEnv || 'development'}`);
  log(`Port: ${port || '5000'}`);
  log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
}