import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  authenticateUser, 
  createSession, 
  validateSession, 
  logout, 
  hashPassword,
  isAdmin
} from "./auth";
import { insertAdminUserSchema, type AdminUser } from "@shared/schema";
import { z } from "zod";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all trailer categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getTrailerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in /api/categories:", error);
      res.status(500).json({ message: "Failed to fetch categories", error: error instanceof Error ? error.message : String(error) });
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
      
      // Don't allow password updates through this endpoint
      delete updates.passwordHash;
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

  // Pricing management routes
  app.get("/api/models/all", requireAuth, async (req, res) => {
    try {
      const models = await storage.getAllModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching all models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
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
      const { basePrice, name } = req.body;
      
      const updatedModel = await storage.updateModel(modelId, {
        basePrice,
        name,
      });
      
      res.json(updatedModel);
    } catch (error) {
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Failed to update model" });
    }
  });



  app.patch("/api/options/:id", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { price, name, category, modelId } = req.body;
      
      const updatedOption = await storage.updateOption(optionId, {
        price,
        name,
        category,
        modelId,
      });
      
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(500).json({ message: "Failed to update option" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
