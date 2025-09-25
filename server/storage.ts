import { db } from "./db";
import { cache } from "./cache";

// Check if database is available
const isDatabaseAvailable = !!db;
import { sql, eq } from "drizzle-orm";
import { 
  adminUsers, 
  adminSessions, 
  passwordResetTokens,
  type AdminUser, 
  type AdminSession, 
  type PasswordResetToken,
  type InsertAdminUser, 
  type InsertAdminSession,
  type InsertPasswordResetToken
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
  isArchived?: boolean;
}

export interface TrailerModelResponse {
  id: number;
  categoryId: number;
  seriesId?: number;
  modelId: string;
  name: string;
  gvwr?: string;
  payload?: string;
  deckSize?: string;
  axles?: string;
  lengthOptions?: string[] | null;
  lengthPrice?: Record<string, number> | null;
  lengthGvwr?: Record<string, string> | null;
  pulltypeOptions?: Record<string, string> | null;
  basePrice: number;
  imageUrl: string;
  features: string[];
  categoryName?: string;
  categorySubType?: string;
  seriesName?: string;
  isArchived?: boolean;
}

export interface TrailerOptionResponse {
  id: number;
  modelId: string; // Keep for backward compatibility
  applicableModels: string[]; // New field for multiple models
  category: string;
  name: string;
  price: number;
  isRequired?: boolean;
  isMultiSelect: boolean;
  isArchived?: boolean;
  imageUrl?: string;
  options?: any[];
  hexColor?: string; // Hex color value for color options
  primerPrice?: number; // Primer price for color options
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
  getAllTrailerCategories(): Promise<TrailerCategoryResponse[]>;
  getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]>;
  getTrailerModelsBySeries(seriesId: number): Promise<TrailerModelResponse[]>;
  getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined>;
  getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]>;
  getOptionsForModel(modelId: string): Promise<TrailerOptionResponse[]>; // New efficient method
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
  
  // Password reset token operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  deleteExpiredResetTokens(): Promise<void>;
  
  // Pricing management operations
  getAllModels(): Promise<TrailerModelResponse[]>;
  getAllOptions(): Promise<TrailerOptionResponse[]>;
  updateModel(id: number, updates: any): Promise<TrailerModelResponse>;
  updateOption(id: number, updates: any): Promise<TrailerOptionResponse>;
  createOption(data: { name: string; price: number; category: string; modelId?: string; applicableModels?: string[]; hexColor?: string }): Promise<TrailerOptionResponse>;
  deleteOption(id: number): Promise<void>;
  archiveOption(id: number): Promise<void>;
  archiveModel(id: number): Promise<void>;
  archiveCategory(id: number): Promise<void>;
  restoreCategory(id: number): Promise<TrailerCategoryResponse>;
  restoreModel(id: number): Promise<TrailerModelResponse>;
  getOptionCategories(): Promise<string[]>;
  createModel(data: { categoryId: number; seriesId?: number; modelSeries: string; name: string; basePrice?: number; imageUrl: string; standardFeatures: string[] }): Promise<TrailerModelResponse>;
  
  // Series management operations
  getAllSeries(): Promise<any[]>;
  createSeries(data: { categoryId: number; name: string; description: string; slug: string; basePrice: number }): Promise<any>;
  updateSeries(id: number, updates: any): Promise<any>;
  deleteSeries(id: number): Promise<void>;
  archiveSeries(id: number): Promise<any>;
  restoreSeries(id: number): Promise<any>;
  
  // Integration operations
  saveAirtableConfig(config: { accessToken: string; baseId: string }): Promise<void>;
  getAirtableConfig(): Promise<{ accessToken: string; baseId: string } | null>;
  
  // Admin session helper
  isAdminSession(sessionId: string): boolean;
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
        seriesId: 1,
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
        seriesId: 2,
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
        seriesId: 3,
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
        seriesId: 4,
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

    // Initialize options with applicableModels support
    const optionsData: Record<string, TrailerOptionResponse[]> = {
      "DHO215": [
        { id: 1, modelId: "DHO215", applicableModels: ["DHO215"], category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 2, modelId: "DHO215", applicableModels: ["DHO215"], category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: 600, isMultiSelect: false },
        { id: 3, modelId: "DHO215", applicableModels: ["DHO215"], category: "ramps", name: "No Ramp", price: 0, isMultiSelect: false },
        { id: 4, modelId: "DHO215", applicableModels: ["DHO215"], category: "ramps", name: "Slide-in Ramps", price: 450, isMultiSelect: false },
        { id: 5, modelId: "DHO215", applicableModels: ["DHO215"], category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 6, modelId: "DHO215", applicableModels: ["DHO215"], category: "color", name: "Custom Color", price: 1200, isMultiSelect: false },
        { id: 7, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "Toolbox", price: 850, isMultiSelect: true },
        { id: 8, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "Spare Tire Mount", price: 200, isMultiSelect: true },
        { id: 9, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "D-Rings (4)", price: 120, isMultiSelect: true }
      ],
      "DTX620": [
        { id: 10, modelId: "DTX620", applicableModels: ["DTX620"], category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 11, modelId: "DTX620", applicableModels: ["DTX620"], category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: 900, isMultiSelect: false },
        { id: 12, modelId: "DTX620", applicableModels: ["DTX620"], category: "walls", name: "Standard 24\" Walls", price: 0, isMultiSelect: false },
        { id: 13, modelId: "DTX620", applicableModels: ["DTX620"], category: "walls", name: "High 36\" Walls", price: 1500, isMultiSelect: false },
        { id: 14, modelId: "DTX620", applicableModels: ["DTX620"], category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 15, modelId: "DTX620", applicableModels: ["DTX620"], category: "color", name: "Custom Color", price: 1200, isMultiSelect: false }
      ],
      "FBX210": [
        { id: 16, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "24' Length", price: -2000, isMultiSelect: false },
        { id: 17, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "28' Length", price: 0, isMultiSelect: false },
        { id: 18, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "32' Length", price: 3000, isMultiSelect: false },
        { id: 19, modelId: "FBX210", applicableModels: ["FBX210"], category: "ramps", name: "No Ramps", price: 0, isMultiSelect: false },
        { id: 20, modelId: "FBX210", applicableModels: ["FBX210"], category: "ramps", name: "8' Slide-in Ramps", price: 1200, isMultiSelect: false }
      ],
      "TSX208": [
        { id: 21, modelId: "TSX208", applicableModels: ["TSX208"], category: "winch", name: "No Winch", price: 0, isMultiSelect: false },
        { id: 22, modelId: "TSX208", applicableModels: ["TSX208"], category: "winch", name: "12V Electric Winch", price: 1500, isMultiSelect: false }
      ]
    };

    Object.entries(optionsData).forEach(([modelId, options]) => {
      this.options.set(modelId, options);
    });
  }

  async getTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    return Array.from(this.categories.values());
  }

  async getAllTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    return Array.from(this.categories.values());
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]> {
    const category = Array.from(this.categories.values()).find(cat => cat.slug === categorySlug);
    if (!category) return [];
    
    return Array.from(this.models.values()).filter(model => model.categoryId === category.id);
  }

  async getTrailerModelsBySeries(seriesId: number): Promise<TrailerModelResponse[]> {
    return Array.from(this.models.values()).filter(model => model.seriesId === seriesId);
  }

  async getTrailerModel(modelId: string): Promise<TrailerModelResponse | undefined> {
    return this.models.get(modelId);
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOptionResponse[]> {
    return this.options.get(modelId) || [];
  }

  async getOptionsForModel(modelId: string): Promise<TrailerOptionResponse[]> {
    // Get non-length options from trailer_options
    const allOptions = Array.from(this.options.values()).flat();
    const nonLengthOptions = allOptions.filter(option => 
      option.applicableModels.includes(modelId) && option.category !== 'length'
    );

    // Get length options from the model's length_options JSON column
    const lengthOptions: TrailerOptionResponse[] = [];
    const model = Array.from(this.models.values()).flat().find(m => m.modelId === modelId);
    
    if (model && model.lengthOptions) {
      const lengths = typeof model.lengthOptions === 'string' 
        ? JSON.parse(model.lengthOptions) 
        : model.lengthOptions;
      
      const lengthPricing = model.lengthPrice || {};
      
      if (Array.isArray(lengths)) {
        lengths.forEach((length: string, index: number) => {
          lengthOptions.push({
            id: `length_${modelId}_${index}`,
            modelId: modelId,
            applicableModels: [modelId],
            name: length,
            price: lengthPricing[length] || 0, // Use pricing from length_price column
            category: 'length',
            imageUrl: null,
            isArchived: false,
            hexColor: null,
            primerPrice: 0,
          });
        });
      }
    }

    return [...nonLengthOptions, ...lengthOptions];
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

  // Password reset token operations (not supported in memory storage)
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    throw new Error("Password reset operations not supported in memory storage");
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    throw new Error("Password reset operations not supported in memory storage");
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    throw new Error("Password reset operations not supported in memory storage");
  }

  async deleteExpiredResetTokens(): Promise<void> {
    throw new Error("Password reset operations not supported in memory storage");
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

  async createOption(data: { name: string; price: number; category: string; modelId?: string; applicableModels?: string[]; hexColor?: string; primerPrice?: number }): Promise<TrailerOptionResponse> {
    // Support both legacy modelId and new applicableModels
    const applicableModels = data.applicableModels || (data.modelId ? [data.modelId] : []);
    const modelId = data.modelId || applicableModels[0] || "";
    
    const newOption: TrailerOptionResponse = {
      id: this.currentId++,
      modelId: modelId, // Backward compatibility
      applicableModels: applicableModels,
      name: data.name,
      category: data.category,
      price: data.price,
      isMultiSelect: false,
      hexColor: data.hexColor,
      primerPrice: data.primerPrice,
    };
    
    // Store the option in the map for each applicable model
    applicableModels.forEach(model => {
      const existingOptions = this.options.get(model) || [];
      if (!existingOptions.find(opt => opt.id === newOption.id)) {
        existingOptions.push(newOption);
        this.options.set(model, existingOptions);
      }
    });
    
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

  async restoreModel(id: number): Promise<TrailerModelResponse> {
    throw new Error("MemStorage restoreModel not implemented for pricing management");
  }

  async archiveCategory(id: number): Promise<void> {
    throw new Error("MemStorage archiveCategory not implemented for pricing management");
  }

  async restoreCategory(id: number): Promise<TrailerCategoryResponse> {
    throw new Error("MemStorage restoreCategory not implemented for pricing management");
  }

  async getOptionCategories(): Promise<string[]> {
    const allOptions = Array.from(this.options.values()).flat();
    const categories = new Set(allOptions.map(option => option.category));
    return Array.from(categories);
  }

  // Store Airtable config in memory (for development)
  private airtableConfig: { accessToken: string; baseId: string } | null = null;
  private adminSessions: Set<string> = new Set();

  async saveAirtableConfig(config: { accessToken: string; baseId: string }): Promise<void> {
    this.airtableConfig = config;
  }

  async getAirtableConfig(): Promise<{ accessToken: string; baseId: string } | null> {
    return this.airtableConfig;
  }

  isAdminSession(sessionId: string): boolean {
    // In development, consider all sessions as admin sessions for testing
    return true;
  }

  // Series management operations
  async getAllSeries(): Promise<any[]> {
    // Return empty array for mem storage
    return [];
  }

  async createSeries(data: { categoryId: number; name: string; description: string; slug: string; basePrice: number }): Promise<any> {
    // Basic implementation for mem storage
    const series = {
      id: this.currentId++,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return series;
  }

  async createModel(data: { categoryId: number; seriesId?: number; modelSeries: string; name: string; basePrice?: number; imageUrl: string; standardFeatures: string[]; gvwr?: string; payload?: string; deckSize?: string; axles?: string; lengthOptions?: string[]; pulltypeOptions?: string }): Promise<TrailerModelResponse> {
    // Basic implementation for mem storage
    const model: TrailerModelResponse = {
      id: this.currentId++,
      categoryId: data.categoryId,
      seriesId: data.seriesId,
      modelId: data.modelSeries,
      name: data.name,
      gvwr: "N/A",
      payload: "N/A", 
      deckSize: "N/A",
      axles: "N/A",
      basePrice: data.basePrice || 0,
      imageUrl: data.imageUrl,
      features: data.standardFeatures || [],
      isArchived: false,
    };
    this.models.set(model.modelId, model);
    return model;
  }

  async updateSeries(id: number, updates: any): Promise<any> {
    // Basic implementation for mem storage
    return { id, ...updates };
  }

  async deleteSeries(id: number): Promise<void> {
    // Basic implementation for mem storage
    return;
  }

  async archiveSeries(id: number): Promise<any> {
    // Basic implementation for mem storage
    return { id };
  }

  async restoreSeries(id: number): Promise<any> {
    // Basic implementation for mem storage
    return { id };
  }
}

export class DatabaseStorage implements IStorage {
  async getOptionsForModel(modelId: string): Promise<TrailerOptionResponse[]> {
    try {
      // Get non-length options from trailer_options table
      const optionsResult = await db.execute(sql`
        SELECT id, name, price, category, model_id, applicable_models, image_url, is_archived, hex_color, primer_price
        FROM trailer_options
        WHERE (is_archived IS NULL OR is_archived = false)
          AND (applicable_models IS NULL OR applicable_models @> ${JSON.stringify([modelId])})
          AND category != 'length'
        ORDER BY category, name
      `);
      
      const nonLengthOptions = optionsResult.rows.map((option: any) => ({
        id: option.id,
        modelId: option.model_id,
        applicableModels: option.applicable_models,
        name: option.name,
        price: option.price,
        category: option.category,
        imageUrl: option.image_url,
        isArchived: option.is_archived || false,
        hexColor: option.hex_color,
        primerPrice: option.primer_price,
      }));

      // Get length options from the model's length_options JSON column
      const lengthOptions: TrailerOptionResponse[] = [];
      const modelResult = await db.execute(sql`
        SELECT length_options, length_price
        FROM trailer_models
        WHERE model_id = ${modelId}
          AND (is_archived IS NULL OR is_archived = false)
        LIMIT 1
      `);

      if (modelResult.rows.length > 0) {
        const model = modelResult.rows[0] as any;
        if (model.length_options) {
          const lengths = typeof model.length_options === 'string' 
            ? JSON.parse(model.length_options) 
            : model.length_options;
          
          const lengthPricing = model.length_price 
            ? (typeof model.length_price === 'string' ? JSON.parse(model.length_price) : model.length_price)
            : {};
          
          if (Array.isArray(lengths)) {
            lengths.forEach((length: string, index: number) => {
              lengthOptions.push({
                id: `length_${modelId}_${index}`,
                modelId: modelId,
                applicableModels: [modelId],
                name: length,
                price: lengthPricing[length] || 0, // Use pricing from length_price column
                category: 'length',
                imageUrl: null,
                isArchived: false,
                hexColor: null,
                primerPrice: 0,
              });
            });
          }
        }
      }

      return [...nonLengthOptions, ...lengthOptions];
    } catch (error) {
      console.error('Error fetching options for model:', error);
      throw error;
    }
  }

  async getTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    try {
      // Dynamic pricing based on lowest model price in each category
      // Only return non-archived categories for public use
      const result = await db.execute(sql`
        SELECT 
          c.id, c.slug, c.name, c.description, c.image_url,
          COALESCE(c.is_archived, false) as is_archived,
          COALESCE(MIN(m.base_price), c.starting_price) as starting_price
        FROM trailer_categories c
        LEFT JOIN trailer_models m ON c.id = m.category_id 
          AND (m.is_archived IS NULL OR m.is_archived = false)
        WHERE COALESCE(c.is_archived, false) = false
        GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.starting_price, c.is_archived
        ORDER BY c.id
      `);
      
      return result.rows.map((cat: any) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        startingPrice: cat.starting_price,
        orderIndex: 0,
        isArchived: cat.is_archived
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getAllTrailerCategories(): Promise<TrailerCategoryResponse[]> {
    try {
      // Get all categories including archived ones for admin use
      const result = await db.execute(sql`
        SELECT 
          c.id, c.slug, c.name, c.description, c.image_url,
          COALESCE(c.is_archived, false) as is_archived,
          COALESCE(MIN(m.base_price), c.starting_price) as starting_price
        FROM trailer_categories c
        LEFT JOIN trailer_models m ON c.id = m.category_id 
          AND (m.is_archived IS NULL OR m.is_archived = false)
        GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.starting_price, c.is_archived
        ORDER BY c.id
      `);
      
      return result.rows.map((cat: any) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        startingPrice: cat.starting_price,
        orderIndex: 0,
        isArchived: cat.is_archived
      }));
    } catch (error) {
      console.error('Error fetching all categories:', error);
      throw error;
    }
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModelResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.model_id, m.name, m.payload, 
               m.deck_size, m.axles, m.base_price, m.image_url, m.features
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        WHERE c.slug = ${categorySlug} AND NOT m.is_archived
        ORDER BY m.id
      `);
      
      return result.rows.map((model: any) => ({
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,

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

  async getTrailerModelsBySeries(seriesId: number): Promise<TrailerModelResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name, m.payload,
               m.deck_size, m.axles, m.base_price, m.image_url, m.features,
               m.pulltype_options, m.length_options, m.length_price,
               m.is_archived, m.category_sub_type, c.name as category_name,
               s.name as series_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.series_id = ${seriesId} AND NOT m.is_archived
        ORDER BY m.name
      `);
      
      return result.rows.map((model: any) => ({
        id: model.id,
        categoryId: model.category_id,
        seriesId: model.series_id,
        seriesName: model.series_name,
        modelId: model.model_id,
        name: model.name,

        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || [],
        pulltypeOptions: model.pulltype_options,
        lengthOptions: model.length_options || [],
        lengthPrice: model.length_price,
        lengthGvwr: model.length_gvwr,
        categoryName: model.category_name,
        categorySubType: model.category_sub_type,
        isArchived: model.is_archived || false,
      }));
    } catch (error) {
      console.error('Error fetching models by series:', error);
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

  // Password Reset Token Operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    try {
      const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
      return newToken;
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw error;
    }
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    try {
      const [resetToken] = await db.select().from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      return resetToken;
    } catch (error) {
      console.error('Error fetching password reset token:', error);
      throw error;
    }
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    try {
      await db.update(passwordResetTokens)
        .set({ isUsed: true })
        .where(eq(passwordResetTokens.token, token));
    } catch (error) {
      console.error('Error marking password reset token as used:', error);
      throw error;
    }
  }

  async deleteExpiredResetTokens(): Promise<void> {
    try {
      await db.delete(passwordResetTokens).where(sql`expires_at < NOW() OR is_used = true`);
    } catch (error) {
      console.error('Error deleting expired password reset tokens:', error);
      throw error;
    }
  }

  // Pricing management operations
  async getAllModels(): Promise<TrailerModelResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name, m.payload,
               m.deck_size, m.axles, m.length_options, m.pulltype_options, m.length_price, m.length_gvwr, m.base_price, 
               m.image_url, m.features, m.is_archived, m.category_sub_type, c.name as category_name,
               s.name as series_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        LEFT JOIN trailer_series s ON m.series_id = s.id
        ORDER BY c.name, m.id
      `);
      
      console.log('Raw models result:', result.rows.length);
      
      return result.rows.map((model: any) => ({
        id: model.id,
        categoryId: model.category_id,
        seriesId: model.series_id,
        seriesName: model.series_name, // Now comes from the JOIN with trailer_series
        modelId: model.model_id,
        name: model.name,

        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        lengthOptions: model.length_options ? (typeof model.length_options === 'string' ? JSON.parse(model.length_options) : model.length_options) : null,
        pulltypeOptions: model.pulltype_options ? (typeof model.pulltype_options === 'string' ? JSON.parse(model.pulltype_options) : model.pulltype_options) : null,
        lengthPrice: model.length_price ? (typeof model.length_price === 'string' ? JSON.parse(model.length_price) : model.length_price) : null,
        lengthGvwr: model.length_gvwr ? (typeof model.length_gvwr === 'string' ? JSON.parse(model.length_gvwr) : model.length_gvwr) : null,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || [],
        categoryName: model.category_name,
        categorySubType: model.category_sub_type,
        isArchived: model.is_archived || false,
      }));
    } catch (error) {
      console.error('Error fetching all models:', error);
      throw new Error(`Failed to fetch models: ${(error as Error).message}`);
    }
  }

  async getAllSeries(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT s.id, s.name, s.category_id, s.slug, s.description, s.base_price, s.image_url,
               COALESCE(s.is_archived, false) as is_archived, c.name as category_name
        FROM trailer_series s
        JOIN trailer_categories c ON s.category_id = c.id
        ORDER BY c.name, s.name
      `);
      
      return result.rows.map((series: any) => ({
        id: series.id,
        name: series.name,
        categoryId: series.category_id,
        categoryName: series.category_name,
        slug: series.slug,
        description: series.description,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        isArchived: series.is_archived,
      }));
    } catch (error) {
      console.error('Error fetching all series:', error);
      throw error;
    }
  }

  async getAllOptions(): Promise<TrailerOptionResponse[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_archived, image_url, applicable_models, hex_color
        FROM trailer_options
        ORDER BY category, name
      `);
      
      return result.rows.map((option: any) => ({
        id: option.id,
        modelId: option.model_id,
        applicableModels: option.applicable_models || [option.model_id],
        name: option.name,
        category: option.category,
        price: option.price,
        isRequired: false,
        isMultiSelect: option.is_multi_select || false,
        isArchived: option.is_archived || false,
        imageUrl: option.image_url,
        options: [],
        hexColor: option.hex_color,
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
      if (updates.axles !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET axles = ${updates.axles}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthOptions !== undefined) {
        const lengthOptionsJson = updates.lengthOptions ? JSON.stringify(updates.lengthOptions) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_options = ${lengthOptionsJson}
          WHERE id = ${id}
        `);
      }
      if (updates.pulltypeOptions !== undefined) {
        const pulltypeOptionsJson = updates.pulltypeOptions ? JSON.stringify(updates.pulltypeOptions) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET pulltype_options = ${pulltypeOptionsJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthPrice !== undefined) {
        const lengthPriceJson = updates.lengthPrice ? JSON.stringify(updates.lengthPrice) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_price = ${lengthPriceJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthGvwr !== undefined) {
        const lengthGvwrJson = updates.lengthGvwr ? JSON.stringify(updates.lengthGvwr) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_gvwr = ${lengthGvwrJson}
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
      if (updates.categorySubType !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET category_sub_type = ${updates.categorySubType}
          WHERE id = ${id}
        `);
      }
      if (updates.seriesId !== undefined) {
        console.log(`🔄 Attempting to update series_id to ${updates.seriesId} for model ${id}`);
        const updateResult = await db.execute(sql`
          UPDATE trailer_models 
          SET series_id = ${updates.seriesId}
          WHERE id = ${id}
        `);
        console.log(`✅ Series_id update result:`, updateResult);
      }
      if (updates.isArchived !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET is_archived = ${updates.isArchived}
          WHERE id = ${id}
        `);
      }
      if (updates.imageUrl !== undefined) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET image_url = ${updates.imageUrl}
          WHERE id = ${id}
        `);
      }
      
      // Get the updated record with series information
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name, m.payload,
               m.deck_size, m.axles, m.length_options, m.pulltype_options, m.base_price, 
               m.image_url, m.features, m.is_archived, m.category_sub_type, s.name as series_name
        FROM trailer_models m
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.id = ${id}
      `);
      
      const updatedModel = result.rows[0] as any;
      
      // Clear cache after updating model to ensure fresh data
      cache.clear();
      
      return {
        id: updatedModel.id,
        categoryId: updatedModel.category_id,
        seriesId: updatedModel.series_id,
        seriesName: updatedModel.series_name, // From the JOIN with trailer_series
        modelId: updatedModel.model_id,
        name: updatedModel.name,
        gvwr: updatedModel.gvwr,
        payload: updatedModel.payload,
        deckSize: updatedModel.deck_size,
        axles: updatedModel.axles,
        lengthOptions: updatedModel.length_options ? (typeof updatedModel.length_options === 'string' ? JSON.parse(updatedModel.length_options) : updatedModel.length_options) : null,
        pulltypeOptions: updatedModel.pulltype_options,
        basePrice: updatedModel.base_price,
        imageUrl: updatedModel.image_url,
        features: updatedModel.features || [],
        categorySubType: updatedModel.category_sub_type,
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
      if (updates.applicableModels !== undefined) updateData.applicable_models = updates.applicableModels;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
      if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
      
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
        if (updates.imageUrl !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET image_url = ${updates.imageUrl}
            WHERE id = ${id}
          `);
        }
        if (updates.applicableModels !== undefined) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET applicable_models = ${JSON.stringify(updates.applicableModels)}
            WHERE id = ${id}
          `);
        }
      }
      
      // Get the updated record
      result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_archived, image_url, applicable_models
        FROM trailer_options WHERE id = ${id}
      `);
      
      const updatedOption = result.rows[0] as any;
      return {
        id: updatedOption.id,
        modelId: updatedOption.model_id,
        applicableModels: updatedOption.applicable_models || [],
        name: updatedOption.name,
        category: updatedOption.category,
        price: updatedOption.price,
        isMultiSelect: updatedOption.is_multi_select || false,
        isArchived: updatedOption.is_archived || false,
        imageUrl: updatedOption.image_url,
      };
    } catch (error) {
      console.error('Error updating option:', error);
      throw error;
    }
  }

  async createOption(data: { name: string; price: number; category: string; modelId?: string; applicableModels?: string[]; hexColor?: string; primerPrice?: number }): Promise<TrailerOptionResponse> {
    try {
      // Support both legacy modelId and new applicableModels
      const applicableModels = data.applicableModels || (data.modelId ? [data.modelId] : []);
      const modelId = data.modelId || applicableModels[0] || "";
      
      const result = await db.execute(sql`
        INSERT INTO trailer_options (model_id, name, category, price, is_multi_select, applicable_models, hex_color, primer_price)
        VALUES (${modelId}, ${data.name}, ${data.category}, ${data.price}, false, ${JSON.stringify(applicableModels)}, ${data.hexColor || null}, ${data.primerPrice || null})
        RETURNING id, model_id, name, category, price, is_multi_select, applicable_models, hex_color, primer_price
      `);
      
      const newOption = result.rows[0] as any;
      return {
        id: newOption.id,
        modelId: newOption.model_id,
        applicableModels: newOption.applicable_models || [],
        name: newOption.name,
        category: newOption.category,
        price: newOption.price,
        isRequired: false,
        isMultiSelect: newOption.is_multi_select || false,
        options: [],
        hexColor: newOption.hex_color,
        primerPrice: newOption.primer_price,
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

  async restoreOption(id: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE trailer_options 
        SET is_archived = false
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error restoring option:', error);
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

  async restoreModel(modelId: number): Promise<TrailerModelResponse> {
    try {
      await db.execute(sql`
        UPDATE trailer_models 
        SET is_archived = false 
        WHERE id = ${modelId}
      `);
      
      // Return the restored model
      const result = await db.execute(sql`
        SELECT m.*, c.name as category_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        WHERE m.id = ${modelId}
      `);
      
      const model = result.rows[0] as any;
      return {
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,

        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        features: model.features || [],
        categoryName: model.category_name,
        isArchived: false
      };
    } catch (error) {
      console.error('Error restoring model:', error);
      throw error;
    }
  }

  async archiveCategory(id: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE trailer_categories 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error archiving category:', error);
      throw error;
    }
  }

  async restoreCategory(categoryId: number): Promise<TrailerCategoryResponse> {
    try {
      await db.execute(sql`
        UPDATE trailer_categories 
        SET is_archived = false 
        WHERE id = ${categoryId}
      `);
      
      // Return the restored category
      const result = await db.execute(sql`
        SELECT * FROM trailer_categories
        WHERE id = ${categoryId}
      `);
      
      const category = result.rows[0] as any;
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.image_url,
        startingPrice: category.starting_price,
        orderIndex: category.order_index,
        isArchived: false
      };
    } catch (error) {
      console.error('Error restoring category:', error);
      throw error;
    }
  }

  async getOptionCategories(): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories 
        WHERE "Name" IS NOT NULL 
        ORDER BY "Name"
      `);
      return result.rows.map((row: any) => row.Name);
    } catch (error) {
      console.error('Error fetching option categories:', error);
      throw error;
    }
  }

  // Airtable configuration methods (stored in memory for now)
  private airtableConfig: { accessToken: string; baseId: string } | null = null;

  async saveAirtableConfig(config: { accessToken: string; baseId: string }): Promise<void> {
    // In production, this would be saved to the database
    // For now, store in memory
    this.airtableConfig = config;
  }

  async getAirtableConfig(): Promise<{ accessToken: string; baseId: string } | null> {
    return this.airtableConfig;
  }

  isAdminSession(sessionId: string): boolean {
    // For now, we'll trust the sessionId if it exists
    // In production, this would check a cached session store
    return !!sessionId;
  }

  // Series management operations - this is the correct getAllSeries implementation

  async getSeriesByCategory(categorySlug: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT s.id, s.category_id, s.name, s.description, s.slug, s.base_price,
               s.image_url, COALESCE(s.is_archived, false) as is_archived,
               s.created_at, s.updated_at, c.name as category_name
        FROM trailer_series s
        JOIN trailer_categories c ON s.category_id = c.id
        WHERE c.slug = ${categorySlug} AND COALESCE(s.is_archived, false) = false
        ORDER BY s.name
      `);
      
      return result.rows.map((series: any) => ({
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching series by category:', error);
      throw error;
    }
  }

  async createSeries(data: { categoryId: number; name: string; description: string; slug: string; basePrice: number; imageUrl?: string }): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO trailer_series (category_id, name, description, slug, base_price, image_url)
        VALUES (${data.categoryId}, ${data.name}, ${data.description}, ${data.slug}, ${data.basePrice}, ${data.imageUrl || null})
        RETURNING id, category_id, name, description, slug, base_price, image_url, created_at, updated_at
      `);
      
      const series = result.rows[0] as any;
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        createdAt: series.created_at,
        updatedAt: series.updated_at,
      };
    } catch (error) {
      console.error('Error creating series:', error);
      throw error;
    }
  }

  async createModel(data: { categoryId: number; seriesId?: number; modelSeries: string; name: string; basePrice?: number; imageUrl: string; standardFeatures: string[]; gvwr?: string; payload?: string; deckSize?: string; axles?: string; lengthOptions?: string[]; pulltypeOptions?: string }): Promise<TrailerModelResponse> {
    try {
      const result = await db.execute(sql`
        INSERT INTO trailer_models (category_id, series_id, model_id, name, base_price, image_url, features, gvwr, payload, deck_size, axles, length_options, pulltype_options)
        VALUES (${data.categoryId}, ${data.seriesId || null}, ${data.modelSeries}, ${data.name}, ${data.basePrice || 0}, ${data.imageUrl}, ${JSON.stringify(data.standardFeatures)}, ${data.gvwr || null}, ${data.payload || null}, ${data.deckSize || null}, ${data.axles || null}, ${data.lengthOptions ? JSON.stringify(data.lengthOptions) : null}, ${data.pulltypeOptions ? JSON.stringify(data.pulltypeOptions) : null})
        RETURNING id, category_id, series_id, model_id, name, base_price, image_url, features, gvwr, payload, deck_size, axles, length_options, pulltype_options
      `);
      
      const model = result.rows[0] as any;
      
      // Get category name
      const categoryResult = await db.execute(sql`
        SELECT name FROM trailer_categories WHERE id = ${model.category_id}
      `);
      const categoryName = categoryResult.rows[0]?.name || 'Unknown Category';
      
      // Get series name if series_id exists
      let seriesName = "No Series";
      if (model.series_id) {
        const seriesResult = await db.execute(sql`
          SELECT name FROM trailer_series WHERE id = ${model.series_id}
        `);
        seriesName = seriesResult.rows[0]?.name || 'Unknown Series';
      }
      
      return {
        id: model.id,
        categoryId: model.category_id,
        categoryName: categoryName,
        seriesName: seriesName,
        modelId: model.model_id,
        name: model.name,

        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        lengthOptions: model.length_options ? (typeof model.length_options === 'string' ? JSON.parse(model.length_options) : model.length_options) : null,
        pulltypeOptions: model.pulltype_options ? (typeof model.pulltype_options === 'string' ? JSON.parse(model.pulltype_options) : model.pulltype_options) : null,
        lengthPrice: model.length_price ? (typeof model.length_price === 'string' ? JSON.parse(model.length_price) : model.length_price) : null,
        imageUrl: model.image_url,
        features: JSON.parse(model.features),
        basePrice: model.base_price || 0,
        isArchived: false,
      };
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }

  async updateSeries(id: number, updates: any): Promise<any> {
    try {
      // Use individual SQL statements to avoid parameter issues
      if (updates.categoryId !== undefined) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET category_id = ${updates.categoryId}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== undefined) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.description !== undefined) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET description = ${updates.description}
          WHERE id = ${id}
        `);
      }
      if (updates.slug !== undefined) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET slug = ${updates.slug}
          WHERE id = ${id}
        `);
      }
      if (updates.basePrice !== undefined) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET base_price = ${updates.basePrice}
          WHERE id = ${id}
        `);
      }
      
      // Get the updated record
      const result = await db.execute(sql`
        SELECT id, category_id, name, description, slug, base_price, created_at, updated_at
        FROM trailer_series WHERE id = ${id}
      `);
      
      const series = result.rows[0] as any;
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        createdAt: series.created_at,
        updatedAt: series.updated_at,
      };
    } catch (error) {
      console.error('Error updating series:', error);
      throw error;
    }
  }

  async deleteSeries(id: number): Promise<void> {
    try {
      // Check if series has any non-archived models
      const modelsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM trailer_models 
        WHERE series_id = ${id} AND NOT is_archived
      `);
      
      const modelsCount = (modelsResult.rows[0] as any).count;
      if (modelsCount > 0) {
        throw new Error("Cannot delete series with existing active models. Archive all models first.");
      }
      
      // Set series_id to NULL for any archived models to avoid foreign key constraint violation
      await db.execute(sql`
        UPDATE trailer_models 
        SET series_id = NULL 
        WHERE series_id = ${id} AND is_archived = true
      `);
      
      // Now delete the series
      await db.execute(sql`
        DELETE FROM trailer_series 
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error deleting series:', error);
      throw error;
    }
  }

  async archiveSeries(id: number): Promise<any> {
    try {
      await db.execute(sql`
        UPDATE trailer_series 
        SET is_archived = true
        WHERE id = ${id}
      `);
      
      const result = await db.execute(sql`
        SELECT s.*, c.name as category_name
        FROM trailer_series s
        LEFT JOIN trailer_categories c ON s.category_id = c.id
        WHERE s.id = ${id}
      `);
      
      const series = result.rows[0] as any;
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error('Error archiving series:', error);
      throw error;
    }
  }

  async restoreSeries(id: number): Promise<any> {
    try {
      await db.execute(sql`
        UPDATE trailer_series 
        SET is_archived = false
        WHERE id = ${id}
      `);
      
      const result = await db.execute(sql`
        SELECT s.*, c.name as category_name
        FROM trailer_series s
        LEFT JOIN trailer_categories c ON s.category_id = c.id
        WHERE s.id = ${id}
      `);
      
      const series = result.rows[0] as any;
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error('Error restoring series:', error);
      throw error;
    }
  }

  // Category management operations
  async updateCategory(id: number, updates: any): Promise<any> {
    try {
      // Use individual SQL statements to avoid parameter issues
      if (updates.slug !== undefined) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET slug = ${updates.slug}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== undefined) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.description !== undefined) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET description = ${updates.description}
          WHERE id = ${id}
        `);
      }
      if (updates.imageUrl !== undefined) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET image_url = ${updates.imageUrl}
          WHERE id = ${id}
        `);
      }
      if (updates.startingPrice !== undefined) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET starting_price = ${updates.startingPrice}
          WHERE id = ${id}
        `);
      }
      
      // Get the updated record
      const result = await db.execute(sql`
        SELECT id, slug, name, description, image_url, starting_price
        FROM trailer_categories WHERE id = ${id}
      `);
      
      const category = result.rows[0] as any;
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.image_url,
        startingPrice: category.starting_price,
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }
}

// Import no-database storage for production fallback
import { NoDatabaseStorage } from "./no-db-storage";

// Use appropriate storage based on environment and database availability
let storageInstance: IStorage | null = null;

function getStorage(): IStorage {
  if (!storageInstance) {
    if (isDatabaseAvailable && process.env.DATABASE_URL) {
      console.log('Using database storage');
      storageInstance = new DatabaseStorage();
    } else if (process.env.NODE_ENV === 'production') {
      console.log('Using no-database storage for production');
      storageInstance = new NoDatabaseStorage();
    } else {
      console.log('Using in-memory storage for development');
      storageInstance = new MemStorage();
    }
  }
  return storageInstance!;
}

export const storage = getStorage();
