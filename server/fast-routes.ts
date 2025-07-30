import type { Express } from "express";
import { fastStorage } from "./fast-storage";
import { z } from "zod";

// Minimal validation schemas
const updateModelSchema = z.object({
  basePrice: z.number().optional(),
  name: z.string().optional(),
  isArchived: z.boolean().optional()
});

// Ultra-fast routes with minimal overhead
export function registerFastRoutes(app: Express) {
  // Optimized categories endpoint
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await fastStorage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Fast models by category
  app.get("/api/categories/:slug/models", async (req, res) => {
    try {
      const models = await fastStorage.getModelsByCategory(req.params.slug);
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Admin endpoints with minimal auth check
  app.get("/api/models/all", (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const models = await fastStorage.getAllModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.get("/api/options/all", (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const options = await fastStorage.getAllOptions();
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch options" });
    }
  });

  // Fast model updates
  app.patch("/api/models/:id", (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const updates = updateModelSchema.parse(req.body);
      
      const updatedModel = await fastStorage.updateModel(modelId, updates);
      res.json(updatedModel);
    } catch (error) {
      res.status(500).json({ error: "Failed to update model" });
    }
  });

  // Fast archive endpoints
  app.patch("/api/models/:id/archive", (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      await fastStorage.archiveModel(modelId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive model" });
    }
  });

  app.patch("/api/options/:id/archive", (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await fastStorage.archiveOption(optionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive option" });
    }
  });
}