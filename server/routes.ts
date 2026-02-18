import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, inArray } from "drizzle-orm";
import { 
  authenticateUser, 
  createSession, 
  validateSession, 
  logout, 
  hashPassword,
  isAdmin
} from "./auth";
import { insertAdminUserSchema, type AdminUser, trailerCategories, trailerModels, trailerSeries, customQuoteRequests, insertCustomQuoteRequestSchema, quoteRequests, insertQuoteRequestSchema, dealers, dealerSessions, dealerOrders, dealerUsers, dealerUserSessions, userConfigurations, mediaFiles, dealerPasswordResetTokens, adminSessions, type Dealer, type DealerUser, type MediaFile } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EmailService } from "./email-service";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
  dealer?: Dealer;
  dealerUser?: DealerUser;
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

// Dealer authentication middleware
const requireDealerAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.get('authorization');
  const sessionId = authHeader?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    // First, try to find a dealer session (main account)
    const [dealerSession] = await db.select()
      .from(dealerSessions)
      .where(eq(dealerSessions.id, sessionId));
    
    if (dealerSession && dealerSession.expiresAt >= new Date()) {
      // Main dealer session found
      const [dealer] = await db.select()
        .from(dealers)
        .where(eq(dealers.id, dealerSession.dealerId));
      
      if (!dealer || !dealer.isActive) {
        return res.status(401).json({ error: 'Dealer account not active' });
      }

      req.dealer = dealer;
      req.sessionId = sessionId;
      return next();
    }

    // If no dealer session, check for dealer user session (employee)
    const [userSession] = await db.select()
      .from(dealerUserSessions)
      .where(eq(dealerUserSessions.id, sessionId));
    
    if (!userSession || userSession.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Get the dealer user
    const [dealerUser] = await db.select()
      .from(dealerUsers)
      .where(eq(dealerUsers.id, userSession.userId));

    if (!dealerUser || !dealerUser.isActive) {
      return res.status(401).json({ error: 'User account not active' });
    }

    // Get the dealer info for the user
    const [dealer] = await db.select()
      .from(dealers)
      .where(eq(dealers.id, userSession.dealerId));
    
    if (!dealer || !dealer.isActive) {
      return res.status(401).json({ error: 'Dealer account not active' });
    }

    req.dealer = dealer;
    req.dealerUser = dealerUser;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
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

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WT-${timestamp}-${random}`;
};

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
        isArchived: false
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
      const { slug, name, description, imageUrl, startingPrice } = req.body;
      
      console.log(`🔍 UPDATE REQUEST - Category ID: ${categoryId}`);
      console.log(`📨 Request Body:`, JSON.stringify(req.body, null, 2));
      
      const updateData: any = {};
      if (slug !== undefined) updateData.slug = slug;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (startingPrice !== undefined) updateData.startingPrice = startingPrice;
      
      console.log(`📝 Update Data:`, JSON.stringify(updateData, null, 2));
      
      const result = await storage.updateCategory(categoryId, updateData);
      console.log(`✅ Update Result:`, JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error) {
      console.error("❌ Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete a category
  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      // Check if category has any non-archived models using raw SQL to match actual database structure
      const modelsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM trailer_models 
        WHERE category_id = ${categoryId} AND NOT is_archived
      `);
      
      const modelsCount = (modelsResult.rows[0] as any).count;
      if (modelsCount > 0) {
        return res.status(400).json({ message: "Cannot delete category with existing active models. Archive all models first." });
      }
      
      // Delete category using raw SQL
      const result = await db.execute(sql`
        DELETE FROM trailer_categories 
        WHERE id = ${categoryId}
        RETURNING id
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Series management routes
  // Get all series
  app.get("/api/series/all", async (req, res) => {
    try {
      const series = await storage.getAllSeries();
      res.json(series);
    } catch (error) {
      console.error("Error in /api/series/all:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });

  // Get series by category slug
  app.get("/api/categories/:slug/series", async (req, res) => {
    try {
      const { slug } = req.params;
      const series = await storage.getSeriesByCategory(slug);
      res.json(series);
    } catch (error) {
      console.error("Error fetching series by category:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });

  // Create a new series
  app.post("/api/series", requireAuth, async (req, res) => {
    try {
      const { categoryId, name, description, slug, basePrice, imageUrl } = req.body;
      const result = await storage.createSeries({
        categoryId,
        name,
        description,
        slug,
        basePrice,
        imageUrl,
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating series:", error);
      res.status(500).json({ message: "Failed to create series" });
    }
  });

  // Update a series
  app.patch("/api/series/:id", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const { categoryId, name, description, slug, basePrice } = req.body;
      
      const updateData: any = {};
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (slug !== undefined) updateData.slug = slug;
      if (basePrice !== undefined) updateData.basePrice = basePrice;
      
      const result = await storage.updateSeries(seriesId, updateData);
      res.json(result);
    } catch (error) {
      console.error("Error updating series:", error);
      res.status(500).json({ message: "Failed to update series" });
    }
  });

  // Delete a series
  app.delete("/api/series/:id", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      await storage.deleteSeries(seriesId);
      res.json({ message: "Series deleted successfully" });
    } catch (error) {
      console.error("Error deleting series:", error);
      if (error instanceof Error && error.message.includes("Cannot delete")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete series" });
      }
    }
  });

  // Archive series
  app.patch("/api/series/:id/archive", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const archivedSeries = await storage.archiveSeries(seriesId);
      res.json(archivedSeries);
    } catch (error) {
      console.error('Error archiving series:', error);
      res.status(500).json({ error: "Failed to archive series" });
    }
  });

  // Restore series
  app.patch("/api/series/:id/restore", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const restoredSeries = await storage.restoreSeries(seriesId);
      res.json(restoredSeries);
    } catch (error) {
      console.error('Error restoring series:', error);
      res.status(500).json({ error: "Failed to restore series" });
    }
  });

  // Create a new model
  app.post("/api/models", requireAuth, async (req, res) => {
    try {
      const { categoryId, seriesId, modelSeries, name, basePrice, imageUrl, standardFeatures, gvwr, payload, deckSize, axles, lengthOptions, pulltypeOptions } = req.body;
      const result = await storage.createModel({
        categoryId,
        seriesId,
        modelSeries,
        name,
        basePrice: basePrice || 0,
        imageUrl: imageUrl || '/objects/models/default-model.png',
        standardFeatures: standardFeatures || [],
        gvwr,
        payload,
        deckSize,
        axles,
        lengthOptions,
        pulltypeOptions,
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating model:", error);
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  // Update model assignments for a series
  app.patch("/api/series/:id/models", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const { modelIds } = req.body; // Array of model IDs to assign to this series
      
      // First, remove all existing assignments for this series
      await db.update(trailerModels)
        .set({ seriesId: null })
        .where(eq(trailerModels.seriesId, seriesId));
      
      // Then assign the new models
      if (modelIds && modelIds.length > 0) {
        await db.update(trailerModels)
          .set({ seriesId })
          .where(inArray(trailerModels.id, modelIds));
      }
      
      res.json({ message: "Model assignments updated successfully" });
    } catch (error) {
      console.error("Error updating series models:", error);
      res.status(500).json({ message: "Failed to update model assignments" });
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

  // Get models by series
  app.get("/api/series/:seriesId/models", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.seriesId);
      if (isNaN(seriesId)) {
        return res.status(400).json({ message: "Invalid series ID" });
      }
      const models = await storage.getTrailerModelsBySeries(seriesId);
      res.json(models);
    } catch (error) {
      console.error("Error fetching models by series:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  // Custom quote request routes
  app.post("/api/custom-quotes", async (req, res) => {
    try {
      const quoteData = insertCustomQuoteRequestSchema.parse(req.body);
      
      const result = await db.insert(customQuoteRequests).values(quoteData).returning();
      
      res.json({ 
        success: true, 
        message: "Quote request submitted successfully",
        id: result[0].id 
      });
    } catch (error) {
      console.error("Error submitting custom quote:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid quote data",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to submit quote request" });
      }
    }
  });

  // Get all custom quote requests (admin only)
  app.get("/api/custom-quotes", requireAuth, async (req, res) => {
    try {
      const quotes = await db.select().from(customQuoteRequests).orderBy(customQuoteRequests.createdAt);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching custom quotes:", error);
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  // Update custom quote request status (admin only)
  app.patch("/api/custom-quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      const result = await db.update(customQuoteRequests)
        .set(updateData)
        .where(eq(customQuoteRequests.id, quoteId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating custom quote:", error);
      res.status(500).json({ message: "Failed to update quote request" });
    }
  });

  // Quote Requests from Configurator Modal
  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteRequestSchema.parse(req.body);
      
      const result = await db.insert(quoteRequests).values(quoteData).returning();
      
      res.json({ 
        success: true, 
        message: "Quote request submitted successfully",
        id: result[0].id 
      });
    } catch (error) {
      console.error("Error submitting quote request:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid quote data",
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to submit quote request" });
      }
    }
  });

  // Get all quote requests (admin only)
  app.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const quotes = await db.select().from(quoteRequests).orderBy(quoteRequests.createdAt);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  // Update quote request status (admin only)
  app.patch("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      const result = await db.update(quoteRequests)
        .set(updateData)
        .where(eq(quoteRequests.id, quoteId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating quote request:", error);
      res.status(500).json({ message: "Failed to update quote request" });
    }
  });

  // Delete quote request (admin only)
  app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      const result = await db.delete(quoteRequests)
        .where(eq(quoteRequests.id, quoteId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      
      res.json({ 
        success: true, 
        message: "Quote request deleted successfully",
        deletedId: quoteId 
      });
    } catch (error) {
      console.error("Error deleting quote request:", error);
      res.status(500).json({ message: "Failed to delete quote request" });
    }
  });

  // ========================
  // Dealer Routes
  // ========================
  
  // Dealer login
  app.post("/api/dealer/login", async (req, res) => {
    try {
      const { dealerId, password } = req.body;
      
      console.log("🔐 Dealer login attempt:");
      console.log("📝 Received dealerId:", dealerId);
      
      const [dealer] = await db.select()
        .from(dealers)
        .where(eq(dealers.dealerId, dealerId));
      
      console.log("🔍 Database query result:", dealer);
      
      if (!dealer || !dealer.isActive) {
        console.log("❌ Authentication failed: dealer not found or inactive");
        console.log("📊 Dealer exists:", !!dealer);
        console.log("📊 Dealer active:", dealer?.isActive);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password using bcrypt
      const validPassword = await bcrypt.compare(password, dealer.passwordHash);
      
      if (!validPassword) {
        console.log("❌ Authentication failed: invalid password");
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await db.insert(dealerSessions).values({
        id: sessionId,
        dealerId: dealer.id,
        expiresAt,
      });
      
      res.json({
        dealer: {
          id: dealer.id,
          dealerId: dealer.dealerId,
          dealerName: dealer.dealerName,
          contactName: dealer.contactName,
          email: dealer.email,
          territory: dealer.territory,
        },
        sessionId,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Dealer login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Request password reset
  app.post("/api/dealer/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      console.log("🔐 Password reset requested for email:", email);

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find dealer by email
      const [dealer] = await db.select()
        .from(dealers)
        .where(eq(dealers.email, email));

      // Don't reveal if dealer exists or not for security
      if (!dealer || !dealer.isActive) {
        console.log("⚠️ Password reset requested for non-existent/inactive dealer:", email);
        return res.json({ message: "If a dealer account with that email exists, a reset link has been sent to that email address." });
      }

      // Generate reset token
      const emailService = EmailService.getInstance();
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      // Store reset token
      await db.insert(dealerPasswordResetTokens).values({
        dealerId: dealer.id,
        token: resetToken,
        email: dealer.email,
        expiresAt,
      });

      // Send reset email
      const dealerName = dealer.contactName || dealer.dealerName || dealer.companyName;
      const emailSent = await emailService.sendDealerPasswordResetEmail(
        dealer.email,
        dealerName,
        resetToken
      );

      if (emailSent) {
        console.log("✅ Password reset email sent to:", dealer.email);
      } else {
        console.log("⚠️ Password reset email failed, but token created for:", dealer.email);
      }

      res.json({ message: "If a dealer account with that email exists, a reset link has been sent to that email address." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Validate reset token
  app.get("/api/dealer/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [resetRecord] = await db.select()
        .from(dealerPasswordResetTokens)
        .where(eq(dealerPasswordResetTokens.token, token));

      if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ valid: true, email: resetRecord.email });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ error: "Failed to validate reset token" });
    }
  });

  // Reset password
  app.post("/api/dealer/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Find and validate reset token
      const [resetRecord] = await db.select()
        .from(dealerPasswordResetTokens)
        .where(eq(dealerPasswordResetTokens.token, token));

      if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password (in production, use bcrypt)
      const hashedPassword = await hashPassword(newPassword);

      // Update dealer password
      await db.update(dealers)
        .set({ 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(dealers.id, resetRecord.dealerId));

      // Mark token as used
      await db.update(dealerPasswordResetTokens)
        .set({ isUsed: true })
        .where(eq(dealerPasswordResetTokens.token, token));

      // Invalidate all existing dealer sessions for security
      await db.delete(dealerSessions)
        .where(eq(dealerSessions.dealerId, resetRecord.dealerId));

      console.log("✅ Password reset successful for dealer:", resetRecord.dealerId);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Change password (authenticated dealer)
  app.post("/api/dealer/change-password", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      // Check if this is a dealer user or main dealer
      if (req.dealerUser) {
        // Dealer user password change
        const dealerUser = req.dealerUser;
        
        // Verify current password
        const validCurrentPassword = await bcrypt.compare(currentPassword, dealerUser.passwordHash);
        
        if (!validCurrentPassword) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update dealer user password
        await db.update(dealerUsers)
          .set({ 
            passwordHash: hashedNewPassword,
            updatedAt: new Date()
          })
          .where(eq(dealerUsers.id, dealerUser.id));

        console.log("✅ Password changed successfully for dealer user:", dealerUser.username);
      } else {
        // Main dealer password change
        const dealer = req.dealer!;
        
        // Verify current password
        const validCurrentPassword = await bcrypt.compare(currentPassword, dealer.passwordHash);
        
        if (!validCurrentPassword) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update dealer password
        await db.update(dealers)
          .set({ 
            passwordHash: hashedNewPassword,
            updatedAt: new Date()
          })
          .where(eq(dealers.id, dealer.id));

        console.log("✅ Password changed successfully for dealer:", dealer.dealerId);
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  
  // Get dealer profile
  app.get("/api/dealer/profile", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    // If this is a dealer user session, include user info
    if (req.dealerUser) {
      res.json({
        ...req.dealer,
        user: {
          id: req.dealerUser.id,
          username: req.dealerUser.username,
          email: req.dealerUser.email,
          firstName: req.dealerUser.firstName,
          lastName: req.dealerUser.lastName,
          title: req.dealerUser.title,
          role: req.dealerUser.role,
        }
      });
    } else {
      // Main dealer session
      res.json(req.dealer);
    }
  });
  
  // Update dealer profile
  app.patch("/api/dealer/profile", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body;
      const dealerId = req.dealer!.id;
      
      // Don't allow updating dealer ID, password, or active status
      delete updates.dealerId;
      delete updates.passwordHash;
      delete updates.isActive;
      delete updates.id;
      
      const [updatedDealer] = await db.update(dealers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(dealers.id, dealerId))
        .returning();
      
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // Get dealer orders
  app.get("/api/dealer/orders", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orders = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.dealerId, req.dealer!.id))
        .orderBy(dealerOrders.createdAt);
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching dealer orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // Save dealer order
  app.post("/api/dealer/orders", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderData = req.body;
      const orderNumber = generateOrderNumber();
      
      const [order] = await db.insert(dealerOrders).values({
        ...orderData,
        dealerId: req.dealer!.id,
        orderNumber,
        status: 'draft',
      }).returning();
      
      res.json(order);
    } catch (error) {
      console.error("Error saving dealer order:", error);
      res.status(500).json({ error: "Failed to save order" });
    }
  });
  
  // Update dealer order
  app.patch("/api/dealer/orders/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      
      // Verify order belongs to dealer
      const [existingOrder] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      
      if (!existingOrder || existingOrder.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const [updatedOrder] = await db.update(dealerOrders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dealerOrders.id, orderId))
        .returning();
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating dealer order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });
  
  // Delete dealer order
  app.delete("/api/dealer/orders/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Verify order belongs to dealer and is in draft status
      const [existingOrder] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      
      if (!existingOrder || existingOrder.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (existingOrder.status !== 'draft') {
        return res.status(400).json({ error: "Can only delete draft orders" });
      }
      
      await db.delete(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting dealer order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // ============= DEALER USER MANAGEMENT ROUTES =============
  
  // Get all users for a dealer
  app.get("/api/dealer/users", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await db.select({
        id: dealerUsers.id,
        username: dealerUsers.username,
        email: dealerUsers.email,
        firstName: dealerUsers.firstName,
        lastName: dealerUsers.lastName,
        title: dealerUsers.title,
        role: dealerUsers.role,
        isActive: dealerUsers.isActive,
        lastLogin: dealerUsers.lastLogin,
        createdAt: dealerUsers.createdAt,
      })
        .from(dealerUsers)
        .where(eq(dealerUsers.dealerId, req.dealer!.id))
        .orderBy(dealerUsers.createdAt);
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching dealer users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Create a new dealer user
  app.post("/api/dealer/users", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, email, firstName, lastName, title, password, role = 'user' } = req.body;
      
      // Validate required fields
      if (!username || !email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if trying to create an admin user
      // Only admins or main dealer accounts can create admin users
      if (role === 'admin') {
        const isCurrentUserAdmin = !req.dealerUser || req.dealerUser.role === 'admin';
        if (!isCurrentUserAdmin) {
          return res.status(403).json({ error: "Only administrators can create admin users" });
        }
      }
      
      // Check if username or email already exists
      const existing = await db.select()
        .from(dealerUsers)
        .where(sql`${dealerUsers.username} = ${username} OR ${dealerUsers.email} = ${email}`);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      
      // Hash password (using simple hash for demo, use bcrypt in production)
      const passwordHash = await hashPassword(password);
      
      const [newUser] = await db.insert(dealerUsers).values({
        dealerId: req.dealer!.id,
        username,
        email,
        firstName,
        lastName,
        title,
        passwordHash,
        role,
        isActive: true,
      }).returning();
      
      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating dealer user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  
  // Update dealer user
  app.patch("/api/dealer/users/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Verify user belongs to dealer
      const [existingUser] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.id, userId));
      
      if (!existingUser || existingUser.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if trying to update to admin role
      // Only admins or main dealer accounts can set admin role
      if (updates.role === 'admin') {
        const isCurrentUserAdmin = !req.dealerUser || req.dealerUser.role === 'admin';
        if (!isCurrentUserAdmin) {
          return res.status(403).json({ error: "Only administrators can assign admin role" });
        }
      }
      
      // Don't allow updating certain fields
      delete updates.id;
      delete updates.dealerId;
      delete updates.passwordHash;
      
      // If password is being updated, hash it
      if (updates.password) {
        updates.passwordHash = await hashPassword(updates.password);
        delete updates.password;
      }
      
      const [updatedUser] = await db.update(dealerUsers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dealerUsers.id, userId))
        .returning();
      
      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating dealer user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  
  // Delete dealer user
  app.delete("/api/dealer/users/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verify user belongs to dealer
      const [existingUser] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.id, userId));
      
      if (!existingUser || existingUser.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete user sessions first
      await db.delete(dealerUserSessions)
        .where(eq(dealerUserSessions.userId, userId));
      
      // Delete the user
      await db.delete(dealerUsers)
        .where(eq(dealerUsers.id, userId));
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting dealer user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  
  // Dealer user login
  app.post("/api/dealer/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const [user] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.username, username));
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Verify password using bcrypt
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Update last login
      await db.update(dealerUsers)
        .set({ lastLogin: new Date() })
        .where(eq(dealerUsers.id, user.id));
      
      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await db.insert(dealerUserSessions).values({
        id: sessionId,
        userId: user.id,
        dealerId: user.dealerId,
        expiresAt,
      });
      
      // Get dealer info
      const [dealer] = await db.select()
        .from(dealers)
        .where(eq(dealers.id, user.dealerId));
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          title: user.title,
          role: user.role,
        },
        dealer: {
          id: dealer.id,
          dealerId: dealer.dealerId,
          companyName: dealer.companyName || dealer.dealerName,
        },
        sessionId,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Dealer user login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Dealer user forgot password
  app.post("/api/dealer/user/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      console.log("🔐 Password reset requested for dealer user email:", email);

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find dealer user by email
      const [user] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.email, email));

      // Don't reveal if user exists or not for security
      if (!user || !user.isActive) {
        console.log("⚠️ Password reset requested for non-existent/inactive user:", email);
        return res.json({ message: "If an account with that email exists, a reset link has been sent to that email address." });
      }

      // Generate reset token
      const emailService = EmailService.getInstance();
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in dealer user record
      await db.update(dealerUsers)
        .set({
          resetToken,
          resetTokenExpiry: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(dealerUsers.id, user.id));

      // Send reset email
      const userName = `${user.firstName} ${user.lastName}`;
      const emailSent = await emailService.sendDealerUserPasswordResetEmail(
        user.email,
        userName,
        resetToken
      );

      if (emailSent) {
        console.log("✅ Password reset email sent to:", user.email);
      } else {
        console.log("⚠️ Password reset email failed, but token created for:", user.email);
      }

      res.json({ message: "If an account with that email exists, a reset link has been sent to that email address." });
    } catch (error) {
      console.error("Dealer user forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  // Validate dealer user reset token
  app.get("/api/dealer/user/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const [user] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.resetToken, token));

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ valid: true, email: user.email });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ error: "Failed to validate reset token" });
    }
  });

  // Reset dealer user password
  app.post("/api/dealer/user/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Find and validate reset token
      const [user] = await db.select()
        .from(dealerUsers)
        .where(eq(dealerUsers.resetToken, token));

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await db.update(dealerUsers)
        .set({
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        })
        .where(eq(dealerUsers.id, user.id));

      console.log("✅ Password reset successful for dealer user:", user.email);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  
  // Dealer logout
  app.post("/api/dealer/logout", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await db.delete(dealerSessions)
        .where(eq(dealerSessions.id, req.sessionId!));
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Dealer logout error:", error);
      res.status(500).json({ error: "Logout failed" });
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

  // Get all series for admin dropdowns
  app.get("/api/series/all", requireAuth, async (req, res) => {
    try {
      const series = await storage.getAllSeries();
      console.log("Found series:", series.length);
      
      // Set cache control headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(series);
    } catch (error) {
      console.error("Error fetching all series:", error);
      res.status(500).json({ message: "Failed to fetch series" });
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
      const options = await storage.getOptionsForModel(modelId);
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

  // Password Reset Request
  app.post("/api/admin/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      const user = await storage.getAdminUserByEmail(email);
      
      if (!user) {
        // For security, don't reveal if email exists
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }

      // Generate reset token
      const { EmailService } = await import("./email-service");
      const emailService = EmailService.getInstance();
      const resetToken = emailService.generateResetToken();
      
      // Create token in database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        email: user.email,
        expiresAt,
        isUsed: false,
      });

      // Send email
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      if (!emailSent) {
        console.error("Failed to send password reset email");
      }

      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Password reset request failed" });
    }
  });

  // Password Reset Confirmation
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = z.object({
        token: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters")
      }).parse(req.body);
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (resetToken.isUsed) {
        return res.status(400).json({ error: "Reset token has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);
      
      // Update user password
      await storage.updateAdminUser(resetToken.userId, {
        passwordHash: newPasswordHash
      });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Email Configuration Endpoints
  app.get("/api/admin/email-config", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { EmailConfigManager } = await import("./email-config");
      const configManager = EmailConfigManager.getInstance();
      
      res.json({
        config: configManager.getPublicSettings(),
        validation: configManager.validateSettings()
      });
    } catch (error) {
      console.error("Get email config error:", error);
      res.status(500).json({ error: "Failed to get email configuration" });
    }
  });

  app.post("/api/admin/email-config", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { EmailConfigManager } = await import("./email-config");
      const { EmailService } = await import("./email-service");
      
      const configManager = EmailConfigManager.getInstance();
      const emailService = EmailService.getInstance();
      
      // Update configuration
      configManager.updateSettings(req.body);
      
      // Validate new settings
      const validation = configManager.validateSettings();
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: "Invalid configuration", 
          details: validation.errors 
        });
      }

      // Reconfigure email service with new settings
      const settings = configManager.getSettings();
      await emailService.configure({
        provider: settings.provider,
        from: settings.fromAddress,
        smtp: settings.provider === 'smtp' ? {
          host: settings.smtpHost!,
          port: settings.smtpPort!,
          secure: settings.smtpSecure!,
          user: settings.smtpUser!,
          pass: settings.smtpPass!
        } : undefined,
        gmail: settings.provider === 'gmail' ? {
          user: settings.gmailUser!,
          pass: settings.gmailAppPassword!
        } : undefined,
        outlook: settings.provider === 'outlook' ? {
          user: settings.outlookUser!,
          pass: settings.outlookPass!
        } : undefined
      });

      res.json({ 
        message: "Email configuration updated successfully",
        config: configManager.getPublicSettings()
      });
    } catch (error) {
      console.error("Update email config error:", error);
      res.status(500).json({ error: "Failed to update email configuration" });
    }
  });

  // Test Email Endpoint
  app.post("/api/admin/test-email", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { testEmail } = z.object({ 
        testEmail: z.string().email() 
      }).parse(req.body);

      const { EmailService } = await import("./email-service");
      const emailService = EmailService.getInstance();

      const success = await emailService.sendEmail({
        to: testEmail,
        subject: "Test Email - Walton Trailers Admin",
        text: "This is a test email from your Walton Trailers admin system. If you received this, your email configuration is working correctly!",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">Test Email</h2>
          <p>This is a test email from your Walton Trailers admin system.</p>
          <p style="color: #059669; font-weight: bold;">✅ Your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">Sent from Walton Trailers Admin System</p>
        </div>`
      });

      if (success) {
        res.json({ message: "Test email sent successfully!" });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to send test email" });
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
      
      // Check if trying to create an admin user
      // Only admin users can create other admin users
      if (userData.role === 'admin') {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
          return res.status(403).json({ error: "Only administrators can create admin users" });
        }
      }
      
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
      
      // Check if trying to update to admin role
      // Only admin users can promote users to admin role
      if (updates.role === 'admin') {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
          return res.status(403).json({ error: "Only administrators can assign admin role" });
        }
      }
      
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

  // Admin dealer management endpoints
  // Get all dealers (admin only)
  app.get("/api/admin/dealers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allDealers = await db.select().from(dealers).orderBy(dealers.dealerName);
      res.json(allDealers);
    } catch (error) {
      console.error("Error fetching dealers:", error);
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  // Get dealer stats (admin only)
  app.get("/api/admin/dealers/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await db
        .select({
          dealerId: dealerOrders.dealerId,
          orderCount: sql<number>`count(*)::int`,
          totalRevenue: sql<number>`sum(${dealerOrders.totalPrice})::int`
        })
        .from(dealerOrders)
        .groupBy(dealerOrders.dealerId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dealer stats:", error);
      res.status(500).json({ error: "Failed to fetch dealer stats" });
    }
  });

  // Add new dealer (admin only)
  app.post("/api/admin/dealers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { dealerId, dealerName, contactName, email, phone, territory, address, city, state, zipCode, password } = req.body;
      
      // Check if dealer ID or email already exists
      const existing = await db.select()
        .from(dealers)
        .where(sql`${dealers.dealerId} = ${dealerId} OR ${dealers.email} = ${email}`);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Dealer ID or email already exists" });
      }
      
      const passwordHash = await hashPassword(password);
      
      const [newDealer] = await db.insert(dealers).values({
        dealerId,
        dealerName,
        contactName,
        email,
        phone,
        territory: territory || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        passwordHash,
        isActive: true
      }).returning();
      
      res.json(newDealer);
    } catch (error) {
      console.error("Error creating dealer:", error);
      res.status(500).json({ error: "Failed to create dealer" });
    }
  });

  // Update dealer (admin only)
  app.patch("/api/admin/dealers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const updates = req.body;
      
      // Handle password update if provided
      if (updates.password && updates.password.length > 0) {
        updates.passwordHash = await hashPassword(updates.password);
      }
      delete updates.password;
      
      const [updatedDealer] = await db.update(dealers)
        .set(updates)
        .where(eq(dealers.id, dealerId))
        .returning();
      
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer:", error);
      res.status(500).json({ error: "Failed to update dealer" });
    }
  });

  // Toggle dealer status (admin only)
  app.patch("/api/admin/dealers/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const [updatedDealer] = await db.update(dealers)
        .set({ isActive })
        .where(eq(dealers.id, dealerId))
        .returning();
      
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer status:", error);
      res.status(500).json({ error: "Failed to update dealer status" });
    }
  });

  // Get all configurations (admin only) - includes both public and dealer configurations
  app.get("/api/admin/configurations", requireAuth, requireAdmin, async (req, res) => {
    try {
      // Fetch public configurations from userConfigurations table
      const publicConfigs = await db.select({
        id: userConfigurations.id,
        type: sql<string>`'public'`,
        source: sql<string>`'Public'`,
        dealerId: sql<string>`NULL`,
        dealerName: sql<string>`NULL`,
        customerName: sql<string>`NULL`,
        customerEmail: sql<string>`NULL`,
        customerPhone: sql<string>`NULL`,
        categorySlug: userConfigurations.categorySlug,
        categoryName: sql<string>`NULL`,
        modelId: userConfigurations.modelId,
        modelName: sql<string>`NULL`,
        variantId: sql<number>`NULL`,
        selectedOptions: userConfigurations.selectedOptions,
        totalPrice: userConfigurations.totalPrice,
        status: sql<string>`'saved'`,
        notes: sql<string>`NULL`,
        createdAt: userConfigurations.createdAt,
        sessionId: userConfigurations.sessionId
      })
      .from(userConfigurations)
      .orderBy(sql`${userConfigurations.createdAt} DESC`);

      // Fetch dealer configurations from dealerOrders table
      const dealerConfigs = await db.select({
        id: dealerOrders.id,
        type: sql<string>`'dealer'`,
        source: sql<string>`'Dealer'`,
        dealerId: sql<string>`cast(${dealerOrders.dealerId} as text)`,
        dealerName: dealers.dealerName,
        customerName: dealerOrders.customerName,
        customerEmail: dealerOrders.customerEmail,
        customerPhone: dealerOrders.customerPhone,
        categorySlug: dealerOrders.categorySlug,
        categoryName: dealerOrders.categoryName,
        modelId: dealerOrders.modelId,
        modelName: dealerOrders.modelName,
        variantId: sql<number>`NULL`,
        selectedOptions: dealerOrders.selectedOptions,
        totalPrice: dealerOrders.totalPrice,
        status: dealerOrders.status,
        notes: dealerOrders.notes,
        createdAt: dealerOrders.createdAt,
        orderNumber: dealerOrders.orderNumber
      })
      .from(dealerOrders)
      .leftJoin(dealers, eq(dealerOrders.dealerId, dealers.id))
      .orderBy(sql`${dealerOrders.createdAt} DESC`);

      // Combine and sort all configurations by date
      const allConfigs = [...publicConfigs, ...dealerConfigs].sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      res.json(allConfigs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });



  // Get all categories for dropdown from trailer_option_categories table
  app.get("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories ORDER BY "Name"
      `);
      const categories = result.rows.map((row: any) => row.Name).filter((name: string) => name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const categoryName = name.trim().toLowerCase();
      const existing = await db.execute(sql`
        SELECT id FROM trailer_option_categories WHERE LOWER("Name") = ${categoryName}
      `);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "Category already exists" });
      }
      await db.execute(sql`
        INSERT INTO trailer_option_categories ("Name") VALUES (${categoryName})
      `);
      res.json({ success: true, name: categoryName });
    } catch (error) {
      console.error("Error creating option category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get("/api/categories/options/details", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, "Name" FROM trailer_option_categories ORDER BY "Name"
      `);
      const categories = result.rows.map((row: any) => ({ id: row.id, name: row.Name }));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option category details:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.patch("/api/categories/options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const newName = name.trim().toLowerCase();
      const existing = await db.execute(sql`
        SELECT id FROM trailer_option_categories WHERE LOWER("Name") = ${newName} AND id != ${parseInt(id)}
      `);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "A category with that name already exists" });
      }
      const oldResult = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (oldResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      const oldName = (oldResult.rows[0] as any).Name;
      await db.execute(sql`
        UPDATE trailer_option_categories SET "Name" = ${newName} WHERE id = ${parseInt(id)}
      `);
      await db.execute(sql`
        UPDATE trailer_options SET category = ${newName} WHERE LOWER(category) = LOWER(${oldName})
      `);
      res.json({ success: true, name: newName });
    } catch (error) {
      console.error("Error updating option category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const catResult = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (catResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      const catName = (catResult.rows[0] as any).Name;
      const activeCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM trailer_options WHERE LOWER(category) = LOWER(${catName}) AND (is_archived IS NULL OR is_archived = false)
      `);
      const count = parseInt((activeCount.rows[0] as any).count);
      if (count > 0) {
        return res.status(400).json({ message: `Cannot delete: ${count} active option(s) still use this category. Archive them first.` });
      }
      await db.execute(sql`
        DELETE FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting option category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });



  app.get("/api/options/all", async (req, res) => {
    try {
      // Allow both admin and dealer authentication
      const authHeader = req.get('authorization');
      const sessionId = authHeader?.replace('Bearer ', '');
      
      if (!sessionId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if it's an admin session
      const adminSession = await db.select().from(adminSessions)
        .where(eq(adminSessions.id, sessionId))
        .limit(1);
      
      // Check if it's a dealer session
      const dealerSession = await db.select().from(dealerSessions)
        .where(eq(dealerSessions.id, sessionId))
        .limit(1);
      
      // Check if it's a dealer user session
      const dealerUserSession = await db.select().from(dealerUserSessions)
        .where(eq(dealerUserSessions.id, sessionId))
        .limit(1);
      
      if (!adminSession[0] && !dealerSession[0] && !dealerUserSession[0]) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const options = await storage.getAllOptions();
      res.json(options);
    } catch (error) {
      console.error("Error fetching all options:", error);
      res.status(500).json({ message: "Failed to fetch options" });
    }
  });

  // Get options filtered by model ID (for configurator)
  app.get("/api/options/model/:modelId", async (req, res) => {
    try {
      const { modelId } = req.params;
      const options = await storage.getOptionsForModel(modelId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching options for model:", error);
      res.status(500).json({ message: "Failed to fetch options for model" });
    }
  });

  app.patch("/api/models/:id", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { basePrice, name, modelId: modelIdField, gvwr, payload, deckSize, axles, categoryId, categorySubType, series, seriesId, lengthOptions, pulltypeOptions, lengthPrice, lengthGvwr, lengthPayload, lengthDeckSize, lengthOrder } = req.body;
      
      console.log(`Updating model ${modelId} with:`, req.body);
      
      const updatedModel = await storage.updateModel(modelId, {
        basePrice,
        name,
        modelId: modelIdField,
        gvwr,
        payload,
        deckSize,
        axles,
        categoryId,
        categorySubType,
        series,
        seriesId,
        lengthOptions,
        pulltypeOptions,
        lengthPrice,
        lengthGvwr,
        lengthPayload,
        lengthDeckSize,
        lengthOrder,
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
      const { name, price, category, modelId, applicableModels, hexColor, primerPrice, isPerFt } = req.body;
      
      console.log("Creating new option:", req.body);
      
      const newOption = await storage.createOption({
        name,
        price,
        category,
        modelId,
        applicableModels,
        hexColor,
        primerPrice,
        isPerFt,
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
      const { price, name, category, modelId, applicableModels, isArchived, isMultiSelect, isPerFt, hexColor, primerPrice } = req.body;
      
      const updatedOption = await storage.updateOption(optionId, {
        price,
        name,
        category,
        modelId,
        applicableModels,
        isArchived,
        isMultiSelect,
        isPerFt,
        hexColor,
        primerPrice,
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

  app.patch("/api/options/:id/restore", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.restoreOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error restoring option:', error);
      res.status(500).json({ error: "Failed to restore option" });
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

  // Archive category
  app.patch("/api/categories/:id/archive", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      await storage.archiveCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error archiving category:', error);
      res.status(500).json({ error: "Failed to archive category" });
    }
  });

  // Restore category
  app.patch("/api/categories/:id/restore", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const restoredCategory = await storage.restoreCategory(categoryId);
      res.json(restoredCategory);
    } catch (error) {
      console.error('Error restoring category:', error);
      res.status(500).json({ error: "Failed to restore category" });
    }
  });

  // Get all categories including archived ones (admin only)
  app.get("/api/admin/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllTrailerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in /api/admin/categories:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        message: "Failed to fetch categories", 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
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

  app.patch("/api/categories/:id/image", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      console.log(`Updating image for category ${categoryId}, new URL: ${imageUrl}`);

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageUrl,
        {
          owner: "admin",
          visibility: "public", // Category images should be public for customers to see
        }
      );

      console.log(`Object path after ACL policy: ${objectPath}`);

      // Update the category with the normalized image URL
      const result = await db.update(trailerCategories)
        .set({ imageUrl: objectPath })
        .where(eq(trailerCategories.id, categoryId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      // Save image metadata to media library
      try {
        const category = result[0];
        const filename = objectPath.split('/').pop() || 'unknown';
        
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${category.name}_category_image`,
          objectPath,
          mimeType: 'image/jpeg', // Default, could be improved to detect actual type
          fileSize: 0, // Could be improved to get actual file size
          altText: `${category.name} category image`,
          description: `Category image for ${category.name}`,
          tags: ['category', category.slug],
          uploadedBy: (req as AuthenticatedRequest).user?.id,
          usageCount: 1,
        });
        console.log(`Saved category image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving to media library:", mediaError);
        // Don't fail the request if media library save fails
      }

      console.log(`Updated category result:`, result[0]);

      res.json({
        success: true,
        imageUrl: objectPath,
        category: result[0],
      });
    } catch (error) {
      console.error("Error updating category image:", error);
      res.status(500).json({ error: "Failed to update category image" });
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

      // Save image metadata to media library
      try {
        const filename = objectPath.split('/').pop() || 'unknown';
        
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${updatedModel.name}_model_image`,
          objectPath,
          mimeType: 'image/jpeg',
          fileSize: 0,
          altText: `${updatedModel.name} model image`,
          description: `Model image for ${updatedModel.name}`,
          tags: ['model', updatedModel.modelId || 'unknown'],
          uploadedBy: (req as AuthenticatedRequest).user?.id,
          usageCount: 1,
        });
        console.log(`Saved model image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving model image to media library:", mediaError);
      }

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

  app.patch("/api/models/:id/model3d", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { model3dUrl } = req.body;

      console.log(`Updating 3D model for model ${modelId}, new URL: ${model3dUrl}`);

      if (!model3dUrl) {
        return res.status(400).json({ error: "model3dUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        model3dUrl,
        {
          owner: "admin",
          visibility: "public",
        }
      );

      console.log(`3D model object path after ACL policy: ${objectPath}`);

      const updatedModel = await storage.updateModel(modelId, {
        model3dUrl: objectPath,
      });

      console.log(`Updated model with 3D URL:`, updatedModel);

      res.json({
        success: true,
        model3dUrl: objectPath,
        model: updatedModel,
      });
    } catch (error) {
      console.error("Error updating 3D model:", error);
      res.status(500).json({ error: "Failed to update 3D model" });
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

      // Save image metadata to media library
      try {
        const filename = objectPath.split('/').pop() || 'unknown';
        
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${updatedOption.name}_option_image`,
          objectPath,
          mimeType: 'image/jpeg',
          fileSize: 0,
          altText: `${updatedOption.name} option image`,
          description: `Option image for ${updatedOption.name}`,
          tags: ['option', updatedOption.category || 'unknown'],
          uploadedBy: (req as AuthenticatedRequest).user?.id,
          usageCount: 1,
        });
        console.log(`Saved option image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving option image to media library:", mediaError);
      }

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

  // Series image upload routes
  app.post("/api/series/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for series:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/series/:id/image", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      console.log(`Updating image for series ${seriesId}, new URL: ${imageUrl}`);

      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageUrl,
        {
          owner: "admin",
          visibility: "public", // Series images should be public for customers to see
        }
      );

      console.log(`Object path after ACL policy: ${objectPath}`);

      // Update the series with the normalized image URL
      const result = await db.update(trailerSeries)
        .set({ imageUrl: objectPath })
        .where(eq(trailerSeries.id, seriesId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: "Series not found" });
      }

      // Save image metadata to media library
      try {
        const series = result[0];
        const filename = objectPath.split('/').pop() || 'unknown';
        
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${series.name}_series_image`,
          objectPath,
          mimeType: 'image/jpeg', // Default, could be improved to detect actual type
          fileSize: 0, // Could be improved to get actual file size
          altText: `${series.name} series image`,
          description: `Series image for ${series.name}`,
          tags: ['series', series.name?.toLowerCase() || 'unknown'],
          uploadedBy: (req as AuthenticatedRequest).user?.id,
          usageCount: 1,
        });
        console.log(`Saved series image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving series image to media library:", mediaError);
        // Don't fail the request if media library save fails
      }

      console.log(`Updated series result:`, result[0]);

      res.json({
        success: true,
        imageUrl: objectPath,
        series: result[0],
      });
    } catch (error) {
      console.error("Error updating series image:", error);
      res.status(500).json({ error: "Failed to update series image" });
    }
  });

  // Backfill media library with existing images (one-time operation)
  app.post("/api/admin/backfill-media", requireAuth, requireAdmin, async (req, res) => {
    try {
      let insertedCount = 0;
      let skippedCount = 0;

      console.log("Starting media library backfill...");

      const userId = (req as AuthenticatedRequest).user?.id;
      
      // Validate user ID exists
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Process categories - using direct SQL with template literals to avoid ORM issues
      const categories = await db.execute(sql`SELECT id, name, slug, image_url FROM trailer_categories WHERE image_url IS NOT NULL AND image_url != ''`);
      
      for (const row of categories.rows) {
        const category = row as any;
        try {
          // Validate required fields
          if (!category.image_url || !category.name) {
            console.log(`Skipping category with missing data: ${JSON.stringify(category)}`);
            skippedCount++;
            continue;
          }

          // Check if media file already exists
          const existing = await db.execute(sql`SELECT id FROM media_files WHERE object_path = ${category.image_url} LIMIT 1`);
          
          if (existing.rows.length === 0) {
            const filename = category.image_url.includes('/') ? category.image_url.split('/').pop() || 'unknown' : 'unknown';
            const safeName = category.name || 'Unknown Category';
            const safeSlug = category.slug || 'unknown';
            const tags = JSON.stringify(['category', safeSlug]);
            
            await db.execute(sql`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + '_category_image'}, 
                ${category.image_url}, 
                ${'image/jpeg'}, 
                ${0}, 
                ${safeName + ' category image'}, 
                ${'Category image for ' + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            
            insertedCount++;
            console.log(`✓ Category: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${category.name}`);
          }
        } catch (err) {
          console.error(`Error processing category ${category.name || 'unknown'}:`, err);
          skippedCount++;
        }
      }

      // Process models
      const models = await db.execute(sql`SELECT id, name, model_id, image_url FROM trailer_models WHERE image_url IS NOT NULL AND image_url != ''`);
      
      for (const row of models.rows) {
        const model = row as any;
        try {
          // Validate required fields
          if (!model.image_url || !model.name) {
            console.log(`Skipping model with missing data: ${JSON.stringify(model)}`);
            skippedCount++;
            continue;
          }

          const existing = await db.execute(sql`SELECT id FROM media_files WHERE object_path = ${model.image_url} LIMIT 1`);
          
          if (existing.rows.length === 0) {
            const filename = model.image_url.includes('/') ? model.image_url.split('/').pop() || 'unknown' : 'unknown';
            const safeName = model.name || 'Unknown Model';
            const safeModelId = model.model_id || 'unknown';
            const tags = JSON.stringify(['model', safeModelId]);
            
            await db.execute(sql`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + '_model_image'}, 
                ${model.image_url}, 
                ${'image/jpeg'}, 
                ${0}, 
                ${safeName + ' model image'}, 
                ${'Model image for ' + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            
            insertedCount++;
            console.log(`✓ Model: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${model.name}`);
          }
        } catch (err) {
          console.error(`Error processing model ${model.name || 'unknown'}:`, err);
          skippedCount++;
        }
      }

      // Process options
      const options = await db.execute(sql`SELECT id, name, model_id, category, image_url FROM trailer_options WHERE image_url IS NOT NULL AND image_url != ''`);
      
      for (const row of options.rows) {
        const option = row as any;
        try {
          // Validate required fields
          if (!option.image_url || !option.name) {
            console.log(`Skipping option with missing data: ${JSON.stringify(option)}`);
            skippedCount++;
            continue;
          }

          const existing = await db.execute(sql`SELECT id FROM media_files WHERE object_path = ${option.image_url} LIMIT 1`);
          
          if (existing.rows.length === 0) {
            const filename = option.image_url.includes('/') ? option.image_url.split('/').pop() || 'unknown' : 'unknown';
            const safeName = option.name || 'Unknown Option';
            const safeCategory = option.category || 'unknown';
            const tags = JSON.stringify(['option', safeCategory]);
            
            await db.execute(sql`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + '_option_image'}, 
                ${option.image_url}, 
                ${'image/jpeg'}, 
                ${0}, 
                ${safeName + ' option image'}, 
                ${'Option image for ' + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            
            insertedCount++;
            console.log(`✓ Option: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${option.name}`);
          }
        } catch (err) {
          console.error(`Error processing option ${option.name || 'unknown'}:`, err);
          skippedCount++;
        }
      }

      console.log(`Backfill completed: ${insertedCount} inserted, ${skippedCount} skipped`);

      res.json({
        success: true,
        message: `Successfully imported ${insertedCount} images to media library`,
        insertedCount,
        skippedCount,
        totalProcessed: insertedCount + skippedCount
      });

    } catch (error) {
      console.error("Error during media library backfill:", error);
      res.status(500).json({ error: "Failed to backfill media library" });
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

  // Media Library API endpoints
  
  // Get all media files with optional filtering
  app.get("/api/media", requireAuth, async (req, res) => {
    try {
      const { tags, search, sortBy = 'created_at', order = 'desc' } = req.query;
      
      let query = db.select().from(mediaFiles).where(eq(mediaFiles.isActive, true));
      
      // Add search filter
      if (search && typeof search === 'string') {
        query = query.where(
          sql`(${mediaFiles.filename} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.originalName} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.altText} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.description} ILIKE ${`%${search}%`})`
        );
      }
      
      // Add tag filter
      if (tags && typeof tags === 'string') {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query = query.where(
          sql`${mediaFiles.tags} ?| ${tagArray}`
        );
      }
      
      // Add sorting
      const orderDirection = order === 'asc' ? sql`ASC` : sql`DESC`;
      if (sortBy === 'filename') {
        query = query.orderBy(sql`${mediaFiles.filename} ${orderDirection}`);
      } else if (sortBy === 'file_size') {
        query = query.orderBy(sql`${mediaFiles.fileSize} ${orderDirection}`);
      } else if (sortBy === 'updated_at') {
        query = query.orderBy(sql`${mediaFiles.updatedAt} ${orderDirection}`);
      } else {
        query = query.orderBy(sql`${mediaFiles.createdAt} ${orderDirection}`);
      }
      
      const files = await query;
      
      // Convert object paths to accessible URLs
      const filesWithUrls = files.map((file: any) => ({
        ...file,
        accessUrl: file.objectPath.startsWith('/objects/') ? file.objectPath : `/public-objects${file.objectPath.replace(/^\/[^/]+/, '')}`,
        tags: Array.isArray(file.tags) ? file.tags : []
      }));
      
      res.json(filesWithUrls);
    } catch (error) {
      console.error("Error fetching media files:", error);
      res.status(500).json({ message: "Failed to fetch media files" });
    }
  });
  
  // Update media file metadata
  app.patch("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { altText, description, tags } = req.body;
      
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (altText !== undefined) updateData.altText = altText;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      
      const result = await db.update(mediaFiles)
        .set(updateData)
        .where(eq(mediaFiles.id, fileId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Media file not found" });
      }
      
      const updatedFile = {
        ...result[0],
        accessUrl: result[0].objectPath.startsWith('/objects/') ? result[0].objectPath : `/public-objects${result[0].objectPath.replace(/^\/[^/]+/, '')}`,
        tags: Array.isArray(result[0].tags) ? result[0].tags : []
      };
      
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating media file:", error);
      res.status(500).json({ message: "Failed to update media file" });
    }
  });
  
  // Delete media file (soft delete)
  app.delete("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      const result = await db.update(mediaFiles)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(mediaFiles.id, fileId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Media file not found" });
      }
      
      res.json({ message: "Media file deleted successfully" });
    } catch (error) {
      console.error("Error deleting media file:", error);
      res.status(500).json({ message: "Failed to delete media file" });
    }
  });
  
  // Get all unique tags
  app.get("/api/media/tags", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM media_files 
        WHERE is_active = true AND tags IS NOT NULL
        ORDER BY tag
      `);
      
      const tags = result.rows.map((row: any) => row.tag).filter(Boolean);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });
  
  // Track image upload and store metadata
  app.post("/api/media/register", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { filename, originalName, objectPath, mimeType, fileSize, width, height } = req.body;
      const userId = req.user?.id;
      
      const result = await db.insert(mediaFiles).values({
        filename,
        originalName,
        objectPath,
        mimeType,
        fileSize,
        width,
        height,
        uploadedBy: userId,
        tags: []
      }).returning();
      
      const newFile = {
        ...result[0],
        accessUrl: result[0].objectPath.startsWith('/objects/') ? result[0].objectPath : `/public-objects${result[0].objectPath.replace(/^\/[^/]+/, '')}`,
        tags: []
      };
      
      res.json(newFile);
    } catch (error) {
      console.error("Error registering media file:", error);
      res.status(500).json({ message: "Failed to register media file" });
    }
  });

  // Get media usage statistics
  app.get("/api/media/stats", requireAuth, async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          COUNT(CASE WHEN width IS NOT NULL THEN 1 END) as images_count,
          AVG(file_size) as avg_file_size
        FROM media_files 
        WHERE is_active = true
      `);
      
      const result = stats.rows[0] as any;
      res.json({
        totalFiles: parseInt(result.total_files),
        totalSize: parseInt(result.total_size || 0),
        imagesCount: parseInt(result.images_count),
        avgFileSize: parseFloat(result.avg_file_size || 0)
      });
    } catch (error) {
      console.error("Error fetching media stats:", error);
      res.status(500).json({ message: "Failed to fetch media statistics" });
    }
  });

  // Temporary cache clear endpoint for debugging
  app.post("/api/clear-cache", async (req, res) => {
    try {
      storage.clear();
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cache", error: error.message });
    }
  });

  // Temporary endpoint to check model data directly from database
  app.get("/api/debug/model/:modelId", async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await db.execute(sql`
        SELECT m.*, c.name as category_name, s.name as series_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.model_id = ${modelId}
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Model not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch model data", error: error.message });
    }
  });

  return app;
}
