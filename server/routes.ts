import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, inArray } from "drizzle-orm";
import {
  authenticateUser,
  authenticateUserByEmail,
  createSession,
  validateSession,
  logout,
  hashPassword,
  isAdmin
} from "./auth";
import { insertAdminUserSchema, type AdminUser, trailerCategories, trailerModels, trailerSeries, customQuoteRequests, insertCustomQuoteRequestSchema, quoteRequests, insertQuoteRequestSchema, dealers, dealerSessions, dealerOrders, dealerUsers, dealerUserSessions, userConfigurations, mediaFiles, dealerPasswordResetTokens, adminSessions, adminDealerAssignments, pricingTiers, type Dealer, type DealerUser, type MediaFile, type PricingTier } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EmailService } from "./email-service";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  uploadBlob,
} from "./objectStorage";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

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

// RBAC helpers for dealer scoping. Walton employees with role='admin' see
// every dealer. role='standard' employees only see dealers that have been
// assigned to them via admin_dealer_assignments (managed on /admin/employees).
// Returns the set of dealer ids this user is allowed to see, or `null` to
// mean "all" — call sites use null to short-circuit the filter entirely.
async function getVisibleDealerIds(user: AdminUser | undefined): Promise<Set<number> | null> {
  if (!user) return new Set();
  if (isAdmin(user)) return null;
  const rows = await db.select({ dealerId: adminDealerAssignments.dealerId })
    .from(adminDealerAssignments)
    .where(eq(adminDealerAssignments.adminUserId, user.id));
  return new Set(rows.map((r) => r.dealerId));
}

// Convenience for endpoints that operate on a single dealer. Returns
// true if the user is an admin OR has an assignment row for this dealer.
async function canAccessDealer(user: AdminUser | undefined, dealerId: number): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const [hit] = await db.select({ id: adminDealerAssignments.id })
    .from(adminDealerAssignments)
    .where(sql`${adminDealerAssignments.adminUserId} = ${user.id} AND ${adminDealerAssignments.dealerId} = ${dealerId}`);
  return !!hit;
}

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

