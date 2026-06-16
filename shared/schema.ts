import { pgTable, text, serial, integer, boolean, json, numeric, timestamp, varchar, date } from "drizzle-orm/pg-core";
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
  isArchived: boolean("is_archived").default(false),
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
  gvwr: text("gvwr"), // GVWR as text to match database
  payload: text("payload"), // payload as text to match database
  deckSize: text("deck_size"), // e.g., "20' x 7'"
  axles: text("axles"), // axles as text to match database
  deckHeight: text("deck_height"),
  overallWidth: text("overall_width"),
  lengthRange: text("length_range"), // e.g., "14 - 16'"
  basePrice: integer("base_price").default(0),
  imageUrl: text("image_url"),
  standardFeatures: json("features").$type<string[]>(), // Match actual column name
  lengthOptions: json("length_options").$type<string[]>(), // Available lengths for this model
  lengthPrice: json("length_price").$type<Record<string, number>>(), // Pricing for each length
  lengthGvwr: json("length_gvwr").$type<Record<string, string>>(), // GVWR values for each length
  lengthOrder: json("length_order").$type<Record<string, number>>(), // Display order for each length option
  categoryOrder: json("category_order").$type<Record<string, number>>(), // Display order for option categories (model-specific)
  pulltypeOptions: json("pulltype_options").$type<Record<string, string>>(), // Pull type options as JSON
  model3dUrl: text("model_3d_url"),
  imageUrls: json("image_urls").$type<string[]>(), // Gallery of images
  isArchived: boolean("is_archived").default(false),
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
  description: text("description").notNull(),
  slug: text("slug"), // URL-friendly version of name
  categoryId: integer("category_id").notNull(), // which category this series belongs to
  imageUrl: text("image_url"),
  basePrice: integer("base_price"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trailer Options - now includes TRAC codes and categories
export const trailerOptions = pgTable("trailer_options", {
  id: serial("id").primaryKey(),
  modelId: text("model_id"), // which specific model this option applies to
  category: text("category"), // simplified category name (e.g., 'tires', 'jack', 'extras')
  optionCategory: text("option_category").notNull(), // e.g., 'Tire Options', 'Jack Options', 'Wall Height Options'
  optionType: text("option_type").notNull(), // e.g., 'tire_standard', 'tire_upgrade', 'jack_hydraulic'
  name: text("name").notNull(),
  description: text("description"),
  tracCode: text("trac_code"),
  price: integer("price").notNull(),
  priceUnit: text("price_unit"), // null for fixed price, 'ft' for per foot pricing
  imageUrl: text("image_url"),
  isDefault: boolean("is_default").default(false),
  isMultiSelect: boolean("is_multi_select").default(false), // whether this option allows quantity selection
  isPerFt: boolean("is_per_ft").default(false), // whether pricing is per foot
  isArchived: boolean("is_archived").default(false),
  applicableModels: json("applicable_models").$type<string[]>(), // which model series this applies to
  payload: integer("payload"), // payload capacity for length options
  hexColor: text("hex_color"), // hex color value for color options (e.g., '#FF0000')
  primerPrice: integer("primer_price"), // primer price for color options
  // Conditional availability: this option is only shown/selectable when an option matching
  // (requiresCategory, requiresOptionName) is currently chosen. Both nullable; both must be
  // set to enforce a dependency. Example: Solar Charger requires category='jack',
  // optionName='Dual 12K Hydraulic Jacks'.
  requiresCategory: text("requires_category"),
  requiresOptionName: text("requires_option_name"),
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
  // Legacy. Email is the canonical login identifier (see 0009 migration).
  // Column kept nullable so existing rows aren't invalidated, but new rows
  // leave it NULL and neither the login form nor the create-user form ask
  // for it.
  username: varchar("username", { length: 50 }).unique(),
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

// Join table: which dealers each Walton employee (admin user) is assigned
// to cover. Bookkeeping only as of 0008 — assignments are surfaced in the
// Employees admin page but don't gate access in the dealer/order APIs yet.
export const adminDealerAssignments = pgTable("admin_dealer_assignments", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull(),
  dealerId: integer("dealer_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  // Parent dealer linkage. Locations of an existing dealer reference the
  // parent here; primary dealers leave it NULL. Used to derive the -L##
  // suffix on auto-generated dealer IDs.
  parentDealerId: integer("parent_dealer_id"),
  // 4-digit year the dealer was admitted. Powers the [YY] segment of the
  // auto-generated dealer_id (e.g. 2023 -> "23" in UT-23-001).
  establishedYear: varchar("established_year", { length: 4 }),
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
  // Pricing tier — references pricing_tiers.slug. New dealers default to 'standard'
  // (10% off MSRP). FK enforces referential integrity.
  pricingTier: varchar("pricing_tier", { length: 20 }).notNull().default('standard'),
  // Assigned Walton sales rep — order-submit emails are routed here.
  // Falls back to a default Walton inbox when null.
  salesRepName: varchar("sales_rep_name", { length: 200 }),
  salesRepEmail: varchar("sales_rep_email", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers — Elite / Preferred / Standard. Editable in admin so the
// discount percentages can be tuned without a code deploy.
export const pricingTiers = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 20 }).notNull().unique(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  discountPct: integer("discount_pct").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dealer Users - For multi-user access per dealer
export const dealerUsers = pgTable("dealer_users", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  // Legacy. Email is the canonical login identifier (see 0007 migration).
  // Column kept nullable so existing rows aren't invalidated, but new rows
  // leave it NULL and the dealer-user UI no longer asks for it.
  username: varchar("username", { length: 100 }).unique(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'admin' or 'user'
  isActive: boolean("is_active").notNull().default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
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

// Dealer Password Reset Tokens
export const dealerPasswordResetTokens = pgTable("dealer_password_reset_tokens", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 200 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
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
  // Dealer-supplied purchase order / internal reference number. Captured on
  // submit-to-Walton along with customer name above; both stay nullable so
  // existing draft rows aren't invalidated.
  poNumber: varchar("po_number", { length: 100 }),
  // Dealer's typed e-signature (their full name) captured at submit time,
  // authorizing the order. Recorded on the work order. Nullable so existing
  // rows aren't invalidated.
  dealerSignature: varchar("dealer_signature", { length: 200 }),
  // Walton's internal order number that the rep fills in after matching this
  // dealer order to their internal system. orderNumber above remains our
  // stable internal handle; this is what the dealer UI shows once assigned.
  repOrderNumber: varchar("rep_order_number", { length: 50 }),
  notes: text("notes"),
  // Stamped by the server when status transitions draft → submitted. Used by
  // the 48hr cancel-window logic on the dealer side. updated_at can't be
  // trusted as the submission timestamp because other edits bump it.
  submittedAt: timestamp("submitted_at"),
  // Soft delete. Non-null means the dealer moved the order to their Deleted
  // tab. We don't hard-delete so dealers can Recreate from a past order.
  deletedAt: timestamp("deleted_at"),
  // Work-order PDF the rep uploads after matching this to Walton's internal
  // system. Setting workOrderUrl on a 'submitted' order auto-flips status
  // to 'received' (PATCH /api/admin/dealer-orders/:id handler).
  workOrderUrl: varchar("work_order_url", { length: 500 }),
  workOrderUploadedAt: timestamp("work_order_uploaded_at"),
  // Invoice PDF the rep attaches once Walton invoices the dealer for the
  // build. Same pattern as workOrderUrl above.
  invoiceUrl: varchar("invoice_url", { length: 500 }),
  invoiceUploadedAt: timestamp("invoice_uploaded_at"),
  // Rep-set expected delivery / ship date so the dealer can plan customer
  // pickup. Stored as a DATE — no time component needed.
  expectedDeliveryDate: date("expected_delivery_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Persisted Reserve-Now requests from the dealer inventory page. The
// rep email is still where the actual hold happens — this table is the
// dealer-facing record so the dashboard can show what they have on
// hold alongside their orders.
export const inventoryReservations = pgTable("inventory_reservations", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  dealerUserId: integer("dealer_user_id"),
  airtableRecordId: varchar("airtable_record_id", { length: 50 }),
  stockNumber: varchar("stock_number", { length: 100 }),
  model: varchar("model", { length: 200 }),
  customerName: varchar("customer_name", { length: 200 }),
  note: text("note"),
  snapshotFields: json("snapshot_fields").$type<Record<string, any>>(),
  status: varchar("status", { length: 20 }).notNull().default("requested"),
  // Rep-internal commentary, set on the admin Reservations tab. Not
  // surfaced to the dealer — they only see status + their own note.
  repNotes: text("rep_notes"),
  // When the rep last moved the row through a status. Backfilled to
  // createdAt on existing rows (0012 migration).
  statusChangedAt: timestamp("status_changed_at"),
  // Work-order / document PDF the rep uploads for this reservation so the
  // dealer can view it on their Reserved tab. Mirrors dealer_orders.workOrderUrl.
  documentUrl: varchar("document_url", { length: 500 }),
  documentUploadedAt: timestamp("document_uploaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom Quote Requests feature was removed in 2026-05. The
// `custom_quote_requests` database table still exists in Neon (we kept
// historic rows on Taylor's request) but no code references it. If the
// feature ever comes back, restore the schema export here and the
// matching admin UI + /api/custom-quotes endpoints.

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
  // Lead funnel: new -> forwarded -> working -> won / lost.
  // Legacy rows may still carry pending/contacted/quoted/closed; the admin UI
  // maps those to the new vocabulary so no destructive backfill is needed.
  status: varchar("status", { length: 20 }).notNull().default("new"),
  notes: text("notes"), // Admin notes
  // Dealer that closed/won this lead (set when status -> 'won'). References
  // dealers.id; kept as a plain integer to match the parentDealerId style.
  closedByDealerId: integer("closed_by_dealer_id"),
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
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type InsertDealerUser = z.infer<typeof insertDealerUserSchema>;
export type InsertDealerSession = z.infer<typeof insertDealerSessionSchema>;
export type InsertDealerUserSession = z.infer<typeof insertDealerUserSessionSchema>;
export type InsertDealerOrder = z.infer<typeof insertDealerOrderSchema>;
export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;
export type TrailerCategory = typeof trailerCategories.$inferSelect;
export type TrailerSeries = typeof trailerSeries.$inferSelect;
export type TrailerModel = typeof trailerModels.$inferSelect;
export type ModelVariant = typeof modelVariants.$inferSelect;
export type TrailerOption = typeof trailerOptions.$inferSelect;
export type UserConfiguration = typeof userConfigurations.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
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
