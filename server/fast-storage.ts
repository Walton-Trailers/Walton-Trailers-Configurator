import { db } from "./db";
import { sql } from "drizzle-orm";
import { cache } from "./cache";

// Optimized storage with aggressive caching and batch operations
export class FastStorage {
  // Cached categories with dynamic pricing from models
  async getCategories() {
    const cached = cache.get('categories');
    if (cached) return cached;

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
    
    const categories = result.rows.map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.image_url,
      startingPrice: cat.starting_price
    }));
    
    cache.set('categories', categories, 60000); // 1 min cache for faster dynamic pricing updates
    return categories;
  }

  // Optimized models by category with caching
  async getModelsByCategory(categorySlug: string) {
    const cacheKey = `models_${categorySlug}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const result = await db.execute(sql`
      SELECT m.id, m.model_id, m.name, m.gvwr, m.payload, 
             m.deck_size, m.axles, m.base_price, m.image_url, m.features
      FROM trailer_models m
      JOIN trailer_categories c ON m.category_id = c.id
      WHERE c.slug = ${categorySlug} AND (m.is_archived IS NULL OR m.is_archived = false)
      ORDER BY m.id
    `);
    
    const models = result.rows.map((model: any) => ({
      id: model.id,
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
    
    cache.set(cacheKey, models);
    return models;
  }

  // Batch get all models for admin (with caching)
  async getAllModels() {
    const cached = cache.get('all_models');
    if (cached) return cached;

    const result = await db.execute(sql`
      SELECT m.id, m.category_id, m.model_id, m.name, m.gvwr, m.payload,
             m.deck_size, m.axles, m.base_price, m.image_url, m.features,
             m.is_archived, c.name as category_name
      FROM trailer_models m
      JOIN trailer_categories c ON m.category_id = c.id
      ORDER BY c.name, m.id
    `);
    
    const models = result.rows.map((model: any) => ({
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
      isArchived: model.is_archived || false
    }));
    
    cache.set('all_models', models);
    return models;
  }

  // Fast options lookup with caching
  async getAllOptions() {
    const cached = cache.get('all_options');
    if (cached) return cached;

    const result = await db.execute(sql`
      SELECT id, model_id, name, category, price, is_archived
      FROM trailer_options
      ORDER BY category, name
    `);
    
    const options = result.rows.map((option: any) => ({
      id: option.id,
      modelId: option.model_id,
      name: option.name,
      category: option.category,
      price: option.price,
      isArchived: option.is_archived || false
    }));
    
    cache.set('all_options', options);
    return options;
  }

  // Clear cache when data changes
  async updateModel(id: number, updates: any) {
    const queries = [];
    
    if (updates.basePrice !== undefined) {
      queries.push(db.execute(sql`UPDATE trailer_models SET base_price = ${updates.basePrice} WHERE id = ${id}`));
    }
    if (updates.name !== undefined) {
      queries.push(db.execute(sql`UPDATE trailer_models SET name = ${updates.name} WHERE id = ${id}`));
    }
    if (updates.isArchived !== undefined) {
      queries.push(db.execute(sql`UPDATE trailer_models SET is_archived = ${updates.isArchived} WHERE id = ${id}`));
    }
    
    await Promise.all(queries);
    
    // Clear ALL caches since pricing affects categories too
    cache.clear();
    
    return this.getModelById(id);
  }

  async archiveModel(id: number) {
    await db.execute(sql`UPDATE trailer_models SET is_archived = true WHERE id = ${id}`);
    // Clear ALL caches since archiving affects category pricing
    cache.clear();
  }

  async restoreModel(id: number) {
    await db.execute(sql`UPDATE trailer_models SET is_archived = false WHERE id = ${id}`);
    // Clear ALL caches since restoring affects category pricing
    cache.clear();
    return this.getModelById(id);
  }

  async archiveOption(id: number) {
    await db.execute(sql`UPDATE trailer_options SET is_archived = true WHERE id = ${id}`);
    cache.clear();
  }

  private async getModelById(id: number) {
    const result = await db.execute(sql`
      SELECT m.*, c.name as category_name
      FROM trailer_models m
      JOIN trailer_categories c ON m.category_id = c.id
      WHERE m.id = ${id}
    `);
    
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
      features: model.features || [],
      categoryName: model.category_name,
      isArchived: model.is_archived || false
    };
  }
}

export const fastStorage = new FastStorage();