// Login validation schema. Email is the canonical identifier; `username`
// is accepted as a fallback for one release so any client still running an
// old bundle keeps working.
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((d) => !!(d.email || d.username), {
  message: 'Email is required',
  path: ['email'],
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

  // Public list of pricing tiers. The dealer UI uses this to render the
  // MSRP / Customer / My-cost toggle and to validate that a typed customer
  // discount % isn't deeper than the dealer's own tier discount.
  app.get("/api/pricing-tiers", async (_req, res) => {
    try {
      const tiers = await db.select()
        .from(pricingTiers)
        .orderBy(pricingTiers.displayOrder);
      res.json(tiers);
    } catch (error) {
      console.error("Error in /api/pricing-tiers:", error);
      res.status(500).json({ error: "Failed to fetch pricing tiers" });
    }
  });

  // Create a new category
  app.post("/api/categories", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log("POST /api/categories req.body:", JSON.stringify(req.body));
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes('storage.googleapis.com')) {
        try {
          const objectStorageService = new ObjectStorageService();
          normalizedImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            normalizedImageUrl,
            { owner: "admin", visibility: "public" }
          );
          console.log(`Normalized category image URL: ${normalizedImageUrl}`);
        } catch (err) {
          console.error("Failed to normalize image URL:", err);
        }
      }
      
      const result = await db.insert(trailerCategories).values({
        slug: slug || "",
        name: name || "",
        description: description || "",
        imageUrl: normalizedImageUrl,
        startingPrice: startingPrice || 0,
        orderIndex: orderIndex ?? 0,
        isArchived: false
      }).returning();
      console.log("POST /api/categories result:", JSON.stringify(result[0]));
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/reorder", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute(sql`
          UPDATE trailer_categories SET order_index = ${i + 1} WHERE id = ${orderedIds[i]}
        `);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  // Update a category
  app.patch("/api/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      
      console.log(`🔍 UPDATE REQUEST - Category ID: ${categoryId}`);
      console.log(`📨 Request Body:`, JSON.stringify(req.body, null, 2));
      
      const updateData: any = {};
      if (slug !== undefined) updateData.slug = slug;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (startingPrice !== undefined) updateData.startingPrice = startingPrice;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      
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
  app.delete("/api/categories/:id", requireAuth, requireAdmin, async (req, res) => {
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
  app.post("/api/series", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { categoryId, name, description, slug, basePrice, imageUrl } = req.body;
      
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes('storage.googleapis.com')) {
        try {
          const objectStorageService = new ObjectStorageService();
          normalizedImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            normalizedImageUrl,
            { owner: "admin", visibility: "public" }
          );
        } catch (err) {
          console.error("Failed to normalize series image URL:", err);
        }
      }
      
      const result = await storage.createSeries({
        categoryId,
        name,
        description,
        slug,
        basePrice,
        imageUrl: normalizedImageUrl,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error creating series:", error);
      if (error?.code === '23505') {
        const detail = error?.detail || '';
        if (detail.includes('slug')) {
          return res.status(409).json({ message: `A series with that slug already exists. Please use a unique slug.` });
        }
        return res.status(409).json({ message: `A duplicate entry was found: ${detail}` });
      }
      res.status(500).json({ message: "Failed to create series" });
    }
  });

  // Update a series
  app.patch("/api/series/:id", requireAuth, requireAdmin, async (req, res) => {
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
  app.delete("/api/series/:id", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/series/:id/archive", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/series/:id/restore", requireAuth, requireAdmin, async (req, res) => {
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
  app.post("/api/models", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { categoryId, seriesId, modelSeries, name, basePrice, imageUrl, standardFeatures, gvwr, payload, deckSize, axles, lengthOptions, pulltypeOptions } = req.body;
      
      let normalizedImageUrl = imageUrl || '/objects/models/default-model.png';
      if (normalizedImageUrl && normalizedImageUrl.includes('storage.googleapis.com')) {
        try {
          const objectStorageService = new ObjectStorageService();
          normalizedImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            normalizedImageUrl,
            { owner: "admin", visibility: "public" }
          );
        } catch (err) {
          console.error("Failed to normalize model image URL:", err);
        }
      }
      
      const result = await storage.createModel({
        categoryId,
        seriesId,
        modelSeries,
        name,
        basePrice: basePrice || 0,
        imageUrl: normalizedImageUrl,
        standardFeatures: standardFeatures || [],
        gvwr,
        payload,
        deckSize,
        axles,
        lengthOptions,
        pulltypeOptions,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error creating model:", error);
      if (error?.code === '23505') {
        const detail = error?.detail || '';
        if (detail.includes('model_id')) {
          return res.status(409).json({ message: `A model with that Model ID already exists. Please use a unique Model ID.` });
        }
        return res.status(409).json({ message: `A duplicate entry was found: ${detail}` });
      }
      res.status(500).json({ message: "Failed to create model" });
    }
  });

  // Update model assignments for a series
  app.patch("/api/series/:id/models", requireAuth, requireAdmin, async (req, res) => {
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
      // Email is the canonical login identifier. We still accept a legacy
      // `dealerId` body field so any client that hasn't picked up the new
      // build yet keeps working for one release — drop after the next deploy
      // cycle if you want to lock to email-only.
      const { email: rawEmail, dealerId: legacyDealerId, password } = req.body;
      const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

      console.log("🔐 Dealer login attempt:");
      console.log("📝 Received email:", email || "(none)", "legacyDealerId:", legacyDealerId || "(none)");

      const [dealer] = email
        ? await db.select().from(dealers).where(sql`LOWER(${dealers.email}) = ${email}`)
        : legacyDealerId
          ? await db.select().from(dealers).where(eq(dealers.dealerId, legacyDealerId))
          : [];

      console.log("🔍 Database query result:", dealer ? `dealer ${dealer.dealerId}` : "(no match)");

      if (!dealer || !dealer.isActive) {
        console.log("❌ Authentication failed: dealer not found or inactive");
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
      
      // Look up the dealer's tier so the client can render the
      // MSRP / Customer / My-cost toggle without an extra round trip.
      const [tier] = await db.select()
        .from(pricingTiers)
        .where(eq(pricingTiers.slug, dealer.pricingTier));

      res.json({
        dealer: {
          id: dealer.id,
          dealerId: dealer.dealerId,
          dealerName: dealer.dealerName,
          contactName: dealer.contactName,
          email: dealer.email,
          territory: dealer.territory,
          pricingTier: dealer.pricingTier,
          discountPct: tier?.discountPct ?? 0,
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
  
  // Inventory feed for the dealer portal — proxies a read-only view of
  // Walton's internal Airtable inventory table so the AIRTABLE_API_KEY
  // never lands in the browser. Auto-paginates and flattens each record
  // to { id, fields, createdTime }. 60s in-memory cache keeps Airtable
  // happy under burst load from the dashboard.
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appigN6Xxb0P2nNb9";
  const AIRTABLE_INVENTORY_TABLE = process.env.AIRTABLE_INVENTORY_TABLE || "tblkvSVTSbEl0SQp1";
  // Restrict to a specific Airtable view so dealers only see the filtered
  // inventory list the user curates there (not the whole table). Override
  // via env var if you ever want to switch which view drives the portal.
  const AIRTABLE_INVENTORY_VIEW = process.env.AIRTABLE_INVENTORY_VIEW || "viwvscAcx1lVbXrHS";
  let inventoryCache: { fetchedAt: number; records: any[] } | null = null;
  const INVENTORY_CACHE_TTL_MS = 60_000;

  app.get("/api/dealer/inventory", requireDealerAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const key = process.env.AIRTABLE_API_KEY;
      if (!key) {
        return res.status(503).json({
          error: "Inventory feed is not configured. Set AIRTABLE_API_KEY in Vercel.",
        });
      }

      if (inventoryCache && Date.now() - inventoryCache.fetchedAt < INVENTORY_CACHE_TTL_MS) {
        return res.json({ records: inventoryCache.records, cached: true });
      }

      const records: any[] = [];
      let offset: string | undefined;
      do {
        const url = new URL(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_INVENTORY_TABLE}`,
        );
        url.searchParams.set("pageSize", "100");
        if (AIRTABLE_INVENTORY_VIEW) url.searchParams.set("view", AIRTABLE_INVENTORY_VIEW);
        if (offset) url.searchParams.set("offset", offset);

        const resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!resp.ok) {
          const body = await resp.text().catch(() => "");
          console.error("Airtable inventory fetch failed:", resp.status, body.slice(0, 500));
          return res.status(502).json({
            error: `Airtable responded ${resp.status}. Check the API key + base/table IDs.`,
          });
        }
        const data = await resp.json() as { records: any[]; offset?: string };
        records.push(...data.records);
        offset = data.offset;
      } while (offset);

      inventoryCache = { fetchedAt: Date.now(), records };
      res.json({ records, cached: false });
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch inventory" });
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

  // Fetch a single order by id. Used by the configurator's Recreate flow
  // (?recreate=<id>) to pre-fill the wizard with the deleted order's
  // category/model/options. Includes soft-deleted rows so Recreate works
  // from the Deleted tab. Strict 404 if the order isn't this dealer's.
  app.get("/api/dealer/orders/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [order] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      if (!order || order.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching dealer order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
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

  // Submit a draft order to Walton.
  // - Promotes status draft → submitted.
  // - Stamps customer_name + po_number (captured in the submit modal).
  // - Emails the dealer's assigned sales rep (or info@waltontrailers.com
  //   as a fallback) with the full order details.
  // - Emails the dealer a confirmation copy.
  // Email failures don't fail the request — the order is persisted regardless
  // and the failure is logged for follow-up.
  app.post("/api/dealer/orders/:id/submit", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { customerName, poNumber } = req.body as { customerName?: string; poNumber?: string };

      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      const [existing] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));

      if (!existing) return res.status(404).json({ error: "Order not found" });
      if (existing.dealerId !== req.dealer!.id) return res.status(403).json({ error: "Not your order" });
      if (existing.status !== 'draft') {
        return res.status(400).json({ error: `Order is already ${existing.status}` });
      }

      const [updated] = await db.update(dealerOrders)
        .set({
          status: 'submitted',
          customerName: customerName.trim(),
          poNumber: poNumber?.trim() || null,
          // submittedAt is the authoritative submission timestamp. The 48hr
          // cancel window is computed off this column, not updated_at (which
          // gets bumped by any subsequent edit).
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dealerOrders.id, orderId))
        .returning();

      // Fire-and-track email notifications. Wrap each so one failure doesn't
      // sink the other.
      const dealer = req.dealer!;
      const repTo = dealer.salesRepEmail || 'info@waltontrailers.com';
      const repName = dealer.salesRepName || 'Walton Sales';

      // Render the configured options into a readable block.
      const optionsText = updated.selectedOptions && typeof updated.selectedOptions === 'object'
        ? Object.entries(updated.selectedOptions as Record<string, unknown>)
            .map(([category, value]) => `  • ${category}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n')
        : '(no options selected)';

      // Internal ref (orderNumber) is for Walton-side lookup; rep will assign
      // a Walton order # (repOrderNumber) once they match this to their system.
      const repSubject = `New Walton Order from ${dealer.dealerName || dealer.companyName} (ref ${updated.orderNumber})`;
      const repBody = [
        `Hi ${repName},`,
        '',
        `${dealer.dealerName || dealer.companyName} has submitted a new order through the configurator.`,
        '',
        `Internal ref:   ${updated.orderNumber}   (assign your order # in the admin dashboard)`,
        `Dealer:         ${dealer.dealerName || dealer.companyName} (${dealer.dealerId})`,
        `Dealer contact: ${dealer.contactName || ''} <${dealer.email || ''}>`,
        `Customer:       ${updated.customerName}`,
        updated.poNumber ? `PO #:           ${updated.poNumber}` : '',
        '',
        `Trailer:        ${updated.modelName}`,
        `Category:       ${updated.categoryName}`,
        `Total:          $${updated.totalPrice.toLocaleString()}`,
        '',
        'Selected options:',
        optionsText,
        '',
        '— Walton Trailers Configurator',
      ].filter(Boolean).join('\n');

      const emailService = EmailService.getInstance();
      const repSent = await emailService.sendEmail({
        to: repTo,
        subject: repSubject,
        text: repBody,
      });
      if (!repSent) console.warn(`Order ${updated.orderNumber}: rep notification email failed (to ${repTo})`);

      // Dealer confirmation
      if (dealer.email) {
        const dealerSubject = `Walton order received for ${updated.customerName}`;
        const dealerBody = [
          `Thanks, ${dealer.contactName || dealer.dealerName || 'team'} —`,
          '',
          `We received your order for ${updated.customerName}.`,
          `Your Walton rep (${repName}) will assign your order number and follow up shortly.`,
          '',
          `Trailer:  ${updated.modelName}`,
          `Total:    $${updated.totalPrice.toLocaleString()}`,
          updated.poNumber ? `PO #:     ${updated.poNumber}` : '',
          '',
          'You can see this order in your dealer dashboard at any time.',
          '',
          '— Walton Trailers',
        ].filter(Boolean).join('\n');

        const dealerSent = await emailService.sendEmail({
          to: dealer.email,
          subject: dealerSubject,
          text: dealerBody,
        });
        if (!dealerSent) console.warn(`Order ${updated.orderNumber}: dealer confirmation email failed (to ${dealer.email})`);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error submitting order:", error);
      res.status(500).json({ error: "Failed to submit order" });
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

      // Whitelist what dealers are allowed to change on an order. Status
      // transitions are owned by the server (POST /submit) and by Walton
      // admin staff — never by the dealer, even via direct API call.
      // Order numbering (orderNumber, repOrderNumber) and work order
      // attachments are also admin-only.
      const ALLOWED_DEALER_FIELDS = new Set([
        'customerName',
        'customerEmail',
        'customerPhone',
        'notes',
      ]);
      const safeUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (ALLOWED_DEALER_FIELDS.has(key)) safeUpdates[key] = value;
      }

      const [updatedOrder] = await db.update(dealerOrders)
        .set({ ...safeUpdates, updatedAt: new Date() })
        .where(eq(dealerOrders.id, orderId))
        .returning();

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating dealer order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });
  
  // Soft-delete a dealer order. Three lifecycle rules enforced server-side
  // (the client UI mirrors these but the server is the source of truth):
  //
  //   - Draft quote: freely deletable.
  //   - Submitted, < 48hr since submission: deletable as a cancellation.
  //     Triggers a notification email to the assigned rep so Walton knows
  //     to stop the order if it's already been picked up.
  //   - Submitted, >= 48hr since submission (or any state past 'submitted'
  //     like processing/completed/received): NOT deletable. Client redirects
  //     the dealer to contact their rep. Server returns 403 with the
  //     rep's contact info so the UI can show it.
  //
  // We soft-delete (deleted_at = now()) rather than hard-deleting so dealers
  // can Recreate from a past order via the Deleted tab.
  const SUBMITTED_DELETE_WINDOW_MS = 48 * 60 * 60 * 1000;

  app.delete("/api/dealer/orders/:id", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);

      const [existingOrder] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));

      if (!existingOrder || existingOrder.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existingOrder.deletedAt) {
        return res.status(400).json({ error: "Order is already deleted" });
      }

      const isDraft = existingOrder.status === 'draft';
      const submittedAt = existingOrder.submittedAt ? new Date(existingOrder.submittedAt) : null;
      const withinWindow = submittedAt != null &&
        (Date.now() - submittedAt.getTime()) < SUBMITTED_DELETE_WINDOW_MS;
      const isCancelablePostSubmit = existingOrder.status === 'submitted' && withinWindow;

      if (!isDraft && !isCancelablePostSubmit) {
        // Past the 48hr window OR already past 'submitted' in the pipeline —
        // dealer can't delete on their own.
        const dealer = req.dealer!;
        return res.status(403).json({
          error: "Contact your Walton rep to cancel this order.",
          repName: dealer.salesRepName || null,
          repEmail: dealer.salesRepEmail || 'info@waltontrailers.com',
        });
      }

      // Soft delete.
      await db.update(dealerOrders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(dealerOrders.id, orderId));

      // If the dealer is cancelling a submitted order, notify the rep so
      // Walton can stop it on their end. Fire-and-log: failure shouldn't
      // block the delete since the dealer's intent is clear.
      if (isCancelablePostSubmit) {
        const dealer = req.dealer!;
        const repTo = dealer.salesRepEmail || 'info@waltontrailers.com';
        const repName = dealer.salesRepName || 'Walton Sales';
        const body = [
          `Hi ${repName},`,
          '',
          `${dealer.dealerName || dealer.companyName} just cancelled a submitted order within the 48-hour window.`,
          '',
          `Internal ref:   ${existingOrder.orderNumber}`,
          existingOrder.repOrderNumber ? `Walton order #: ${existingOrder.repOrderNumber}` : '',
          `Dealer:         ${dealer.dealerName || dealer.companyName} (${dealer.dealerId})`,
          `Customer:       ${existingOrder.customerName || '(unspecified)'}`,
          existingOrder.poNumber ? `PO #:           ${existingOrder.poNumber}` : '',
          `Trailer:        ${existingOrder.modelName}`,
          `Total:          $${existingOrder.totalPrice.toLocaleString()}`,
          `Submitted at:   ${submittedAt ? submittedAt.toISOString() : '(unknown)'}`,
          `Cancelled at:   ${new Date().toISOString()}`,
          '',
          'If you have already begun processing this on the Walton side, please stop the work.',
          '',
          '— Walton Trailers Configurator',
        ].filter(Boolean).join('\n');
        try {
          const sent = await EmailService.getInstance().sendEmail({
            to: repTo,
            subject: `Cancellation: order ${existingOrder.repOrderNumber || existingOrder.orderNumber} from ${dealer.dealerName || dealer.companyName}`,
            text: body,
          });
          if (!sent) console.warn(`Cancellation notification failed: order ${existingOrder.orderNumber}`);
        } catch (e) {
          console.warn(`Cancellation notification error: order ${existingOrder.orderNumber}`, e);
        }
      }

      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting dealer order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Dealer-initiated help message. Posts to a Slack incoming-webhook URL
  // configured via SLACK_HELP_WEBHOOK_URL. If the env var isn't set we log
  // the message to function output (console mode) so dev can still see it.
  // Body: { subject, message, currentUrl? }
  app.post("/api/dealer/help", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, message, currentUrl } = req.body as {
        subject?: string; message?: string; currentUrl?: string;
      };
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      const dealer = req.dealer!;
      const userTag = req.dealerUser
        ? `${req.dealerUser.firstName} ${req.dealerUser.lastName} <${req.dealerUser.email}> (${req.dealerUser.role})`
        : `${dealer.contactName || ''} <${dealer.email || ''}>`;

      const slackText = [
        `:rotating_light: *Walton Configurator help request*`,
        '',
        `*Dealer:* ${dealer.dealerName || dealer.companyName} (${dealer.dealerId})`,
        `*From:*   ${userTag}`,
        currentUrl ? `*Page:*   ${currentUrl}` : '',
        subject ? `*Subject:* ${subject}` : '',
        '',
        '```',
        message.trim(),
        '```',
      ].filter(Boolean).join('\n');

      const webhook = process.env.SLACK_HELP_WEBHOOK_URL;
      if (!webhook) {
        console.log('=== HELP MESSAGE (no SLACK_HELP_WEBHOOK_URL set) ===');
        console.log(slackText);
        console.log('===================================================');
        return res.json({ ok: true, delivery: 'console' });
      }

      const slackRes = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slackText }),
      });

      if (!slackRes.ok) {
        const body = await slackRes.text();
        console.error(`Slack webhook failed: ${slackRes.status} ${body}`);
        // Still acknowledge to the dealer — they shouldn't be blocked by our
        // notification plumbing. The message is logged so dev can recover it.
        console.log('Help message that failed Slack delivery:\n' + slackText);
        return res.json({ ok: true, delivery: 'failed', warning: 'Notification queued — Walton has been alerted.' });
      }

      res.json({ ok: true, delivery: 'slack' });
    } catch (error) {
      console.error('Error in /api/dealer/help:', error);
      res.status(500).json({ error: 'Failed to send help message' });
    }
  });

  // Restore a soft-deleted dealer order back into Quotes. Always lands the
  // order in the Quotes tab as a 'draft' — even if it was previously
  // submitted/received/etc. — so a cancelled order can't sneak back into
  // the dealer's Orders tab without anyone re-sending it. The dealer has
  // to go through Submit Order again, which re-fires the rep notification
  // and re-stamps submitted_at. We also wipe rep_order_number since the
  // rep's previously-assigned number is no longer valid once the order
  // was cancelled.
  app.post("/api/dealer/orders/:id/restore", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [existingOrder] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));

      if (!existingOrder || existingOrder.dealerId !== req.dealer!.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (!existingOrder.deletedAt) {
        return res.status(400).json({ error: "Order is not deleted" });
      }

      const wasSubmitted = existingOrder.status !== 'draft';

      await db.update(dealerOrders)
        .set({
          deletedAt: null,
          // Force back to draft regardless of prior state — Quotes tab only.
          status: 'draft',
          // Clear the submission audit trail so 48hr window logic starts fresh
          // on the next submit, and so the dealer can't game cancellation
          // history by deleting + restoring + re-submitting late.
          submittedAt: null,
          // Rep's order # is no longer valid once we cancelled. Force the
          // rep to assign a new one when this re-submits.
          repOrderNumber: null,
          updatedAt: new Date(),
        })
        .where(eq(dealerOrders.id, orderId));

      res.json({
        message: wasSubmitted
          ? "Restored as a quote. Submit again to resend to Walton."
          : "Order restored to Quotes.",
        wasSubmitted,
      });
    } catch (error) {
      console.error("Error restoring dealer order:", error);
      res.status(500).json({ error: "Failed to restore order" });
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
  
  // Create a new dealer user. Email-only login — `username` is no longer
  // collected; the column stays nullable for backwards compat with old rows.
  app.post("/api/dealer/users", requireDealerAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { email, firstName, lastName, title, password, role = 'user' } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
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

      // Email uniqueness (case-insensitive) is the only check now.
      const existing = await db.select()
        .from(dealerUsers)
        .where(sql`LOWER(${dealerUsers.email}) = LOWER(${email})`);

      if (existing.length > 0) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      // Hash password (using simple hash for demo, use bcrypt in production)
      const passwordHash = await hashPassword(password);

      const [newUser] = await db.insert(dealerUsers).values({
        dealerId: req.dealer!.id,
        username: null,
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
      // Email-only login. Usernames are deprecated for dealer users.
      const { email: rawEmail, password } = req.body;
      const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
      if (!email) return res.status(400).json({ error: "Email is required" });

      const [user] = await db.select()
        .from(dealerUsers)
        .where(sql`LOWER(${dealerUsers.email}) = ${email}`);

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
      const { email, username, password } = loginSchema.parse(req.body);
      // Email path is preferred; username path is a one-release fallback.
      const authResult = email
        ? await authenticateUserByEmail(email, password)
        : await authenticateUser(username!, password);

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
  // Dealer assignments for one admin user (employee). Returns the array of
  // dealer ids they're assigned to. Bookkeeping only — does not yet gate
  // access in dealer/order endpoints (see 0008 migration comment).
  app.get("/api/admin/users/:id/dealer-assignments", requireAuth, requireAdmin, async (req, res) => {
    try {
      const adminUserId = parseInt(req.params.id);
      if (Number.isNaN(adminUserId)) return res.status(400).json({ error: "Invalid user id" });
      const rows = await db.select({ dealerId: adminDealerAssignments.dealerId })
        .from(adminDealerAssignments)
        .where(eq(adminDealerAssignments.adminUserId, adminUserId));
      res.json(rows.map((r) => r.dealerId));
    } catch (error) {
      console.error("Error fetching dealer assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Replace the set of dealer assignments for one admin user. Body:
  // { dealerIds: number[] }. We delete-then-insert for simplicity — the
  // set is small (low dozens at most) and the FK ON DELETE CASCADE keeps
  // things clean when a dealer or admin user is removed.
  app.put("/api/admin/users/:id/dealer-assignments", requireAuth, requireAdmin, async (req, res) => {
    try {
      const adminUserId = parseInt(req.params.id);
      if (Number.isNaN(adminUserId)) return res.status(400).json({ error: "Invalid user id" });
      const dealerIds: number[] = Array.isArray(req.body?.dealerIds)
        ? req.body.dealerIds.map((n: any) => parseInt(n, 10)).filter((n: number) => Number.isFinite(n))
        : [];

      await db.delete(adminDealerAssignments).where(eq(adminDealerAssignments.adminUserId, adminUserId));
      if (dealerIds.length > 0) {
        await db.insert(adminDealerAssignments).values(
          dealerIds.map((dealerId) => ({ adminUserId, dealerId })),
        );
      }
      res.json({ success: true, count: dealerIds.length });
    } catch (error: any) {
      console.error("Error saving dealer assignments:", error);
      res.status(500).json({ error: error?.message || "Failed to save assignments" });
    }
  });

  // Single admin user (employee) by id. Used by /admin/employees/:id detail
  // page. 404 on miss so the URL can be deep-linked. Password hash never
  // included in the response.
  app.get("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid user id" });
      const user = await storage.getAdminUserById(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

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
      // Allow the request to omit `username` — email is the only identifier
      // we collect now. Strip it from the input before zod parsing so the
      // generated insert schema doesn't reject a missing key.
      const { username: _ignoreLegacyUsername, ...rest } = req.body || {};
      const userData = createUserSchema.parse(rest);

      // Only admin users can create other admin users
      if (userData.role === 'admin') {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== 'admin') {
          return res.status(403).json({ error: "Only administrators can create admin users" });
        }
      }

      const existingByEmail = await storage.getAdminUserByEmail(userData.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Hash the password
      const passwordHash = await hashPassword(userData.password);

      const newUser = await storage.createAdminUser({
        ...userData,
        username: null,
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

  // Auto-generate a dealer ID following the documented rule set:
  //   Primary dealer:    [STATE]-[YY]-[###]        e.g.  UT-23-001
  //   Additional loc:    [STATE]-[YY]-[###]-L[##]  e.g.  UT-23-001-L02
  // Per-state sequence (resets per state, not per year). Locations inherit
  // the parent's full ID and append -L02, -L03, etc. (parent is implicitly L01).
  async function generateDealerId(opts: {
    state: string;
    year: string;       // 4-digit, e.g. "2026"
    parentDealerId?: number | null;
  }): Promise<string> {
    if (opts.parentDealerId) {
      const [parent] = await db.select().from(dealers).where(eq(dealers.id, opts.parentDealerId));
      if (!parent) throw new Error("Parent dealer not found");
      // Count existing locations under this parent (parent itself is L01)
      const sibs = await db.select().from(dealers).where(eq(dealers.parentDealerId, parent.id));
      const nextLoc = sibs.length + 2; // L02 for the first added location
      const suffix = String(nextLoc).padStart(2, '0');
      return `${parent.dealerId}-L${suffix}`;
    }

    const state = opts.state.toUpperCase();
    const yy = opts.year.slice(-2).padStart(2, '0');
    // Per-state sequence: find max ### across all primary dealers in this state
    const stateDealers = await db.select().from(dealers).where(eq(dealers.state, state));
    let maxSeq = 0;
    const pattern = new RegExp(`^${state}-\\d{2}-(\\d{3})$`);
    for (const d of stateDealers) {
      const m = d.dealerId.match(pattern);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    }
    const seq = String(maxSeq + 1).padStart(3, '0');
    return `${state}-${yy}-${seq}`;
  }

  // Preview an auto-generated dealer ID without persisting anything.
  // Used by the Add Dealer form to show a live ID as the admin fills it in.
  app.get("/api/admin/dealers/preview-id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const state = String(req.query.state || '').trim();
      const year = String(req.query.year || '').trim();
      const parentParam = req.query.parentDealerId;
      const parentDealerId = parentParam ? parseInt(String(parentParam), 10) : null;

      if (parentDealerId) {
        const id = await generateDealerId({ state, year, parentDealerId });
        return res.json({ dealerId: id });
      }
      if (!/^[A-Za-z]{2}$/.test(state) || !/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: "state (2 letters) and year (4 digits) required" });
      }
      const id = await generateDealerId({ state, year });
      res.json({ dealerId: id });
    } catch (error: any) {
      console.error("Error previewing dealer ID:", error);
      res.status(500).json({ error: error?.message || "Failed to preview dealer ID" });
    }
  });

  // Get all dealers visible to the current admin. role='admin' sees every
  // dealer; role='standard' sees only their assigned dealers (from
  // admin_dealer_assignments). Returns [] for a standard user with no
  // assignments rather than 403 — empty list is the truthful answer.
  app.get("/api/admin/dealers", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const visible = await getVisibleDealerIds(req.user);
      if (visible !== null && visible.size === 0) return res.json([]);
      const all = await db.select().from(dealers).orderBy(dealers.dealerName);
      res.json(visible === null ? all : all.filter((d) => visible.has(d.id)));
    } catch (error) {
      console.error("Error fetching dealers:", error);
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  // Get a single dealer with their full record. The list endpoint already
  // returns everything, but the detail page wants a 404 if the id doesn't
  // exist so the URL can be linked directly.
  app.get("/api/admin/dealers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      if (Number.isNaN(dealerId)) return res.status(400).json({ error: "Invalid dealer id" });
      if (!(await canAccessDealer(req.user, dealerId))) {
        // Use 404 (not 403) so we don't leak that the dealer exists at all.
        return res.status(404).json({ error: "Dealer not found" });
      }
      const [dealer] = await db.select().from(dealers).where(eq(dealers.id, dealerId));
      if (!dealer) return res.status(404).json({ error: "Dealer not found" });
      res.json(dealer);
    } catch (error) {
      console.error("Error fetching dealer:", error);
      res.status(500).json({ error: "Failed to fetch dealer" });
    }
  });

  // Orders for one dealer. Shape mirrors /api/admin/configurations so the
  // existing AdminOrderManageDialog component can consume rows directly.
  app.get("/api/admin/dealers/:id/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      if (Number.isNaN(dealerId)) return res.status(400).json({ error: "Invalid dealer id" });
      if (!(await canAccessDealer(req.user, dealerId))) return res.status(404).json({ error: "Dealer not found" });
      const rows = await db.select({
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
        selectedOptions: dealerOrders.selectedOptions,
        totalPrice: dealerOrders.totalPrice,
        status: dealerOrders.status,
        notes: dealerOrders.notes,
        createdAt: dealerOrders.createdAt,
        orderNumber: dealerOrders.orderNumber,
        repOrderNumber: dealerOrders.repOrderNumber,
        poNumber: dealerOrders.poNumber,
        submittedAt: dealerOrders.submittedAt,
        deletedAt: dealerOrders.deletedAt,
        workOrderUrl: dealerOrders.workOrderUrl,
        workOrderUploadedAt: dealerOrders.workOrderUploadedAt,
      })
      .from(dealerOrders)
      .leftJoin(dealers, eq(dealerOrders.dealerId, dealers.id))
      .where(eq(dealerOrders.dealerId, dealerId))
      .orderBy(sql`${dealerOrders.createdAt} DESC`);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching dealer orders:", error);
      res.status(500).json({ error: "Failed to fetch dealer orders" });
    }
  });

  // Sub-users (employees) belonging to a dealer. Hides password hashes.
  app.get("/api/admin/dealers/:id/users", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      if (Number.isNaN(dealerId)) return res.status(400).json({ error: "Invalid dealer id" });
      if (!(await canAccessDealer(req.user, dealerId))) return res.status(404).json({ error: "Dealer not found" });
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
      .where(eq(dealerUsers.dealerId, dealerId))
      .orderBy(dealerUsers.createdAt);
      res.json(users);
    } catch (error) {
      console.error("Error fetching dealer users:", error);
      res.status(500).json({ error: "Failed to fetch dealer users" });
    }
  });

  // Get dealer stats. Filtered by RBAC scope just like the list endpoint —
  // standard users only see counts for dealers they're assigned to.
  app.get("/api/admin/dealers/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const visible = await getVisibleDealerIds(req.user);
      if (visible !== null && visible.size === 0) return res.json([]);
      const stats = await db
        .select({
          dealerId: dealerOrders.dealerId,
          orderCount: sql<number>`count(*)::int`,
          totalRevenue: sql<number>`sum(${dealerOrders.totalPrice})::int`
        })
        .from(dealerOrders)
        .groupBy(dealerOrders.dealerId);
      res.json(visible === null ? stats : stats.filter((s) => visible.has(s.dealerId)));
    } catch (error) {
      console.error("Error fetching dealer stats:", error);
      res.status(500).json({ error: "Failed to fetch dealer stats" });
    }
  });

  // Add new dealer (admin only). dealer_id is auto-generated server-side
  // from state + establishedYear (or parent linkage). See generateDealerId().
  app.post("/api/admin/dealers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const {
        dealerName, contactName, email, phone, territory,
        address, city, state, zipCode, password,
        pricingTier, salesRepName, salesRepEmail,
        parentDealerId, establishedYear,
      } = req.body;

      const parentId = parentDealerId ? parseInt(String(parentDealerId), 10) : null;
      const isLocation = !!parentId;

      // For locations the state/year are inherited from the parent. For
      // primary dealers both fields are required so we can generate a valid ID.
      let effectiveState: string | null = state ? String(state).toUpperCase() : null;
      let effectiveYear: string | null = establishedYear ? String(establishedYear) : null;

      if (isLocation) {
        const [parent] = await db.select().from(dealers).where(eq(dealers.id, parentId!));
        if (!parent) return res.status(400).json({ error: "Parent dealer not found" });
        effectiveState = parent.state;
        effectiveYear = parent.establishedYear;
      } else {
        if (!effectiveState || !/^[A-Z]{2}$/.test(effectiveState)) {
          return res.status(400).json({ error: "State (2-letter abbreviation) is required" });
        }
        if (!effectiveYear || !/^\d{4}$/.test(effectiveYear)) {
          return res.status(400).json({ error: "Year (YYYY) is required" });
        }
      }

      const generatedId = await generateDealerId({
        state: effectiveState || '',
        year: effectiveYear || '',
        parentDealerId: parentId,
      });

      // Defense in depth: re-check uniqueness in case of a race
      const existing = await db.select()
        .from(dealers)
        .where(sql`${dealers.dealerId} = ${generatedId} OR ${dealers.email} = ${email}`);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Generated dealer ID or email already exists. Please retry." });
      }

      const passwordHash = await hashPassword(password);

      const [newDealer] = await db.insert(dealers).values({
        dealerId: generatedId,
        dealerName,
        contactName,
        email,
        phone,
        territory: territory || null,
        address: address || null,
        city: city || null,
        state: effectiveState,
        zipCode: zipCode || null,
        parentDealerId: parentId,
        establishedYear: effectiveYear,
        // Pricing tier defaults to 'standard' at the schema level. Accept an
        // override here so admins can assign a different tier on creation.
        pricingTier: pricingTier || 'standard',
        salesRepName: salesRepName || null,
        salesRepEmail: salesRepEmail || null,
        passwordHash,
        isActive: true
      }).returning();

      res.json(newDealer);
    } catch (error: any) {
      console.error("Error creating dealer:", error);
      res.status(500).json({ error: error?.message || "Failed to create dealer" });
    }
  });

  // Update dealer (admin only)
  app.patch("/api/admin/dealers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!(await canAccessDealer(req.user, parseInt(req.params.id)))) {
      return res.status(404).json({ error: "Dealer not found" });
    }
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

  // ─── Pricing tier admin CRUD ─────────────────────────────────
  // The public GET /api/pricing-tiers above is used for read; admins
  // get POST/PATCH/DELETE here so they can rename a tier, tweak the
  // discount %, add a tier, or retire one (only if no dealers reference it).

  app.post("/api/admin/pricing-tiers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { slug, displayName, discountPct, displayOrder } = req.body;
      if (!slug || !displayName || discountPct == null) {
        return res.status(400).json({ error: "slug, displayName, and discountPct are required" });
      }
      if (typeof discountPct !== 'number' || discountPct < 0 || discountPct > 100) {
        return res.status(400).json({ error: "discountPct must be a number between 0 and 100" });
      }
      const [created] = await db.insert(pricingTiers).values({
        slug: slug.toLowerCase().trim(),
        displayName,
        discountPct,
        displayOrder: displayOrder ?? 0,
      }).returning();
      res.json(created);
    } catch (error: any) {
      console.error("Error creating pricing tier:", error);
      // unique_violation on slug
      if (error?.code === '23505') {
        return res.status(400).json({ error: "A tier with that slug already exists" });
      }
      res.status(500).json({ error: "Failed to create pricing tier" });
    }
  });

  app.patch("/api/admin/pricing-tiers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates: Record<string, any> = {};
      // Whitelist columns explicitly — req.body could contain anything.
      if (req.body.displayName != null) updates.displayName = req.body.displayName;
      if (req.body.discountPct != null) {
        const pct = Number(req.body.discountPct);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ error: "discountPct must be a number between 0 and 100" });
        }
        updates.discountPct = pct;
      }
      if (req.body.displayOrder != null) updates.displayOrder = Number(req.body.displayOrder);
      // Intentionally NOT updating slug — it's the FK target on dealers and
      // would cascade-rename via the ON UPDATE CASCADE, but renaming a tier
      // slug is an unusual operation and we'd want it explicit.
      updates.updatedAt = new Date();

      const [updated] = await db.update(pricingTiers)
        .set(updates)
        .where(eq(pricingTiers.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Tier not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating pricing tier:", error);
      res.status(500).json({ error: "Failed to update pricing tier" });
    }
  });

  app.delete("/api/admin/pricing-tiers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Friendly pre-check: if any dealer references this tier the FK
      // RESTRICT will block the delete anyway, but the message would be
      // cryptic. Tell the admin who's still on it.
      const [tier] = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
      if (!tier) return res.status(404).json({ error: "Tier not found" });

      const inUse = await db.select({ id: dealers.id, dealerName: dealers.dealerName })
        .from(dealers)
        .where(eq(dealers.pricingTier, tier.slug));

      if (inUse.length > 0) {
        return res.status(400).json({
          error: `Cannot delete: ${inUse.length} dealer${inUse.length === 1 ? '' : 's'} still on this tier. Reassign them first.`,
          dealers: inUse,
        });
      }

      await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      res.status(500).json({ error: "Failed to delete pricing tier" });
    }
  });

  // Toggle dealer status (admin only)
  app.patch("/api/admin/dealers/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!(await canAccessDealer(req.user, parseInt(req.params.id)))) {
      return res.status(404).json({ error: "Dealer not found" });
    }
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

  // Send an invitation email to a dealer. Generates a 7-day reset token and
  // emails the dealer a "Welcome" link they can click to set their initial
  // password. Distinct from /api/dealer/forgot-password (different copy,
  // longer expiry, doesn't pretend to be ambiguous about whether the dealer
  // exists since the admin is the one triggering it).
  app.post("/api/admin/dealers/:id/invite", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      if (Number.isNaN(dealerId)) return res.status(400).json({ error: "Invalid dealer id" });
      if (!(await canAccessDealer(req.user, dealerId))) {
        return res.status(404).json({ error: "Dealer not found" });
      }

      const [dealer] = await db.select().from(dealers).where(eq(dealers.id, dealerId));
      if (!dealer) return res.status(404).json({ error: "Dealer not found" });
      if (!dealer.isActive) return res.status(400).json({ error: "Dealer is archived; restore before inviting." });
      if (!dealer.email) return res.status(400).json({ error: "Dealer has no email on file." });

      const emailService = EmailService.getInstance();
      const token = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(dealerPasswordResetTokens).values({
        dealerId: dealer.id,
        token,
        email: dealer.email,
        expiresAt,
      });

      const baseUrl = process.env.BASE_URL || "";
      const setupUrl = `${baseUrl}/dealer/reset-password/${token}`;
      const loginUrl = `${baseUrl}/dealer/login`;
      const contactName = dealer.contactName || dealer.dealerName || "there";

      const emailSent = await emailService.sendEmail({
        to: dealer.email,
        subject: `Welcome to the Walton Trailers Dealer Portal`,
        text: [
          `Hi ${contactName},`,
          ``,
          `You've been added as a dealer in the Walton Trailers portal.`,
          ``,
          `Login URL:  ${loginUrl}`,
          `Your email: ${dealer.email}`,
          ``,
          `To finish setting up, click the link below and choose a password.`,
          `This link is valid for 7 days.`,
          ``,
          `Set your password:  ${setupUrl}`,
          ``,
          `— Walton Trailers`,
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="margin-top: 0;">Welcome to the Walton Trailers Dealer Portal</h2>
            <p>Hi ${contactName},</p>
            <p>You've been added as a dealer in the Walton Trailers portal.</p>
            <table cellspacing="0" cellpadding="6" style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:6px;margin:16px 0;">
              <tr><td style="color:#666;">Login URL</td><td><a href="${loginUrl}">${loginUrl}</a></td></tr>
              <tr><td style="color:#666;">Your email</td><td>${dealer.email}</td></tr>
            </table>
            <p>To finish setting up, click the button below and choose a password. This link is valid for 7 days.</p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${setupUrl}" style="display:inline-block;background:#c1af89;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;font-weight:600;">Set Your Password</a>
            </p>
            <p style="font-size:12px;color:#666;">If the button doesn't work, copy and paste this link: <br>${setupUrl}</p>
            <p style="margin-top:32px;font-size:13px;color:#666;">— Walton Trailers</p>
          </div>
        `,
      });

      if (!emailSent) {
        console.warn(`Invitation email failed for dealer ${dealer.dealerId}`);
        return res.status(500).json({ error: "Could not send invitation email. Check email provider config." });
      }

      res.json({ success: true, email: dealer.email });
    } catch (error: any) {
      console.error("Error sending dealer invitation:", error);
      res.status(500).json({ error: error?.message || "Failed to send invitation" });
    }
  });

  // Hard-delete a dealer. Only permitted when the dealer has no orders and
  // no dealer users — otherwise the admin should archive (PATCH /status) so
  // history is preserved. Sessions and password-reset tokens are cleaned up
  // automatically since they're disposable.
  app.delete("/api/admin/dealers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);

      const [target] = await db.select().from(dealers).where(eq(dealers.id, dealerId));
      if (!target) {
        return res.status(404).json({ error: "Dealer not found" });
      }

      const [orderCountRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(dealerOrders)
        .where(eq(dealerOrders.dealerId, dealerId));
      const orderCount = orderCountRow?.n ?? 0;

      const [userCountRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(dealerUsers)
        .where(eq(dealerUsers.dealerId, dealerId));
      const userCount = userCountRow?.n ?? 0;

      const [locCountRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(dealers)
        .where(eq(dealers.parentDealerId, dealerId));
      const locationCount = locCountRow?.n ?? 0;

      if (orderCount > 0 || userCount > 0 || locationCount > 0) {
        return res.status(409).json({
          error: "Cannot delete dealer with history",
          reason: {
            orders: orderCount,
            users: userCount,
            locations: locationCount,
          },
          suggestion: "Archive the dealer instead so order history is preserved.",
        });
      }

      // Clean up disposable side tables, then the dealer row itself.
      await db.delete(dealerSessions).where(eq(dealerSessions.dealerId, dealerId));
      await db.delete(dealerPasswordResetTokens).where(eq(dealerPasswordResetTokens.dealerId, dealerId));
      await db.delete(dealers).where(eq(dealers.id, dealerId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting dealer:", error);
      res.status(500).json({ error: error?.message || "Failed to delete dealer" });
    }
  });

  // Get all configurations (admin only) - includes both public and dealer configurations
  app.get("/api/admin/configurations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const visible = await getVisibleDealerIds(req.user);
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
        orderNumber: dealerOrders.orderNumber,
        // Fields the rep-management dialog needs to render and edit.
        repOrderNumber: dealerOrders.repOrderNumber,
        poNumber: dealerOrders.poNumber,
        submittedAt: dealerOrders.submittedAt,
        workOrderUrl: dealerOrders.workOrderUrl,
        workOrderUploadedAt: dealerOrders.workOrderUploadedAt,
      })
      .from(dealerOrders)
      .leftJoin(dealers, eq(dealerOrders.dealerId, dealers.id))
      .orderBy(sql`${dealerOrders.createdAt} DESC`);

      // Filter dealer rows by RBAC scope. Public configurations always show —
      // they're anonymous configurator saves, not tied to any dealer. Standard
      // admins with no assignments see only public rows.
      const scopedDealerConfigs = visible === null
        ? dealerConfigs
        : dealerConfigs.filter((c) => c.dealerId != null && visible.has(parseInt(c.dealerId, 10)));

      const allConfigs = [...publicConfigs, ...scopedDealerConfigs].sort((a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      res.json(allConfigs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });



  // Public endpoint for category positions (used by configurator for ordering)
  app.get("/api/categories/options/positions", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT "Name", position FROM trailer_option_categories ORDER BY position NULLS LAST, "Name"
      `);
      const positions = result.rows.map((row: any) => ({ name: row.Name, position: row.position }));
      res.json(positions);
    } catch (error) {
      console.error("Error fetching option category positions:", error);
      res.status(500).json({ message: "Failed to fetch category positions" });
    }
  });

  // Get all categories for dropdown from trailer_option_categories table
  app.get("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories WHERE is_system IS NOT TRUE ORDER BY position NULLS LAST, "Name"
      `);
      const categories = result.rows.map((row: any) => row.Name).filter((name: string) => name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories/options", requireAuth, requireAdmin, async (req, res) => {
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
      const maxPos = await db.execute(sql`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM trailer_option_categories
      `);
      const nextPos = (maxPos.rows[0] as any).next_pos;
      await db.execute(sql`
        INSERT INTO trailer_option_categories ("Name", position) VALUES (${categoryName}, ${nextPos})
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
        SELECT id, "Name", position, is_system FROM trailer_option_categories ORDER BY position NULLS LAST, "Name"
      `);
      const categories = result.rows.map((row: any) => ({ id: row.id, name: row.Name, position: row.position, isSystem: row.is_system }));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option category details:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Reorder a category by swapping its position with the adjacent one
  app.patch("/api/categories/options/:id/position", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body; // 'up' or 'down'
      if (direction !== 'up' && direction !== 'down') {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      const catResult = await db.execute(sql`
        SELECT id, position FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (catResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      const currentPos = (catResult.rows[0] as any).position;
      // Find the adjacent category to swap with
      let adjacentResult;
      if (direction === 'up') {
        adjacentResult = await db.execute(sql`
          SELECT id, position FROM trailer_option_categories
          WHERE position < ${currentPos}
          ORDER BY position DESC NULLS LAST
          LIMIT 1
        `);
      } else {
        adjacentResult = await db.execute(sql`
          SELECT id, position FROM trailer_option_categories
          WHERE position > ${currentPos}
          ORDER BY position ASC NULLS LAST
          LIMIT 1
        `);
      }
      if (adjacentResult.rows.length === 0) {
        return res.json({ success: true, message: "Already at boundary" });
      }
      const adjacentId = (adjacentResult.rows[0] as any).id;
      const adjacentPos = (adjacentResult.rows[0] as any).position;
      // Swap positions
      await db.execute(sql`
        UPDATE trailer_option_categories SET position = ${adjacentPos} WHERE id = ${parseInt(id)}
      `);
      await db.execute(sql`
        UPDATE trailer_option_categories SET position = ${currentPos} WHERE id = ${adjacentId}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering option category:", error);
      res.status(500).json({ message: "Failed to reorder category" });
    }
  });

  app.patch("/api/categories/options/:id", requireAuth, requireAdmin, async (req, res) => {
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
        SELECT "Name", is_system FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (oldResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      if ((oldResult.rows[0] as any).is_system) {
        return res.status(403).json({ message: "System categories cannot be renamed" });
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

  app.delete("/api/categories/options/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const catResult = await db.execute(sql`
        SELECT "Name", is_system FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (catResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      if ((catResult.rows[0] as any).is_system) {
        return res.status(403).json({ message: "System categories cannot be deleted" });
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

  // Update per-model category display order
  app.patch("/api/models/:id/category-order", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { categoryOrder } = req.body;
      if (!categoryOrder || typeof categoryOrder !== 'object') {
        return res.status(400).json({ message: "categoryOrder must be an object mapping category names to positions" });
      }
      const updatedModel = await storage.updateModel(modelId, { categoryOrder });
      res.json({ success: true, categoryOrder: updatedModel.categoryOrder });
    } catch (error) {
      console.error("Error updating model category order:", error);
      res.status(500).json({ message: "Failed to update category order" });
    }
  });

  app.patch("/api/models/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { basePrice, name, modelId: modelIdField, gvwr, payload, deckSize, axles, categoryId, categorySubType, series, seriesId, lengthOptions, pulltypeOptions, lengthPrice, lengthGvwr, lengthPayload, lengthDeckSize, lengthOrder, categoryOrder } = req.body;
      
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
        categoryOrder,
      });
      
      console.log("Updated model result:", updatedModel);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Failed to update model" });
    }
  });



  app.post("/api/options", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { name, price, category, modelId, applicableModels, hexColor, primerPrice, isPerFt, imageUrl, isMultiSelect } = req.body;
      
      console.log("Creating new option:", req.body);
      
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes('storage.googleapis.com')) {
        try {
          const objectStorageService = new ObjectStorageService();
          normalizedImageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            normalizedImageUrl,
            { owner: "admin", visibility: "public" }
          );
        } catch (err) {
          console.error("Failed to normalize option image URL:", err);
        }
      }
      
      const newOption = await storage.createOption({
        name,
        price,
        category,
        modelId,
        applicableModels,
        hexColor,
        primerPrice,
        isPerFt,
        imageUrl: normalizedImageUrl || undefined,
        isMultiSelect,
      });
      
      console.log("Created option:", newOption);
      res.json(newOption);
    } catch (error) {
      console.error("Error creating option:", error);
      res.status(500).json({ message: "Failed to create option" });
    }
  });

  app.patch("/api/options/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { price, name, category, modelId, applicableModels, isArchived, isMultiSelect, isPerFt, hexColor, primerPrice, requiresCategory, requiresOptionName } = req.body;

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
        requiresCategory,
        requiresOptionName,
      });

      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(500).json({ message: "Failed to update option" });
    }
  });

  // Delete option
  app.delete("/api/options/:id", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/options/:id/archive", requireAuth, requireAdmin, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.archiveOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error archiving option:', error);
      res.status(500).json({ error: "Failed to archive option" });
    }
  });

  app.patch("/api/options/:id/restore", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/models/:id/archive", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/models/:id/restore", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/categories/:id/archive", requireAuth, requireAdmin, async (req, res) => {
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
  app.patch("/api/categories/:id/restore", requireAuth, requireAdmin, async (req, res) => {
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
  app.post("/api/categories/upload-url", requireAuth, requireAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/categories/:id/image", requireAuth, requireAdmin, async (req, res) => {
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
  app.post("/api/models/upload-url", requireAuth, requireAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/models/:id/image", requireAuth, requireAdmin, async (req, res) => {
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

  app.patch("/api/models/:id/model3d", requireAuth, requireAdmin, async (req, res) => {
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

  // Remove the 3D model from a model (admins use this when they want to
  // replace a GLB they uploaded by mistake or retire a preview that's no
  // longer accurate). We don't delete the underlying Blob — multiple records
  // could reference it, and removing it asynchronously is the admin's choice
  // via the future media library. Here we just clear the DB pointer.
  app.delete("/api/models/:id/model3d", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const updatedModel = await storage.updateModel(modelId, { model3dUrl: null });
      res.json({ success: true, model: updatedModel });
    } catch (error) {
      console.error("Error clearing 3D model:", error);
      res.status(500).json({ error: "Failed to clear 3D model" });
    }
  });

  // Model gallery image endpoints
  app.post("/api/models/:id/images", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "url is required" });
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(url, { owner: "admin", visibility: "public" });
      const updatedModel = await storage.addModelImage(modelId, objectPath);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error adding model image:", error);
      res.status(500).json({ message: "Failed to add image" });
    }
  });

  app.delete("/api/models/:id/images", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: "url is required" });
      const updatedModel = await storage.removeModelImage(modelId, url);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error removing model image:", error);
      res.status(500).json({ message: "Failed to remove image" });
    }
  });

  app.patch("/api/models/:id/images/reorder", requireAuth, requireAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { urls } = req.body;
      if (!Array.isArray(urls)) return res.status(400).json({ message: "urls array is required" });
      const updatedModel = await storage.reorderModelImages(modelId, urls);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error reordering model images:", error);
      res.status(500).json({ message: "Failed to reorder images" });
    }
  });

  // Option image upload routes
  app.post("/api/options/upload-url", requireAuth, requireAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for option:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/options/:id/image", requireAuth, requireAdmin, async (req, res) => {
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
  app.post("/api/series/upload-url", requireAuth, requireAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for series:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.patch("/api/series/:id/image", requireAuth, requireAdmin, async (req, res) => {
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

  // Receives binary uploads from the Uppy admin UI and streams them into
  // Vercel Blob. The URL the client PUTs to is generated by
  // ObjectStorageService.getObjectEntityUploadURL(), which embeds the target
  // pathname after /api/blob-upload/.
  //
  // DEPRECATED: this route streams the entire request body through the Vercel
  // function and is subject to Vercel's ~4.5 MB request-body limit. Larger
  // files (and even smaller ones, intermittently — Vercel pre-buffers the body
  // in ways that break stream-to-Blob handoff) fail with "Failed to upload".
  // The admin UI now uses the direct-to-Blob upload pattern via
  // /api/blob-upload-token + @vercel/blob/client.upload(). This route is kept
  // for backwards compat with anything still calling getObjectEntityUploadURL.
  app.put("/api/blob-upload/:pathname(*)", async (req, res) => {
    try {
      const pathname = decodeURIComponent(req.params.pathname);
      if (!pathname || pathname.includes("..")) {
        return res.status(400).json({ error: "Invalid pathname" });
      }
      const contentType = req.get("content-type") || "application/octet-stream";
      // Buffer the body explicitly — Vercel Functions pre-buffer the request
      // body, so passing `req` as a stream to @vercel/blob.put() can race or
      // see an already-consumed stream. Concat chunks first, then upload.
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);
      const result = await uploadBlob(pathname, body, contentType);
      return res.status(200).json({
        pathname: result.pathname,
        url: result.url,
        objectPath: `/objects/${result.pathname}`,
      });
    } catch (error: any) {
      console.error("Error uploading blob:", error);
      return res
        .status(500)
        .json({ error: "Upload failed", message: error?.message });
    }
  });

  // Vercel-recommended direct-to-Blob upload pattern. The client calls
  // @vercel/blob/client.upload() which does a two-step handshake against this
  // endpoint:
  //   1. POST with `type: "blob.generate-client-token"` → we return a signed,
  //      short-lived URL for the client to PUT the file directly to Blob.
  //   2. POST with `type: "blob.upload-completed"` (fired by Blob, not the
  //      client) → we acknowledge. We don't need to update the DB here — the
  //      caller PATCHes the model/option image after upload() resolves.
  //
  // The whole point of this route is to AVOID streaming the file through the
  // function, which is what Vercel's ~4.5 MB body limit caps. Bytes go
  // browser → Blob directly; the function only mints the token.
  app.post("/api/blob-upload-token", async (req, res) => {
    try {
      const body = (req as any).body as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request: req as any,
        onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
          // Allow images and the GLB / GLTF formats used by 3D model previews.
          // No size cap here — Vercel Blob's per-file limit is 500 MB which is
          // well above the 200 MB Taylor needs for complex GLBs.
          return {
            allowedContentTypes: [
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/gif",
              "image/svg+xml",
              "model/gltf-binary",
              "model/gltf+json",
              "application/octet-stream",
            ],
            addRandomSuffix: false,
            tokenPayload: JSON.stringify({ pathname }),
          };
        },
        onUploadCompleted: async (_event) => {
          // No-op: the admin UI follows up with PATCH /api/models/:id/image
          // (or the analogous option/category/series endpoint) once upload()
          // resolves, so the DB write happens in a single explicit step the
          // admin can see succeed or fail.
        },
      });
      return res.status(200).json(jsonResponse);
    } catch (error: any) {
      console.error("Error generating blob upload token:", error);
      return res.status(400).json({ error: error?.message || "Upload token request failed" });
    }
  });

  // Work-order PDF uploads. Intentionally unauthed (matches the existing
  // /api/blob-upload-token pattern) because @vercel/blob/client.upload()
  // calls handleUploadUrl with its own fetch and doesn't forward our
  // Authorization: Bearer header, so any auth here would 401.
  //
  // Security mitigation: addRandomSuffix=true so each upload gets a unique
  // blob URL. An anonymous request can upload a PDF to our Blob bucket but
  // can't overwrite an existing work order (different URL each time), and
  // can't attach a URL to any order — the PATCH /api/admin/dealer-orders/:id
  // that wires the URL to a row IS admin-authed.
  app.post("/api/admin/blob-upload-token/work-order", async (req, res) => {
    try {
      const body = (req as any).body as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request: req as any,
        onBeforeGenerateToken: async (pathname) => {
          return {
            allowedContentTypes: ["application/pdf"],
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ pathname }),
          };
        },
        onUploadCompleted: async (_event) => {
          // The admin UI follows up with PATCH /api/admin/dealer-orders/:id
          // to attach the URL to the order. No DB write here.
        },
      });
      return res.status(200).json(jsonResponse);
    } catch (error: any) {
      console.error("Error generating work-order upload token:", error);
      return res.status(400).json({ error: error?.message || "Upload token request failed" });
    }
  });

  // Admin order management — rep-side PATCH. Replaces ad-hoc updates with a
  // single whitelisted handler that:
  //   - lets the rep set rep_order_number, status, notes, work_order_url
  //   - auto-flips status submitted → received when a work order URL is
  //     attached (since the spec is that uploading the work order means
  //     the rep has matched and accepted the order)
  //   - stamps work_order_uploaded_at when the URL is set
  //   - emails the dealer when the work order is attached so they know
  //     their PDF is ready to download
  app.patch("/api/admin/dealer-orders/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [existing] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      if (!existing) return res.status(404).json({ error: "Order not found" });
      // Hide orders for dealers a standard user isn't assigned to.
      if (!(await canAccessDealer(req.user, existing.dealerId))) {
        return res.status(404).json({ error: "Order not found" });
      }

      const ALLOWED = new Set([
        'repOrderNumber',
        'status',
        'notes',
        'workOrderUrl',
        'invoiceUrl',
        'expectedDeliveryDate',
      ]);
      const VALID_STATUSES = new Set(['draft', 'submitted', 'received', 'processing', 'completed']);
      const updates: Record<string, any> = {};

      for (const [key, value] of Object.entries(req.body)) {
        if (ALLOWED.has(key)) updates[key] = value;
      }

      if (updates.status && !VALID_STATUSES.has(updates.status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}` });
      }

      const attachingNewWorkOrder = 'workOrderUrl' in updates &&
        updates.workOrderUrl &&
        updates.workOrderUrl !== existing.workOrderUrl;

      if (attachingNewWorkOrder) {
        updates.workOrderUploadedAt = new Date();
        // Auto-flip submitted → received unless the rep set a different
        // status in the same PATCH (rare but possible — they win).
        if (!('status' in updates) && existing.status === 'submitted') {
          updates.status = 'received';
        }
      }

      // Explicit clear: workOrderUrl = null. Wipe the upload timestamp too.
      if ('workOrderUrl' in updates && !updates.workOrderUrl) {
        updates.workOrderUploadedAt = null;
      }

      // Same upload-stamp / explicit-clear pattern for the invoice PDF.
      const attachingNewInvoice = 'invoiceUrl' in updates &&
        updates.invoiceUrl &&
        updates.invoiceUrl !== existing.invoiceUrl;
      if (attachingNewInvoice) {
        updates.invoiceUploadedAt = new Date();
      }
      if ('invoiceUrl' in updates && !updates.invoiceUrl) {
        updates.invoiceUploadedAt = null;
      }

      // Empty string → null for the date column, so admins can clear it.
      if ('expectedDeliveryDate' in updates && updates.expectedDeliveryDate === '') {
        updates.expectedDeliveryDate = null;
      }

      updates.updatedAt = new Date();

      const [updated] = await db.update(dealerOrders)
        .set(updates)
        .where(eq(dealerOrders.id, orderId))
        .returning();

      // Notify the dealer when the work order lands.
      if (attachingNewWorkOrder) {
        try {
          const [dealer] = await db.select()
            .from(dealers)
            .where(eq(dealers.id, updated.dealerId));
          if (dealer?.email) {
            await EmailService.getInstance().sendEmail({
              to: dealer.email,
              subject: `Work order ready: ${updated.repOrderNumber || updated.orderNumber}`,
              text: [
                `Hi ${dealer.contactName || dealer.dealerName || 'team'},`,
                '',
                `Your Walton work order is ready.`,
                updated.repOrderNumber ? `Order #:    ${updated.repOrderNumber}` : '',
                `Customer:   ${updated.customerName || '(unspecified)'}`,
                `Trailer:    ${updated.modelName}`,
                '',
                `Download:   ${updated.workOrderUrl}`,
                '',
                'You can also re-download from your dealer dashboard at any time.',
                '',
                '— Walton Trailers',
              ].filter(Boolean).join('\n'),
            });
          }
        } catch (e) {
          console.warn(`Work-order notification email failed for order ${updated.orderNumber}:`, e);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error in PATCH /api/admin/dealer-orders/:id:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Hard-delete a dealer order. Used by admins to clean up test/junk
  // orders. Distinct from the dealer-side soft-delete (deletedAt). Also
  // best-effort removes the work-order PDF from Blob so we don't leave
  // orphan files. The dealer-side "Recreate from past order" feature can
  // no longer see the order after this — by design.
  app.delete("/api/admin/dealer-orders/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [existing] = await db.select()
        .from(dealerOrders)
        .where(eq(dealerOrders.id, orderId));
      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Best-effort: clean up the work-order PDF if one is attached.
      if (existing.workOrderUrl) {
        try {
          // workOrderUrl is a full Vercel Blob public URL — pass it directly
          // to del(); it accepts URLs as well as pathnames.
          const { del } = await import("@vercel/blob");
          await del(existing.workOrderUrl);
        } catch (e) {
          console.warn(`Work-order blob cleanup failed for order ${existing.orderNumber}:`, e);
          // Don't block the delete — orphan blob is acceptable.
        }
      }

      await db.delete(dealerOrders).where(eq(dealerOrders.id, orderId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error in DELETE /api/admin/dealer-orders/:id:", error);
      res.status(500).json({ error: error?.message || "Failed to delete order" });
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
