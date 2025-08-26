// Fallback storage implementation when database is not available
import type { IStorage, TrailerCategoryResponse, TrailerModelResponse, TrailerOptionResponse } from "./storage";
import type { AdminUser, AdminSession, InsertAdminUser } from "@shared/schema";

export class NoDatabaseStorage implements IStorage {
  private adminUsers = new Map<number, AdminUser>();
  private adminSessions = new Map<string, AdminSession>();
  private nextId = 1;
  
  constructor() {
    console.log("Using in-memory storage (no database)");
  }

  // Trailer operations - return empty data
  async getTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    return [];
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]> {
    return [];
  }

  async getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined> {
    return undefined;
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]> {
    return [];
  }

  async saveConfiguration(config: any): Promise<any> {
    return { id: 1, ...config };
  }

  async getConfigurations(sessionId: string): Promise<any[]> {
    return [];
  }

  async getConfiguration(id: number): Promise<any | undefined> {
    return undefined;
  }

  // Admin operations
  async createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
    const id = this.nextId++;
    const user: AdminUser = {
      id,
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      role: data.role ?? 'standard',
      isActive: data.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adminUsers.set(id, user);
    return user;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    for (const user of this.adminUsers.values()) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values());
  }

  async updateAdminUser(id: number, updates: any): Promise<AdminUser> {
    const user = this.adminUsers.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.adminUsers.set(id, updatedUser);
    return updatedUser;
  }

  async deleteAdminUser(id: number): Promise<void> {
    this.adminUsers.delete(id);
  }

  async createAdminSession(data: any): Promise<AdminSession> {
    const session: AdminSession = {
      id: data.sessionId,
      userId: data.userId,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
    };
    this.adminSessions.set(data.sessionId, session);
    return session;
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    return this.adminSessions.get(sessionId);
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    this.adminSessions.delete(sessionId);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.adminSessions.entries()) {
      if (session.expiresAt < now) {
        this.adminSessions.delete(id);
      }
    }
  }

  // Pricing management operations
  async getAllModels(): Promise<TrailerModelResponse[]> {
    return [];
  }

  async getAllOptions(): Promise<TrailerOptionResponse[]> {
    return [];
  }

  async updateModel(id: number, updates: any): Promise<TrailerModelResponse> {
    throw new Error("Database not available");
  }

  async updateOption(id: number, updates: any): Promise<TrailerOptionResponse> {
    throw new Error("Database not available");
  }

  async createOption(data: any): Promise<TrailerOptionResponse> {
    throw new Error("Database not available");
  }

  async deleteOption(id: number): Promise<void> {
    throw new Error("Database not available");
  }

  async archiveOption(id: number): Promise<void> {
    throw new Error("Database not available");
  }

  async archiveModel(id: number): Promise<void> {
    throw new Error("Database not available");
  }

  async restoreModel(id: number): Promise<TrailerModelResponse> {
    throw new Error("Database not available");
  }

  async getOptionCategories(): Promise<string[]> {
    return [];
  }

  // Missing methods
  async saveUserConfiguration(config: any): Promise<any> {
    return { id: 1, ...config };
  }

  async getUserConfiguration(sessionId: string): Promise<any | undefined> {
    return undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    for (const user of this.adminUsers.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async deactivateAdminUser(id: number): Promise<void> {
    const user = this.adminUsers.get(id);
    if (user) {
      user.isActive = false;
      this.adminUsers.set(id, user);
    }
  }

  // Airtable configuration methods
  private airtableConfig: { accessToken: string; baseId: string } | null = null;

  async saveAirtableConfig(config: { accessToken: string; baseId: string }): Promise<void> {
    this.airtableConfig = config;
  }

  async getAirtableConfig(): Promise<{ accessToken: string; baseId: string } | null> {
    return this.airtableConfig;
  }

  isAdminSession(sessionId: string): boolean {
    return this.adminSessions.has(sessionId);
  }

  // Series management operations
  async getAllSeries(): Promise<any[]> {
    return [];
  }

  async createSeries(data: { categoryId: number; name: string; description: string; slug: string; basePrice: number }): Promise<any> {
    throw new Error("Database not available");
  }

  async updateSeries(id: number, updates: any): Promise<any> {
    throw new Error("Database not available");
  }

  async deleteSeries(id: number): Promise<void> {
    throw new Error("Database not available");
  }
}