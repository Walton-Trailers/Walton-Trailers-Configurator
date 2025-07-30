import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { 
  adminUsers, 
  adminSessions, 
  type AdminUser, 
  type AdminSession, 
  type InsertAdminUser, 
  type InsertAdminSession 
} from "@shared/schema";

// Simple interfaces that match the frontend expectations
export interface TrailerCategoryResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
  orderIndex: number;
}

export interface TrailerModelResponse {
  id: number;
  categoryId: number;
  modelId: string;
  name: string;
  gvwr: string;
  payload: string;
  deckSize: string;
  axles: string;
  basePrice: number;
  imageUrl: string;
  features: string[];
  categoryName?: string;
  isArchived?: boolean;
}

export interface TrailerOptionResponse {
  id: number;
  modelId: string;
  category: string;
  name: string;
  price: number;
  isRequired?: boolean;
  isMultiSelect: boolean;
  isArchived?: boolean;
  options?: any[];
}

interface UserConfiguration {
  id: number;
  sessionId: string;
  categorySlug: string;
  modelId: number;
  variantId: number;
  selectedOptions: Record<string, any>;
  totalPrice: number;
  createdAt: Date;
}

interface InsertUserConfiguration {
  sessionId: string;
  categorySlug: string;
  modelId?: number;
  variantId?: number;
  selectedOptions: Record<string, any>;
  totalPrice: number;
}

