import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all trailer categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getTrailerCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
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

  const httpServer = createServer(app);
  return httpServer;
}
