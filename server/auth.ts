import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { storage } from './storage';
import type { AdminUser, AdminSession } from '@shared/schema';

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

export interface SessionResult {
  success: boolean;
  sessionId?: string;
  expiresAt?: Date;
  error?: string;
}

// Hash password for storage
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate secure session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Authenticate user credentials
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    const user = await storage.getAdminUserByUsername(username);
    
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Update last login
    await storage.updateAdminUser(user.id, { lastLogin: new Date() });

    return { success: true, user };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// Create new session for authenticated user
export async function createSession(userId: number): Promise<SessionResult> {
  try {
    const sessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    const session = await storage.createAdminSession({
      id: sessionId,
      userId,
      expiresAt,
    });

    return { 
      success: true, 
      sessionId: session.id, 
      expiresAt: session.expiresAt 
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

// Validate session and return user if valid
export async function validateSession(sessionId: string): Promise<AuthResult> {
  try {
    const session = await storage.getAdminSession(sessionId);
    
    if (!session) {
      return { success: false, error: 'Invalid session' };
    }

    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await storage.deleteAdminSession(sessionId);
      return { success: false, error: 'Session expired' };
    }

    const sessionUser = await storage.getAdminUserById(session.userId);

    if (!sessionUser || !sessionUser.isActive) {
      return { success: false, error: 'User not found or inactive' };
    }

    return { success: true, user: sessionUser };
  } catch (error) {
    console.error('Error validating session:', error);
    return { success: false, error: 'Session validation failed' };
  }
}

// Logout user by deleting session
export async function logout(sessionId: string): Promise<void> {
  try {
    await storage.deleteAdminSession(sessionId);
  } catch (error) {
    console.error('Error during logout:', error);
    // Don't throw - logout should always appear to succeed
  }
}

// Clean up expired sessions (should be called periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await storage.deleteExpiredSessions();
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}

// Check if user has admin privileges
export function isAdmin(user: AdminUser): boolean {
  return user.role === 'admin';
}

// Middleware type for request with user
export interface AuthenticatedRequest extends Request {
  user?: AdminUser;
  sessionId?: string;
}