import { 
  trailerCategories, 
  trailerModels, 
  trailerOptions,
  userConfigurations,
  type TrailerCategory, 
  type TrailerModel, 
  type TrailerOption,
  type UserConfiguration,
  type InsertUserConfiguration 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getTrailerCategories(): Promise<TrailerCategory[]>;
  getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModel[]>;
  getTrailerModel(modelId: string): Promise<TrailerModel | undefined>;
  getTrailerOptions(modelId: string): Promise<TrailerOption[]>;
  saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration>;
  getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, TrailerCategory>;
  private models: Map<string, TrailerModel>;
  private options: Map<string, TrailerOption[]>;
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
    const categoriesData: TrailerCategory[] = [
      {
        id: 1,
        slug: "gooseneck",
        name: "Gooseneck Trailers",
        description: "Heavy-duty trailers with superior stability and higher payload capacity. Perfect for construction and industrial applications.",
        imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 18500
      },
      {
        id: 2,
        slug: "tilt",
        name: "Tilt Equipment Trailers",
        description: "Hydraulic tilt design for easy loading of heavy machinery and equipment. Built for maximum durability.",
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 15200
      },
      {
        id: 3,
        slug: "dump",
        name: "Dump Trailers",
        description: "Hydraulic dump systems with reinforced beds. Ideal for landscaping, construction, and material hauling.",
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 12500
      },
      {
        id: 4,
        slug: "hauler",
        name: "Car/Equipment Haulers",
        description: "Low-profile design with drive-over fenders. Perfect for transporting vehicles and low-clearance equipment.",
        imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 14800
      },
      {
        id: 5,
        slug: "landscape",
        name: "Landscape Trailers",
        description: "Side gates and removable ramps for easy loading. Designed specifically for landscaping professionals.",
        imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 8900
      }
    ];

    categoriesData.forEach(cat => this.categories.set(cat.id, cat));

    // Initialize models
    const modelsData: TrailerModel[] = [
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
    const optionsData: Record<string, TrailerOption[]> = {
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

  async getTrailerCategories(): Promise<TrailerCategory[]> {
    return Array.from(this.categories.values());
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModel[]> {
    const category = Array.from(this.categories.values()).find(cat => cat.slug === categorySlug);
    if (!category) return [];
    
    return Array.from(this.models.values()).filter(model => model.categoryId === category.id);
  }

  async getTrailerModel(modelId: string): Promise<TrailerModel | undefined> {
    return this.models.get(modelId);
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOption[]> {
    return this.options.get(modelId) || [];
  }

  async saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration> {
    const id = this.currentId++;
    const userConfig: UserConfiguration = { ...config, id };
    this.configurations.set(config.sessionId, userConfig);
    return userConfig;
  }

  async getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined> {
    return this.configurations.get(sessionId);
  }
}

export class DatabaseStorage implements IStorage {
  async getTrailerCategories(): Promise<TrailerCategory[]> {
    return await db.select().from(trailerCategories);
  }

  async getTrailerModelsByCategory(categorySlug: string): Promise<TrailerModel[]> {
    const category = await db.select().from(trailerCategories).where(eq(trailerCategories.slug, categorySlug));
    if (category.length === 0) return [];
    
    return await db.select().from(trailerModels).where(eq(trailerModels.categoryId, category[0].id));
  }

  async getTrailerModel(modelId: string): Promise<TrailerModel | undefined> {
    const models = await db.select().from(trailerModels).where(eq(trailerModels.modelId, modelId));
    return models[0];
  }

  async getTrailerOptions(modelId: string): Promise<TrailerOption[]> {
    return await db.select().from(trailerOptions).where(eq(trailerOptions.modelId, modelId));
  }

  async saveUserConfiguration(config: InsertUserConfiguration): Promise<UserConfiguration> {
    const result = await db.insert(userConfigurations).values(config).returning();
    return result[0];
  }

  async getUserConfiguration(sessionId: string): Promise<UserConfiguration | undefined> {
    const configs = await db.select().from(userConfigurations).where(eq(userConfigurations.sessionId, sessionId));
    return configs[0];
  }
}

// Use database storage in production, fallback to memory for development
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