export interface IStorage {
  // Trailer operations
  getTrailerCategories(): Promise<TrailerCategoryResponse[]>;
  getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]>;
  getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined>;
  getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]>;
  saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration>;
  getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined>;
  
  // Admin operations
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserById(id: number): Promise<AdminUser | undefined>;
  updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  deactivateAdminUser(id: number): Promise<void>;
  
  // Session operations
  createAdminSession(session: InsertAdminSession): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // Pricing management operations
  getAllModels(): Promise<TrailerModelResponse[]>;
  getAllOptions(): Promise<TrailerOptionResponse[]>;
  updateModel(id: number, updates: any): Promise<TrailerModelResponse>;
  updateOption(id: number, updates: any): Promise<TrailerOptionResponse>;
  createOption(data: { name: string; price: number; category: string; modelId: string }): Promise<TrailerOptionResponse>;
  deleteOption(id: number): Promise<void>;
  archiveOption(id: number): Promise<void>;
  archiveModel(id: number): Promise<void>;
  getOptionCategories(): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, TrailerCategoryResponse>;
  private models: Map<string, TrailerModelResponse>;
  private options: Map<string, TrailerOptionResponse[]>;
  private configurations: Map<string, UserConfiguration>;
  private currentId: number;

  constructor() {
    this.categories = new Map();
    this.models = new Map();
    this.options = new Map();
    this.configurations = new Map();
    this.currentId = 1;
    this.initializeData();
  }

  private initializeData() {
    // Initialize categories
    const categoriesData: TrailerCategoryResponse[] = [
      {
        id: 1,
        slug: "gooseneck",
        name: "Gooseneck Trailers",
        description: "Heavy-duty trailers with superior stability and higher payload capacity. Perfect for construction and industrial applications.",
        imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 18500,
        orderIndex: 1
      },
      {
        id: 2,
        slug: "tilt",
        name: "Tilt Equipment Trailers",
        description: "Hydraulic tilt design for easy loading of heavy machinery and equipment. Built for maximum durability.",
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 15200,
        orderIndex: 2
      },
      {
        id: 3,
        slug: "dump",
        name: "Dump Trailers",
        description: "Hydraulic dump systems with reinforced beds. Ideal for landscaping, construction, and material hauling.",
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 12500,
        orderIndex: 3
      },
      {
        id: 4,
        slug: "hauler",
        name: "Car/Equipment Haulers",
        description: "Low-profile design with drive-over fenders. Perfect for transporting vehicles and low-clearance equipment.",
        imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 14800,
        orderIndex: 4
      },
      {
        id: 5,
        slug: "landscape",
        name: "Landscape Trailers",
        description: "Side gates and removable ramps for easy loading. Designed specifically for landscaping professionals.",
        imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 8900,
        orderIndex: 5
      }
    ];

    categoriesData.forEach(cat => this.categories.set(cat.id, cat));

    // Initialize models
    const modelsData: TrailerModelResponse[] = [
      // Dump Trailers
      {
        id: 1,
        categoryId: 3,
        modelId: "DHO215",
        name: "DHO215 - 16' Dump Trailer",
        gvwr: "15,400 lbs",
        payload: "12,600 lbs",
        deckSize: "16' x 83\"",
        axles: "Dual 7K",
        basePrice: 12500,
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["12V Hydraulic Pump", "Tarp Kit", "LED Lighting", "7K Axles"]
      },
      {
        id: 2,
        categoryId: 3,
        modelId: "DTX620",
        name: "DTX620 - 20' Heavy Duty Dump",
        gvwr: "20,000 lbs",
        payload: "16,800 lbs",
        deckSize: "20' x 96\"",
        axles: "Triple 7K",
        basePrice: 18900,
        imageUrl: "https://images.unsplash.com/photo-1586798271628-e8463d8c3c30?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["24V Hydraulic System", "Premium Tarp", "LED Package", "Triple Axles"]
      },
      // Gooseneck Trailers
      {
        id: 3,
        categoryId: 1,
        modelId: "FBX210",
        name: "FBX210 - 28' Gooseneck Flatbed",
        gvwr: "25,000 lbs",
        payload: "20,200 lbs",
        deckSize: "28' x 102\"",
        axles: "Dual 12K",
        basePrice: 18500,
        imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["Gooseneck Hitch", "Wood Deck", "LED Lights", "Adjustable Coupler"]
      },
      // Tilt Equipment
      {
        id: 4,
        categoryId: 2,
        modelId: "TSX208",
        name: "TSX208 - 20' Tilt Equipment",
        gvwr: "16,000 lbs",
        payload: "13,200 lbs",
        deckSize: "20' x 83\"",
        axles: "Dual 8K",
        basePrice: 15200,
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["Hydraulic Tilt", "Steel Deck", "Winch Track", "Tool Box"]
      }
    ];

    modelsData.forEach(model => this.models.set(model.modelId, model));

    // Initialize options
    const optionsData: Record<string, TrailerOptionResponse[]> = {
      "DHO215": [
        { id: 1, modelId: "DHO215", category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 2, modelId: "DHO215", category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: 600, isMultiSelect: false },
        { id: 3, modelId: "DHO215", category: "ramps", name: "No Ramp", price: 0, isMultiSelect: false },
        { id: 4, modelId: "DHO215", category: "ramps", name: "Slide-in Ramps", price: 450, isMultiSelect: false },
        { id: 5, modelId: "DHO215", category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 6, modelId: "DHO215", category: "color", name: "Custom Color", price: 1200, isMultiSelect: false },
        { id: 7, modelId: "DHO215", category: "extras", name: "Toolbox", price: 850, isMultiSelect: true },
        { id: 8, modelId: "DHO215", category: "extras", name: "Spare Tire Mount", price: 200, isMultiSelect: true },
        { id: 9, modelId: "DHO215", category: "extras", name: "D-Rings (4)", price: 120, isMultiSelect: true }
      ],
      "DTX620": [
        { id: 10, modelId: "DTX620", category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 11, modelId: "DTX620", category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: 900, isMultiSelect: false },
        { id: 12, modelId: "DTX620", category: "walls", name: "Standard 24\" Walls", price: 0, isMultiSelect: false },
        { id: 13, modelId: "DTX620", category: "walls", name: "High 36\" Walls", price: 1500, isMultiSelect: false },
        { id: 14, modelId: "DTX620", category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 15, modelId: "DTX620", category: "color", name: "Custom Color", price: 1200, isMultiSelect: false }
      ],
      "FBX210": [
        { id: 16, modelId: "FBX210", category: "deck", name: "24' Length", price: -2000, isMultiSelect: false },
        { id: 17, modelId: "FBX210", category: "deck", name: "28' Length", price: 0, isMultiSelect: false },
        { id: 18, modelId: "FBX210", category: "deck", name: "32' Length", price: 3000, isMultiSelect: false },
        { id: 19, modelId: "FBX210", category: "ramps", name: "No Ramps", price: 0, isMultiSelect: false },
        { id: 20, modelId: "FBX210", category: "ramps", name: "8' Slide-in Ramps", price: 1200, isMultiSelect: false }
      ],
      "TSX208": [
        { id: 21, modelId: "TSX208", category: "winch", name: "No Winch", price: 0, isMultiSelect: false },
        { id: 22, modelId: "TSX208", category: "winch", name: "12V Electric Winch", price: 1500, isMultiSelect: false }
      ]
    };

    Object.entries(optionsData).forEach(([modelId, options]) => {
      this.options.set(modelId, options);
    });
  }

  async getTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    return Array.from(this.categories.values());
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]> {
    const category = Array.from(this.categories.values()).find(cat => cat.slug === categorySlug);
    if (!category) return [];
    
    return Array.from(this.models.values()).filter(model => model.categoryId === category.id);
  }

  async getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined> {
    return this.models.get(modelId);
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]> {
    return this.options.get(modelId) || [];
  }

  async saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration> {
    const id = this.currentId++;
    const userConfig: UserConfiguration = { 
      ...config, 
      id,
      createdAt: new Date(),
      modelId: config.modelId || 0,
      variantId: config.variantId || 0
    };
    this.configurations.set(config.sessionId, userConfig);
    return userConfig;
  }

  async getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined> {
    return this.configurations.get(sessionId);
  }

  // Admin operations (not implemented in memory storage)
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async deactivateAdminUser(id: number): Promise<void> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    throw new Error("Admin operations not supported in memory storage");
  }

  async deleteExpiredSessions(): Promise<void> {
    throw new Error("Admin operations not supported in memory storage");
  }

  // Pricing management operations
  async getAllModels(): Promise<TrailerModelResponse[]> {
    return Array.from(this.models.values());
  }

  async getAllOptions(): Promise<TrailerOptionResponse[]> {
    return Array.from(this.options.values()).flat();
  }



  async updateModel(id: number, updates: any): Promise<TrailerModelResponse> {
    const model = Array.from(this.models.values()).find(m => m.id === id);
    if (!model) {
      throw new Error('Model not found');
    }
    
    const updatedModel = { ...model, ...updates };
    this.models.set(model.id.toString(), updatedModel);
    return updatedModel;
  }

  async updateOption(id: number, updates: any): Promise<TrailerOptionResponse> {
    for (const [modelId, options] of Array.from(this.options.entries())) {
      const optionIndex = options.findIndex(o => o.id === id);
      if (optionIndex !== -1) {
        const updatedOption = { ...options[optionIndex], ...updates };
        options[optionIndex] = updatedOption;
        this.options.set(modelId, options);
        return updatedOption;
      }
    }
    throw new Error('Option not found');
  }

  async createOption(data: { name: string; price: number; category: string; modelId: string }): Promise<TrailerOptionResponse> {
    const newOption: TrailerOptionResponse = {
      id: this.currentId++,
      modelId: data.modelId,
      name: data.name,
      category: data.category,
      price: data.price,
      isMultiSelect: false,
    };
    
    const existingOptions = this.options.get(data.modelId) || [];
    existingOptions.push(newOption);
    this.options.set(data.modelId, existingOptions);
    
    return newOption;
  }

  async deleteOption(id: number): Promise<void> {
    for (const [modelId, options] of Array.from(this.options.entries())) {
      const filteredOptions = options.filter(option => option.id !== id);
      if (filteredOptions.length !== options.length) {
        this.options.set(modelId, filteredOptions);
        return;
      }
    }
    throw new Error('Option not found');
  }

  async archiveOption(id: number): Promise<void> {
    throw new Error("MemStorage archiveOption not implemented for pricing management");
  }

  async archiveModel(id: number): Promise<void> {
    throw new Error("MemStorage archiveModel not implemented for pricing management");
  }


}

