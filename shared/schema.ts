import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trailer Categories
export const trailerCategories = pgTable("trailer_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  startingPrice: integer("starting_price").notNull(),
});

// Trailer Models
export const trailerModels = pgTable("trailer_models", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  modelId: text("model_id").notNull().unique(),
  name: text("name").notNull(),
  gvwr: text("gvwr").notNull(),
  payload: text("payload").notNull(),
  deckSize: text("deck_size").notNull(),
  axles: text("axles").notNull(),
  basePrice: integer("base_price").notNull(),
  imageUrl: text("image_url").notNull(),
  features: json("features").$type<string[]>().notNull(),
});

// Trailer Options
export const trailerOptions = pgTable("trailer_options", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  category: text("category").notNull(), // tires, ramps, color, extras, etc.
  name: text("name").notNull(),
  price: integer("price").notNull(),
  isMultiSelect: boolean("is_multi_select").default(false),
});

// User Configurations (for saving)
export const userConfigurations = pgTable("user_configurations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  categorySlug: text("category_slug").notNull(),
  modelId: text("model_id").notNull(),
  selectedOptions: json("selected_options").$type<Record<string, any>>().notNull(),
  totalPrice: integer("total_price").notNull(),
  createdAt: text("created_at").notNull(),
});

// Insert schemas
export const insertTrailerCategorySchema = createInsertSchema(trailerCategories);
export const insertTrailerModelSchema = createInsertSchema(trailerModels);
export const insertTrailerOptionSchema = createInsertSchema(trailerOptions);
export const insertUserConfigurationSchema = createInsertSchema(userConfigurations).omit({
  id: true,
});

// Types
export type TrailerCategory = typeof trailerCategories.$inferSelect;
export type TrailerModel = typeof trailerModels.$inferSelect;
export type TrailerOption = typeof trailerOptions.$inferSelect;
export type UserConfiguration = typeof userConfigurations.$inferSelect;
export type InsertUserConfiguration = z.infer<typeof insertUserConfigurationSchema>;
