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
});

// Trailer Models - represents model series (e.g., DHV207, FBH208)
export const trailerModels = pgTable("trailer_models", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  seriesId: integer("series_id"), // links to trailerSeries table
  series: text("series"), // series name as text (e.g., "FBH", "FBX")
  modelSeries: text("model_series").notNull(), // e.g., DHV207, FBH208
  name: text("name").notNull(),
  pullType: text("pull_type"), // 'bumper', 'gooseneck', 'both'
  gvwrRange: text("gvwr_range"), // e.g., "14,000 - 15,500"
  deckHeight: text("deck_height"),
  overallWidth: text("overall_width"),
  lengthRange: text("length_range"), // e.g., "14 - 16'"
  imageUrl: text("image_url").notNull(),
  standardFeatures: json("standard_features").$type<string[]>().notNull(),
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
});

// Trailer Series - defines series like FBH, FBX, Skid-Steer Tilt, etc.
export const trailerSeries = pgTable("trailer_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., "FBH", "FBX", "Skid-Steer Tilt"
  displayName: text("display_name").notNull(), // e.g., "FBH Series", "Heavy-Duty Equipment"
  description: text("description").notNull(),
  categoryId: integer("category_id").notNull(), // which category this series belongs to
  imageUrl: text("image_url"),
  startingPrice: integer("starting_price"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  payload: integer("payload"), // payload capacity for length options
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

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dealers - Updated with new fields
export const dealers = pgTable("dealers", {
  id: serial("id").primaryKey(),
  dealerId: varchar("dealer_id", { length: 50 }).notNull().unique(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  website: varchar("website", { length: 200 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  // Address fields
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  // Primary contact person
  contactFirstName: varchar("contact_first_name", { length: 100 }).notNull(),
  contactLastName: varchar("contact_last_name", { length: 100 }).notNull(),
  contactEmail: varchar("contact_email", { length: 200 }).notNull(),
  contactTitle: varchar("contact_title", { length: 100 }),
  // Legacy fields for backwards compatibility
  dealerName: varchar("dealer_name", { length: 200 }),
  contactName: varchar("contact_name", { length: 100 }),
  email: varchar("email", { length: 200 }),
  territory: varchar("territory", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dealer Users - For multi-user access per dealer
export const dealerUsers = pgTable("dealer_users", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'admin' or 'user'
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dealer Sessions - For main dealer account
export const dealerSessions = pgTable("dealer_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dealer User Sessions - For dealer users
export const dealerUserSessions = pgTable("dealer_user_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  dealerId: integer("dealer_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dealer Saved Orders
export const dealerOrders = pgTable("dealer_orders", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 200 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  categorySlug: text("category_slug").notNull(),
  categoryName: text("category_name").notNull(),
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  modelSpecs: json("model_specs").$type<any>().notNull(),
  selectedOptions: json("selected_options").$type<Record<string, any>>().notNull(),
  basePrice: integer("base_price").notNull(),
  optionsPrice: integer("options_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, submitted, processing, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom Quote Requests
export const customQuoteRequests = pgTable("custom_quote_requests", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  company: varchar("company", { length: 200 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  requirements: text("requirements").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, contacted, quoted, closed
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote Requests - From configurator modal
export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }),
  comments: text("comments"),
  optIn: boolean("opt_in").notNull().default(false),
  ageVerification: boolean("age_verification").notNull().default(false),
  // Configuration details
  categoryId: integer("category_id"),
  categoryName: varchar("category_name", { length: 100 }),
  modelId: varchar("model_id", { length: 50 }),
  modelName: varchar("model_name", { length: 200 }),
  selectedOptions: json("selected_options").$type<Record<string, any>>(),
  totalPrice: integer("total_price"),
  trailerSpecs: json("trailer_specs").$type<{
    gvwr?: string;
    payload?: string;
    deckSize?: string;
    axles?: string;
  }>(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, contacted, quoted, closed
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Media Files - For storing uploaded image metadata
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  objectPath: text("object_path").notNull().unique(), // The normalized object storage path
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  width: integer("width"), // image width in pixels
  height: integer("height"), // image height in pixels
  altText: text("alt_text"),
  description: text("description"),
  tags: json("tags").$type<string[]>().default([]),
  uploadedBy: integer("uploaded_by"), // admin user ID who uploaded
  usageCount: integer("usage_count").default(0), // how many times this image is used
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertDealerSchema = createInsertSchema(dealers).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDealerUserSchema = createInsertSchema(dealerUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});
export const insertDealerSessionSchema = createInsertSchema(dealerSessions).omit({
  createdAt: true,
});
export const insertDealerUserSessionSchema = createInsertSchema(dealerUserSessions).omit({
  createdAt: true,
});
export const insertDealerOrderSchema = createInsertSchema(dealerOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTrailerCategorySchema = createInsertSchema(trailerCategories).omit({ id: true });
export const insertTrailerSeriesSchema = createInsertSchema(trailerSeries).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
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
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export const insertCustomQuoteRequestSchema = createInsertSchema(customQuoteRequests).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Dealer = typeof dealers.$inferSelect;
export type DealerUser = typeof dealerUsers.$inferSelect;
export type DealerSession = typeof dealerSessions.$inferSelect;
export type DealerUserSession = typeof dealerUserSessions.$inferSelect;
export type DealerOrder = typeof dealerOrders.$inferSelect;
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type InsertDealerUser = z.infer<typeof insertDealerUserSchema>;
export type InsertDealerSession = z.infer<typeof insertDealerSessionSchema>;
export type InsertDealerUserSession = z.infer<typeof insertDealerUserSessionSchema>;
export type InsertDealerOrder = z.infer<typeof insertDealerOrderSchema>;
export type TrailerCategory = typeof trailerCategories.$inferSelect;
export type TrailerSeries = typeof trailerSeries.$inferSelect;
export type TrailerModel = typeof trailerModels.$inferSelect;
export type ModelVariant = typeof modelVariants.$inferSelect;
export type TrailerOption = typeof trailerOptions.$inferSelect;
export type UserConfiguration = typeof userConfigurations.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type CustomQuoteRequest = typeof customQuoteRequests.$inferSelect;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertTrailerCategory = z.infer<typeof insertTrailerCategorySchema>;
export type InsertTrailerSeries = z.infer<typeof insertTrailerSeriesSchema>;
export type InsertTrailerModel = z.infer<typeof insertTrailerModelSchema>;
export type InsertModelVariant = z.infer<typeof insertModelVariantSchema>;
export type InsertTrailerOption = z.infer<typeof insertTrailerOptionSchema>;
export type InsertUserConfiguration = z.infer<typeof insertUserConfigurationSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type InsertCustomQuoteRequest = z.infer<typeof insertCustomQuoteRequestSchema>;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;

// Relations
export const trailerCategoriesRelations = relations(trailerCategories, ({ many }) => ({
  models: many(trailerModels),
  series: many(trailerSeries),
}));

export const trailerSeriesRelations = relations(trailerSeries, ({ one, many }) => ({
  category: one(trailerCategories, {
    fields: [trailerSeries.categoryId],
    references: [trailerCategories.id],
  }),
  models: many(trailerModels),
}));

export const trailerModelsRelations = relations(trailerModels, ({ one, many }) => ({
  category: one(trailerCategories, {
    fields: [trailerModels.categoryId],
    references: [trailerCategories.id],
  }),
  series: one(trailerSeries, {
    fields: [trailerModels.seriesId],
    references: [trailerSeries.id],
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

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(adminUsers, {
    fields: [passwordResetTokens.userId],
    references: [adminUsers.id],
  }),
}));

export const dealersRelations = relations(dealers, ({ many }) => ({
  sessions: many(dealerSessions),
  orders: many(dealerOrders),
  users: many(dealerUsers),
}));

export const dealerUsersRelations = relations(dealerUsers, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [dealerUsers.dealerId],
    references: [dealers.id],
  }),
  sessions: many(dealerUserSessions),
}));

export const dealerSessionsRelations = relations(dealerSessions, ({ one }) => ({
  dealer: one(dealers, {
    fields: [dealerSessions.dealerId],
    references: [dealers.id],
  }),
}));

export const dealerUserSessionsRelations = relations(dealerUserSessions, ({ one }) => ({
  user: one(dealerUsers, {
    fields: [dealerUserSessions.userId],
    references: [dealerUsers.id],
  }),
  dealer: one(dealers, {
    fields: [dealerUserSessions.dealerId],
    references: [dealers.id],
  }),
}));

export const dealerOrdersRelations = relations(dealerOrders, ({ one }) => ({
  dealer: one(dealers, {
    fields: [dealerOrders.dealerId],
    references: [dealers.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  uploadedByUser: one(adminUsers, {
    fields: [mediaFiles.uploadedBy],
    references: [adminUsers.id],
  }),
}));