export class DatabaseStorage implements IStorage {
  async getTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    try {
      // Dynamic pricing based on lowest model price in each category
      const result = await db.execute(sql`
        SELECT 
          c.id, c.slug, c.name, c.description, c.image_url,
          COALESCE(MIN(m.base_price), c.starting_price) as starting_price
        FROM trailer_categories c
        LEFT JOIN trailer_models m ON c.id = m.category_id 
          AND (m.is_archived IS NULL OR m.is_archived = false)
        GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.starting_price
        ORDER BY c.id
      `);
      
      return result.rows.map((cat: any) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        startingPrice: cat.starting_price,
        orderIndex: 0
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.model_id, m.name, m.gvwr, m.payload, 
               m.deck_size, m.axles, m.base_price, m.image_url, m.features
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        WHERE c.slug = ${categorySlug}
        ORDER BY m.id
      `);
      
      return result.rows.map((model: any) => ({
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,
        gvwr: model.gvwr,
        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || []
      }));
    } catch (error) {
      console.error('Error fetching models by category:', error);
      throw error;
    }
  }

  async getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT id, category_id, model_id, name, gvwr, payload, 
               deck_size, axles, base_price, image_url, features
        FROM trailer_models
        WHERE model_id = ${modelId}
      `);
      
      if (result.rows.length === 0) return undefined;
      
      const model = result.rows[0] as any;
      return {
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,
        gvwr: model.gvwr,
        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || []
      };
    } catch (error) {
      console.error('Error fetching model:', error);
      throw error;
    }
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select
        FROM trailer_options
        WHERE model_id = ${modelId}
        ORDER BY category, name
      `);
      
      return result.rows.map((option: any) => ({
        id: option.id,
        modelId: option.model_id,
        category: option.category,
        name: option.name,
        price: option.price,
        isMultiSelect: option.is_multi_select || false
      }));
    } catch (error) {
      console.error('Error fetching options:', error);
      throw error;
    }
  }

  async saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration> {
    // For now, just return a mock configuration
    // In production, this would save to the database
    return {
      id: Date.now(),
      sessionId: config.sessionId,
      categorySlug: config.categorySlug,
      modelId: config.modelId || 0,
      variantId: config.variantId || 0,
      selectedOptions: config.selectedOptions,
      totalPrice: config.totalPrice,
      createdAt: new Date()
    };
  }

  async getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined> {
    // For now, return undefined
    // In production, this would query the database
    return undefined;
  }

  // Admin User Operations
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    try {
      const [newUser] = await db.insert(adminUsers).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
      return user;
    } catch (error) {
      console.error('Error fetching admin user by username:', error);
      throw error;
    }
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      return user;
    } catch (error) {
      console.error('Error fetching admin user by email:', error);
      throw error;
    }
  }

  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching admin user by id:', error);
      throw error;
    }
  }

  async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser> {
    try {
      const [updatedUser] = await db.update(adminUsers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(adminUsers.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating admin user:', error);
      throw error;
    }
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    try {
      return await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
    } catch (error) {
      console.error('Error fetching all admin users:', error);
      throw error;
    }
  }

  async deactivateAdminUser(id: number): Promise<void> {
    try {
      await db.update(adminUsers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(adminUsers.id, id));
    } catch (error) {
      console.error('Error deactivating admin user:', error);
      throw error;
    }
  }

  // Session Operations
  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    try {
      const [newSession] = await db.insert(adminSessions).values(session).returning();
      return newSession;
    } catch (error) {
      console.error('Error creating admin session:', error);
      throw error;
    }
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    try {
      const [session] = await db.select().from(adminSessions).where(eq(adminSessions.id, sessionId));
      return session;
    } catch (error) {
      console.error('Error fetching admin session:', error);
      throw error;
    }
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    try {
      await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
    } catch (error) {
      console.error('Error deleting admin session:', error);
      throw error;
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    try {
      await db.delete(adminSessions).where(sql`expires_at < NOW()`);
    } catch (error) {
      console.error('Error deleting expired sessions:', error);
      throw error;
    }
  }

  // Pricing management operations
  async getAllModels(): Promise<TrailerModelResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.model_id, m.name, m.gvwr, m.payload,
               m.deck_size, m.axles, m.base_price, m.image_url, m.features,
               m.is_archived, c.name as category_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        ORDER BY c.name, m.id
      `);
      
      console.log('Raw models result:', result.rows.length);
      
      return result.rows.map((model: any) => ({
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,
        gvwr: model.gvwr,
        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || [],
        categoryName: model.category_name,
        isArchived: model.is_archived || false,
      }));
    } catch (error) {
      console.error('Error fetching all models:', error);
      throw new Error(`Failed to fetch models: ${(error as Error).message}`);
    }
  }

  async getAllOptions(): Promise<TrailerOptionResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_archived
        FROM trailer_options
        ORDER BY category, name
      `);
      
      return result.rows.map((option: any) => ({
        id: option.id,
        modelId: option.model_id,
        name: option.name,
        category: option.category,
        price: option.price,
        isRequired: false,
        isMultiSelect: option.is_multi_select || false,
        isArchived: option.is_archived || false,
        options: [],
      }));
    } catch (error) {
      console.error('Error fetching all options:', error);
      throw error;
    }
  }

  async updateModel(id: number, updates: any): Promise<TrailerModelResponse> {
    try {
      // Use individual SQL statements for each field to avoid parameter issues
      if (updates.basePrice !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET base_price = ${updates.basePrice}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.modelId !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET model_id = ${updates.modelId}
          WHERE id = ${id}
        `);
      }
      if (updates.gvwr !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET gvwr = ${updates.gvwr}
          WHERE id = ${id}
        `);
      }
      if (updates.payload !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET payload = ${updates.payload}
          WHERE id = ${id}
        `);
      }
      if (updates.deckSize !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET deck_size = ${updates.deckSize}
          WHERE id = ${id}
        `);
      }
      if (updates.categoryId !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET category_id = ${updates.categoryId}
          WHERE id = ${id}
        `);
      }
      if (updates.isArchived !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET is_archived = ${updates.isArchived}
          WHERE id = ${id}
        `);
      }
      
      // Get the updated record
      const result = await db.execute(sql`
        SELECT id, category_id, model_id, name, gvwr, payload,
               deck_size, axles, base_price, image_url, features, is_archived
        FROM trailer_models WHERE id = ${id}
      `);
      
      const updatedModel = result.rows[0] as any;
      return {
        id: updatedModel.id,
        categoryId: updatedModel.category_id,
        modelId: updatedModel.model_id,
        name: updatedModel.name,
        gvwr: updatedModel.gvwr,
        payload: updatedModel.payload,
        deckSize: updatedModel.deck_size,
        axles: updatedModel.axles,
        basePrice: updatedModel.base_price,
        imageUrl: updatedModel.image_url,
        features: updatedModel.features || [],
        isArchived: updatedModel.is_archived || false,
      };
    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }

  async updateOption(id: number, updates: any): Promise<TrailerOptionResponse> {
    try {
      let result;
      
      // Build update object dynamically
      const updateData: any = {};
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.modelId !== undefined) updateData.model_id = updates.modelId;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
      
      if (Object.keys(updateData).length > 0) {
        // Use individual SQL statements for each field to avoid parameter issues
        if (updates.price !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET price = ${updates.price}
            WHERE id = ${id}
          `);
        }
        if (updates.name !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET name = ${updates.name}
            WHERE id = ${id}
          `);
        }
        if (updates.category !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET category = ${updates.category}
            WHERE id = ${id}
          `);
        }
        if (updates.modelId !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET model_id = ${updates.modelId}
            WHERE id = ${id}
          `);
        }
        if (updates.isArchived !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET is_archived = ${updates.isArchived}
            WHERE id = ${id}
          `);
        }
      }
      
      // Get the updated record
      result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_archived
        FROM trailer_options WHERE id = ${id}
      `);
      
      const updatedOption = result.rows[0] as any;
      return {
        id: updatedOption.id,
        modelId: updatedOption.model_id,
        name: updatedOption.name,
        category: updatedOption.category,
        price: updatedOption.price,
        isMultiSelect: updatedOption.is_multi_select || false,
        isArchived: updatedOption.is_archived || false,
      };
    } catch (error) {
      console.error('Error updating option:', error);
      throw error;
    }
  }

  async createOption(data: { name: string; price: number; category: string; modelId: string }): Promise<TrailerOptionResponse> {
    try {
      const result = await db.execute(sql`
        INSERT INTO trailer_options (model_id, name, category, price, is_multi_select)
        VALUES (${data.modelId}, ${data.name}, ${data.category}, ${data.price}, false)
        RETURNING id, model_id, name, category, price, is_multi_select
      `);
      
      const newOption = result.rows[0] as any;
      return {
        id: newOption.id,
        modelId: newOption.model_id,
        name: newOption.name,
        category: newOption.category,
        price: newOption.price,
        isRequired: false,
        isMultiSelect: newOption.is_multi_select || false,
        options: [],
      };
    } catch (error) {
      console.error('Error creating option:', error);
      throw error;
    }
  }

  async deleteOption(id: number): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM trailer_options WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error deleting option:', error);
      throw error;
    }
  }

  async archiveOption(id: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE trailer_options 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error archiving option:', error);
      throw error;
    }
  }

  async archiveModel(id: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE trailer_models 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error archiving model:', error);
      throw error;
    }
  }


}

// Use database storage in production, fallback to memory for development
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
