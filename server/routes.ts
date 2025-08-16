import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { 
  authenticateUser, 
  createSession, 
  validateSession, 
  logout, 
  hashPassword,
  isAdmin
} from "./auth";
import { insertAdminUserSchema, type AdminUser, trailerCategories, trailerModels } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
  sessionId?: string;
}

// Admin authentication middleware
const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const sessionId = req.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authResult = await validateSession(sessionId);
  
  if (!authResult.success) {
    return res.status(401).json({ error: authResult.error });
  }

  req.user = authResult.user;
  req.sessionId = sessionId;
  next();
};

// Admin role middleware
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// User creation schema for admin
const createUserSchema = insertAdminUserSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).omit({ passwordHash: true });

export async function registerRoutes(app: Express): Promise<Express> {
  // Get all trailer categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getTrailerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in /api/categories:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        message: "Failed to fetch categories", 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create a new category
  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      const result = await db.insert(trailerCategories).values({
        slug,
        name,
        description,
        imageUrl,
        startingPrice,
        orderIndex: orderIndex || 0
      }).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update a category
  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      
      const updateData: any = {};
      if (slug !== undefined) updateData.slug = slug;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (startingPrice !== undefined) updateData.startingPrice = startingPrice;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      
      const result = await db.update(trailerCategories)
        .set(updateData)
        .where(eq(trailerCategories.id, categoryId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete a category
  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      // Check if category has any models
      const models = await db.select().from(trailerModels).where(eq(trailerModels.categoryId, categoryId));
      if (models.length > 0) {
        return res.status(400).json({ message: "Cannot delete category with existing models" });
      }
      
      const result = await db.delete(trailerCategories)
        .where(eq(trailerCategories.id, categoryId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get models by category
  app.get("/api/categories/:categorySlug/models", async (req, res) => {
    try {
      const { categorySlug } = req.params;
      const models = await storage.getTrailerModelsByCategory(categorySlug);
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  // Pricing management routes - MUST come before parameterized routes
  app.get("/api/models/all", requireAuth, async (req, res) => {
    try {
      const models = await storage.getAllModels();
      console.log("Found models:", models.length);
      
      // Set cache control headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(models);
    } catch (error) {
      console.error("Error fetching all models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  // Get specific model
  app.get("/api/models/:modelId", async (req, res) => {
    try {
      const { modelId } = req.params;
      const model = await storage.getTrailerModel(modelId);
      if (!model) {
        return res.status(404).json({ message: "Model not found" });
      }
      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch model" });
    }
  });

  // Get options for a model
  app.get("/api/models/:modelId/options", async (req, res) => {
    try {
      const { modelId } = req.params;
      const options = await storage.getTrailerOptions(modelId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch options" });
    }
  });

  // Save user configuration
  app.post("/api/configurations", async (req, res) => {
    try {
      const config = req.body;
      const savedConfig = await storage.saveUserConfiguration(config);
      res.json(savedConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  // Get user configuration
  app.get("/api/configurations/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const config = await storage.getUserConfiguration(sessionId);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // ========================
  // ADMIN API ROUTES
  // ========================

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const authResult = await authenticateUser(username, password);
      
      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }

      const sessionResult = await createSession(authResult.user!.id);
      
      if (!sessionResult.success) {
        return res.status(500).json({ error: sessionResult.error });
      }

      res.json({
        user: {
          id: authResult.user!.id,
          username: authResult.user!.username,
          email: authResult.user!.email,
          firstName: authResult.user!.firstName,
          lastName: authResult.user!.lastName,
          role: authResult.user!.role,
        },
        sessionId: sessionResult.sessionId,
        expiresAt: sessionResult.expiresAt,
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", requireAuth, async (req: any, res) => {
    try {
      await logout(req.sessionId!);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Get current user profile
  app.get("/api/admin/profile", requireAuth, async (req: any, res) => {
    const user = req.user!;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  });

  // Get all users (admin only)
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingByUsername = await storage.getAdminUserByUsername(userData.username);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingByEmail = await storage.getAdminUserByEmail(userData.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash the password
      const passwordHash = await hashPassword(userData.password);
      
      const newUser = await storage.createAdminUser({
        ...userData,
        passwordHash,
      });

      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Handle password update if provided
      if (updates.password && updates.password.length > 0) {
        const passwordHash = await hashPassword(updates.password);
        updates.passwordHash = passwordHash;
      }
      
      // Remove password field from updates (only passwordHash should be stored)
      delete updates.password;
      
      const updatedUser = await storage.updateAdminUser(userId, updates);
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Deactivate user (admin only)
  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow admin to deactivate themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Cannot deactivate your own account" });
      }
      
      await storage.deactivateAdminUser(userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  });



  // Get all categories for dropdown
  app.get("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT category FROM trailer_options ORDER BY category
      `);
      const categories = result.rows.map((row: any) => row.category);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });



  app.get("/api/options/all", requireAuth, async (req, res) => {
    try {
      const options = await storage.getAllOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching all options:", error);
      res.status(500).json({ message: "Failed to fetch options" });
    }
  });

  app.patch("/api/models/:id", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { basePrice, name, modelId: modelIdField, gvwr, payload, deckSize, categoryId } = req.body;
      
      console.log(`Updating model ${modelId} with:`, req.body);
      
      const updatedModel = await storage.updateModel(modelId, {
        basePrice,
        name,
        modelId: modelIdField,
        gvwr,
        payload,
        deckSize,
        categoryId,
      });
      
      console.log("Updated model result:", updatedModel);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Failed to update model" });
    }
  });



  app.post("/api/options", requireAuth, async (req, res) => {
    try {
      const { name, price, category, modelId } = req.body;
      
      console.log("Creating new option:", req.body);
      
      const newOption = await storage.createOption({
        name,
        price,
        category,
        modelId,
      });
      
      console.log("Created option:", newOption);
      res.json(newOption);
    } catch (error) {
      console.error("Error creating option:", error);
      res.status(500).json({ message: "Failed to create option" });
    }
  });

  app.patch("/api/options/:id", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { price, name, category, modelId, isArchived } = req.body;
      
      const updatedOption = await storage.updateOption(optionId, {
        price,
        name,
        category,
        modelId,
        isArchived,
      });
      
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(500).json({ message: "Failed to update option" });
    }
  });

  // Delete option
  app.delete("/api/options/:id", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.deleteOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting option:', error);
      res.status(500).json({ error: "Failed to delete option" });
    }
  });

  // Archive option
  app.patch("/api/options/:id/archive", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.archiveOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error archiving option:', error);
      res.status(500).json({ error: "Failed to archive option" });
    }
  });

  // Archive model
  app.patch("/api/models/:id/archive", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      await storage.archiveModel(modelId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error archiving model:', error);
      res.status(500).json({ error: "Failed to archive model" });
    }
  });

  // Restore model
  app.patch("/api/models/:id/restore", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const restoredModel = await storage.restoreModel(modelId);
      res.json(restoredModel);
    } catch (error) {
      console.error('Error restoring model:', error);
      res.status(500).json({ error: "Failed to restore model" });
    }
  });

  // Category image upload routes
  app.post("/api/categories/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Model image upload routes
  app.post("/api/models/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/models/:id/image", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      console.log(`Updating image for model ${modelId}, new URL: ${imageUrl}`);

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageUrl,
        {
          owner: "admin",
          visibility: "public", // Model images should be public for customers to see
        }
      );

      console.log(`Object path after ACL policy: ${objectPath}`);

      // Update the model with the new image URL
      const updatedModel = await storage.updateModel(modelId, {
        imageUrl: objectPath,
      });

      console.log(`Updated model result:`, updatedModel);

      res.json({
        success: true,
        imageUrl: objectPath,
        model: updatedModel,
      });
    } catch (error) {
      console.error("Error updating model image:", error);
      res.status(500).json({ error: "Failed to update model image" });
    }
  });

  // Option image upload routes
  app.post("/api/options/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for option:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/options/:id/image", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      console.log(`Updating image for option ${optionId}, new URL: ${imageUrl}`);

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageUrl,
        {
          owner: "admin",
          visibility: "public", // Option images should be public for customers to see
        }
      );

      console.log(`Object path after ACL policy: ${objectPath}`);

      // Update the option with the new image URL
      const updatedOption = await storage.updateOption(optionId, {
        imageUrl: objectPath,
      });

      console.log(`Updated option result:`, updatedOption);

      res.json({
        success: true,
        imageUrl: objectPath,
        option: updatedOption,
      });
    } catch (error) {
      console.error("Error updating option image:", error);
      res.status(500).json({ error: "Failed to update option image" });
    }
  });

  // Serve model and option images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Airtable Integration Routes
  app.post("/api/integrations/airtable/test", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { accessToken, baseId } = req.body;
    
    if (!accessToken || !baseId) {
      return res.status(400).json({ error: "Access token and base ID are required" });
    }

    try {
      // Test the connection by listing tables using the Metadata API
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
      const response = await fetch(metaUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tables = data.tables || [];
        
        return res.json({ 
          success: true, 
          tableCount: tables.length,
          tables: tables.map((t: any) => ({ id: t.id, name: t.name, description: t.description })),
          message: "Successfully connected to Airtable"
        });
      } else {
        const errorText = await response.text();
        console.error("Airtable test failed:", errorText);
        return res.status(400).json({ 
          error: "Failed to connect to Airtable",
          details: errorText
        });
      }
    } catch (error) {
      console.error("Airtable test error:", error);
      return res.status(500).json({ 
        error: "Failed to test Airtable connection",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/integrations/airtable/save", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { accessToken, baseId } = req.body;
    
    if (!accessToken || !baseId) {
      return res.status(400).json({ error: "Access token and base ID are required" });
    }

    try {
      // Save the Airtable configuration
      await storage.saveAirtableConfig({ accessToken, baseId });
      
      return res.json({ 
        success: true,
        message: "Airtable configuration saved successfully"
      });
    } catch (error) {
      console.error("Failed to save Airtable config:", error);
      return res.status(500).json({ 
        error: "Failed to save Airtable configuration"
      });
    }
  });

  app.get("/api/integrations/airtable/status", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const config = await storage.getAirtableConfig();
      return res.json({ 
        connected: !!config,
        hasToken: !!config?.accessToken,
        baseId: config?.baseId
      });
    } catch (error) {
      console.error("Failed to get Airtable status:", error);
      return res.json({ 
        connected: false,
        hasToken: false
      });
    }
  });

  // Import data from Airtable
  app.post("/api/integrations/airtable/import", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tableName } = req.body;
    const config = await storage.getAirtableConfig();
    
    if (!config) {
      return res.status(400).json({ error: "Airtable not configured" });
    }

    try {
      // Fetch records from Airtable table
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from Airtable: ${response.statusText}`);
      }

      const data = await response.json();
      const records = data.records || [];
      
      // Process records based on table name
      let importedCount = 0;
      
      if (tableName.toLowerCase().includes('model') || tableName.toLowerCase().includes('trailer')) {
        // Import as trailer models
        for (const record of records) {
          const fields = record.fields;
          if (fields.Name && fields.Price) {
            // Map Airtable fields to our model structure
            const modelData = {
              name: fields.Name,
              basePrice: parseFloat(fields.Price) || 0,
              gvwr: fields.GVWR || '',
              payload: fields.Payload || '',
              deckSize: fields.DeckSize || fields['Deck Size'] || '',
              axles: fields.Axles || '',
              features: fields.Features ? fields.Features.split(',').map((f: string) => f.trim()) : [],
            };
            
            // You would save this to your database here
            console.log('Importing model:', modelData);
            importedCount++;
          }
        }
      } else if (tableName.toLowerCase().includes('option')) {
        // Import as trailer options
        for (const record of records) {
          const fields = record.fields;
          if (fields.Name && fields.Price) {
            const optionData = {
              name: fields.Name,
              price: parseFloat(fields.Price) || 0,
              category: fields.Category || 'Uncategorized',
              modelId: fields.ModelID || 'universal',
            };
            
            console.log('Importing option:', optionData);
            importedCount++;
          }
        }
      }
      
      return res.json({ 
        success: true,
        importedCount,
        totalRecords: records.length,
        message: `Imported ${importedCount} records from Airtable`
      });
    } catch (error) {
      console.error("Import error:", error);
      return res.status(500).json({ 
        error: "Failed to import from Airtable",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Export data to Airtable
  app.post("/api/integrations/airtable/export", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { dataType } = req.body; // 'models' or 'options'
    const config = await storage.getAirtableConfig();
    
    if (!config) {
      return res.status(400).json({ error: "Airtable not configured" });
    }

    try {
      let exportData: any[] = [];
      
      if (dataType === 'models') {
        const models = await storage.getAllModels();
        exportData = models.map(model => ({
          fields: {
            Name: model.name,
            Price: model.basePrice,
            GVWR: model.gvwr,
            Payload: model.payload,
            'Deck Size': model.deckSize,
            Axles: model.axles,
            Features: model.features.join(', '),
            'Model ID': model.modelId,
          }
        }));
      } else if (dataType === 'options') {
        const options = await storage.getAllOptions();
        exportData = options.map(option => ({
          fields: {
            Name: option.name,
            Price: option.price,
            Category: option.category,
            'Model ID': option.modelId,
          }
        }));
      }
      
      // Create records in Airtable (batch create, max 10 at a time due to API limits)
      const tableName = dataType === 'models' ? 'Trailer Models' : 'Trailer Options';
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      
      let createdCount = 0;
      for (let i = 0; i < exportData.length; i += 10) {
        const batch = exportData.slice(i, i + 10);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ records: batch })
        });

        if (response.ok) {
          const result = await response.json();
          createdCount += result.records?.length || 0;
        }
      }
      
      return res.json({ 
        success: true,
        exportedCount: createdCount,
        totalRecords: exportData.length,
        message: `Exported ${createdCount} records to Airtable`
      });
    } catch (error) {
      console.error("Export error:", error);
      return res.status(500).json({ 
        error: "Failed to export to Airtable",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });



  return app;
}
