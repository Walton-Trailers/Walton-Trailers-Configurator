import { pgTable, text, serial, integer, boolean, json, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  orderIndex: integer("order_index").default(0),
});

// Trailer Models - represents model series (e.g., DHV207, FBH208)
export const trailerModels = pgTable("trailer_models", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  modelSeries: text("model_series").notNull(), // e.g., DHV207, FBH208
  name: text("name").notNull(),
  pullType: text("pull_type"), // 'bumper', 'gooseneck', 'both'
  gvwrRange: text("gvwr_range"), // e.g., "14,000 - 15,500"
  deckHeight: text("deck_height"),
  overallWidth: text("overall_width"),
  lengthRange: text("length_range"), // e.g., "14 - 16'"
  imageUrl: text("image_url").notNull(),
  standardFeatures: json("standard_features").$type<string[]>().notNull(),
  orderIndex: integer("order_index").default(0),
});

// Model Variants - specific configurations (e.g., DHV207-14B)
export const modelVariants = pgTable("model_variants", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  variantCode: text("variant_code").notNull().unique(), // e.g., DHV207-14B
  tracCode: text("trac_code").notNull(),
  length: text("length").notNull(),
  pullType: text("pull_type").notNull(), // 'B' for bumper, 'G' for gooseneck, 'P' for pintle
  msrp: integer("msrp").notNull(),
  gvwr: integer("gvwr").notNull(),
  gawr: text("gawr"), // e.g., "7,000 (2)"
  emptyWeight: integer("empty_weight"),
  payload: integer("payload"),
  bedSize: text("bed_size"),
  overallSize: text("overall_size"),
  capacity: text("capacity"), // cubic yards for dump trailers
  orderIndex: integer("order_index").default(0),
});

// Trailer Options - now includes TRAC codes and categories
export const trailerOptions = pgTable("trailer_options", {
  id: serial("id").primaryKey(),
  optionCategory: text("option_category").notNull(), // e.g., 'Tire Options', 'Jack Options', 'Wall Height Options'
  optionType: text("option_type").notNull(), // e.g., 'tire_standard', 'tire_upgrade', 'jack_hydraulic'
  name: text("name").notNull(),
  description: text("description"),
  tracCode: text("trac_code"),
  price: integer("price").notNull(),
  priceUnit: text("price_unit"), // null for fixed price, 'ft' for per foot pricing
  imageUrl: text("image_url"),
  isDefault: boolean("is_default").default(false),
  applicableModels: json("applicable_models").$type<string[]>(), // which model series this applies to
  orderIndex: integer("order_index").default(0),
});

// User Configurations (for saving)
export const userConfigurations = pgTable("user_configurations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  categorySlug: text("category_slug").notNull(),
  modelId: integer("model_id").notNull(),
  variantId: integer("variant_id").notNull(),
  selectedOptions: json("selected_options").$type<Record<string, any>>().notNull(),
  totalPrice: integer("total_price").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Users
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 50 }),
  lastName: varchar("last_name", { length: 50 }),
  role: varchar("role", { length: 20 }).notNull().default("standard"), // 'admin' or 'standard'
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Sessions for authentication
export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom Quote Requests
export const customQuoteRequests = pgTable("custom_quote_requests", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  company: varchar("company", { length: 200 }),
  requirements: text("requirements").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, contacted, quoted, closed
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertTrailerCategorySchema = createInsertSchema(trailerCategories).omit({ id: true });
export const insertTrailerModelSchema = createInsertSchema(trailerModels).omit({ id: true });
export const insertModelVariantSchema = createInsertSchema(modelVariants).omit({ id: true });
export const insertTrailerOptionSchema = createInsertSchema(trailerOptions).omit({ id: true });
export const insertUserConfigurationSchema = createInsertSchema(userConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});
export const insertAdminSessionSchema = createInsertSchema(adminSessions).omit({
  createdAt: true,
});
export const insertCustomQuoteRequestSchema = createInsertSchema(customQuoteRequests).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type TrailerCategory = typeof trailerCategories.$inferSelect;
export type TrailerModel = typeof trailerModels.$inferSelect;
export type ModelVariant = typeof modelVariants.$inferSelect;
export type TrailerOption = typeof trailerOptions.$inferSelect;
export type UserConfiguration = typeof userConfigurations.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type CustomQuoteRequest = typeof customQuoteRequests.$inferSelect;
export type InsertTrailerCategory = z.infer<typeof insertTrailerCategorySchema>;
export type InsertTrailerModel = z.infer<typeof insertTrailerModelSchema>;
export type InsertModelVariant = z.infer<typeof insertModelVariantSchema>;
export type InsertTrailerOption = z.infer<typeof insertTrailerOptionSchema>;
export type InsertUserConfiguration = z.infer<typeof insertUserConfigurationSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;
export type InsertCustomQuoteRequest = z.infer<typeof insertCustomQuoteRequestSchema>;

// Relations
export const trailerCategoriesRelations = relations(trailerCategories, ({ many }) => ({
  models: many(trailerModels),
}));

export const trailerModelsRelations = relations(trailerModels, ({ one, many }) => ({
  category: one(trailerCategories, {
    fields: [trailerModels.categoryId],
    references: [trailerCategories.id],
  }),
  variants: many(modelVariants),
  configurations: many(userConfigurations),
}));

export const modelVariantsRelations = relations(modelVariants, ({ one }) => ({
  model: one(trailerModels, {
    fields: [modelVariants.modelId],
    references: [trailerModels.id],
  }),
}));

export const userConfigurationsRelations = relations(userConfigurations, ({ one }) => ({
  model: one(trailerModels, {
    fields: [userConfigurations.modelId],
    references: [trailerModels.id],
  }),
  variant: one(modelVariants, {
    fields: [userConfigurations.variantId],
    references: [modelVariants.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminSessions.userId],
    references: [adminUsers.id],
  }),
}));
