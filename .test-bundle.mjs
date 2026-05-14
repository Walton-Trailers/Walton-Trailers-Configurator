var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  EmailService: () => EmailService
});
import nodemailer from "nodemailer";
import crypto2 from "crypto";
var EmailService;
var init_email_service = __esm({
  "server/email-service.ts"() {
    "use strict";
    EmailService = class _EmailService {
      static instance;
      transporter = null;
      config;
      constructor() {
        this.config = {
          provider: "console",
          from: "noreply@waltontrailers.com"
        };
        this.initializeFromEnv();
      }
      static getInstance() {
        if (!_EmailService.instance) {
          _EmailService.instance = new _EmailService();
        }
        return _EmailService.instance;
      }
      initializeFromEnv() {
        const provider = process.env.EMAIL_PROVIDER;
        if (provider === "smtp" && process.env.SMTP_HOST) {
          this.config = {
            provider: "smtp",
            smtp: {
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || "587"),
              secure: process.env.SMTP_SECURE === "true",
              user: process.env.SMTP_USER || "",
              pass: process.env.SMTP_PASS || ""
            },
            from: process.env.EMAIL_FROM || "noreply@waltontrailers.com"
          };
        } else if (provider === "gmail" && process.env.GMAIL_USER) {
          this.config = {
            provider: "gmail",
            gmail: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD || ""
            },
            from: process.env.EMAIL_FROM || process.env.GMAIL_USER
          };
        } else if (provider === "outlook" && process.env.OUTLOOK_USER) {
          this.config = {
            provider: "outlook",
            outlook: {
              user: process.env.OUTLOOK_USER,
              pass: process.env.OUTLOOK_PASS || ""
            },
            from: process.env.EMAIL_FROM || process.env.OUTLOOK_USER
          };
        }
        this.initializeTransporter();
      }
      async initializeTransporter() {
        try {
          switch (this.config.provider) {
            case "smtp":
              if (this.config.smtp) {
                this.transporter = nodemailer.createTransport({
                  host: this.config.smtp.host,
                  port: this.config.smtp.port,
                  secure: this.config.smtp.secure,
                  auth: {
                    user: this.config.smtp.user,
                    pass: this.config.smtp.pass
                  }
                });
              }
              break;
            case "gmail":
              if (this.config.gmail) {
                this.transporter = nodemailer.createTransport({
                  service: "gmail",
                  auth: {
                    user: this.config.gmail.user,
                    pass: this.config.gmail.pass
                  }
                });
              }
              break;
            case "outlook":
              if (this.config.outlook) {
                this.transporter = nodemailer.createTransport({
                  service: "hotmail",
                  auth: {
                    user: this.config.outlook.user,
                    pass: this.config.outlook.pass
                  }
                });
              }
              break;
            case "console":
            default:
              break;
          }
          if (this.transporter && this.config.provider !== "console") {
            await this.transporter.verify();
            console.log(`\u2705 Email service connected: ${this.config.provider}`);
          }
        } catch (error) {
          console.error(`\u274C Email service connection failed:`, error);
          this.config.provider = "console";
          this.transporter = null;
        }
      }
      async sendEmail(message) {
        try {
          if (this.config.provider === "console" || !this.transporter) {
            console.log("\n=== EMAIL SENT (Console Mode) ===");
            console.log(`To: ${message.to}`);
            console.log(`From: ${this.config.from}`);
            console.log(`Subject: ${message.subject}`);
            console.log("\n--- EMAIL CONTENT ---");
            console.log(message.text || message.html);
            console.log("================================\n");
            return true;
          }
          const result = await this.transporter.sendMail({
            from: this.config.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html
          });
          console.log(`\u2705 Email sent to ${message.to} - Message ID: ${result.messageId}`);
          return true;
        } catch (error) {
          console.error("\u274C Failed to send email:", error);
          console.log("\n=== EMAIL SENT (Fallback to Console) ===");
          console.log(`To: ${message.to}`);
          console.log(`From: ${this.config.from}`);
          console.log(`Subject: ${message.subject}`);
          console.log("\n--- EMAIL CONTENT ---");
          console.log(message.text || message.html);
          console.log("====================================\n");
          return false;
        }
      }
      async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/admin/reset-password?token=${resetToken}`;
        const emailContent = {
          to: email,
          subject: "Password Reset - Walton Trailers Admin",
          text: `
Hello,

You requested a password reset for your Walton Trailers admin account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

Best regards,
Walton Trailers Team
      `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #1f2937; margin: 0; }
    .content { margin-bottom: 30px; }
    .button { 
      display: inline-block; 
      background-color: #3b82f6; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .button:hover { background-color: #2563eb; }
    .link { word-break: break-all; color: #6b7280; font-size: 14px; }
    .footer { 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      color: #9ca3af; 
      font-size: 12px; 
    }
    .warning { color: #6b7280; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Walton Trailers</h1>
    </div>
    
    <div class="content">
      <h2 style="color: #374151;">Password Reset Request</h2>
      
      <p>Hello,</p>
      
      <p>You requested a password reset for your Walton Trailers admin account.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Your Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p class="link">${resetUrl}</p>
      
      <p class="warning">
        This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>Walton Trailers Admin System</p>
    </div>
  </div>
</body>
</html>
      `
        };
        return this.sendEmail(emailContent);
      }
      async sendDealerUserPasswordResetEmail(email, userName, resetToken) {
        const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/dealer/user/reset-password?token=${resetToken}`;
        const emailContent = {
          to: email,
          subject: "Password Reset - Walton Trailers Employee Portal",
          text: `
Hello ${userName},

We received a request to reset your password for the Walton Trailers employee portal.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.

Best regards,
Walton Trailers Team
      `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - Employee Portal</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { 
      display: inline-block; 
      background: #3b82f6; 
      color: white; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover { background: #2563eb; }
    .warning { 
      background: #fef3c7; 
      border-left: 4px solid #f59e0b; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px;
    }
    .footer { 
      padding: 20px; 
      text-align: center; 
      color: #666; 
      background: #f8f9fa;
      border-radius: 0 0 8px 8px;
      font-size: 14px;
    }
    .url-break { word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\u{1F69B} Walton Trailers</h1>
      <p style="margin: 5px 0 0 0;">Employee Portal - Password Reset</p>
    </div>
    
    <div class="content">
      <h2 style="color: #374151; margin-top: 0;">Hello ${userName},</h2>
      
      <p>We received a request to reset your password for the Walton Trailers employee portal.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset My Password</a>
      </div>
      
      <p><strong>This link will expire in 1 hour</strong> for security purposes.</p>
      
      <div class="warning">
        <strong>\u26A0\uFE0F Security Notice:</strong><br>
        If you didn't request this password reset, please ignore this email. 
        Your account remains secure and no changes have been made.
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="url-break">${resetUrl}</div>
    </div>
    
    <div class="footer">
      <p><strong>Walton Trailers</strong><br>
      Dealer Support Team<br>
      <small>If you have questions, contact your dealer administrator</small></p>
    </div>
  </div>
</body>
</html>
      `
        };
        return this.sendEmail(emailContent);
      }
      async sendDealerPasswordResetEmail(email, dealerName, resetToken) {
        const resetUrl = `${process.env.BASE_URL || "http://localhost:5000"}/dealer/reset-password/${resetToken}`;
        const emailContent = {
          to: email,
          subject: "Password Reset - Walton Trailers Dealer Portal",
          text: `
Hello ${dealerName},

We received a request to reset your password for the Walton Trailers dealer portal.

Click the link below to reset your password:
${resetUrl}

This link will expire in 2 hours. If you didn't request this reset, you can safely ignore this email.

Best regards,
Walton Trailers Team
      `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - Dealer Portal</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { 
      display: inline-block; 
      background: #3b82f6; 
      color: white; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover { background: #2563eb; }
    .warning { 
      background: #fef3c7; 
      border-left: 4px solid #f59e0b; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px;
    }
    .footer { 
      padding: 20px; 
      text-align: center; 
      color: #666; 
      background: #f8f9fa;
      border-radius: 0 0 8px 8px;
      font-size: 14px;
    }
    .url-break { word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\u{1F69B} Walton Trailers</h1>
      <p style="margin: 5px 0 0 0;">Dealer Portal - Password Reset</p>
    </div>
    
    <div class="content">
      <h2 style="color: #374151; margin-top: 0;">Hello ${dealerName},</h2>
      
      <p>We received a request to reset your password for the Walton Trailers dealer portal.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset My Password</a>
      </div>
      
      <p><strong>This link will expire in 2 hours</strong> for security purposes.</p>
      
      <div class="warning">
        <strong>\u26A0\uFE0F Security Notice:</strong><br>
        If you didn't request this password reset, please ignore this email. 
        Your account remains secure and no changes have been made.
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="url-break">${resetUrl}</div>
    </div>
    
    <div class="footer">
      <p><strong>Walton Trailers</strong><br>
      Dealer Support Team<br>
      <small>If you have questions, contact us at support@waltontrailers.com</small></p>
    </div>
  </div>
</body>
</html>
      `
        };
        return this.sendEmail(emailContent);
      }
      // Generate secure reset token
      generateResetToken() {
        return crypto2.randomBytes(32).toString("hex");
      }
      // Get current configuration info
      getConfig() {
        return {
          provider: this.config.provider,
          from: this.config.from
        };
      }
      // Reconfigure email service
      async configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await this.initializeTransporter();
        return this.transporter !== null || this.config.provider === "console";
      }
    };
  }
});

// server/email-config.ts
var email_config_exports = {};
__export(email_config_exports, {
  EmailConfigManager: () => EmailConfigManager
});
var EmailConfigManager;
var init_email_config = __esm({
  "server/email-config.ts"() {
    "use strict";
    EmailConfigManager = class _EmailConfigManager {
      static instance;
      settings;
      constructor() {
        this.settings = {
          provider: process.env.EMAIL_PROVIDER || "console",
          fromAddress: process.env.EMAIL_FROM || "noreply@waltontrailers.com",
          smtpHost: process.env.SMTP_HOST,
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpSecure: process.env.SMTP_SECURE === "true",
          smtpUser: process.env.SMTP_USER,
          smtpPass: process.env.SMTP_PASS,
          gmailUser: process.env.GMAIL_USER,
          gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
          outlookUser: process.env.OUTLOOK_USER,
          outlookPass: process.env.OUTLOOK_PASS
        };
      }
      static getInstance() {
        if (!_EmailConfigManager.instance) {
          _EmailConfigManager.instance = new _EmailConfigManager();
        }
        return _EmailConfigManager.instance;
      }
      getSettings() {
        return { ...this.settings };
      }
      updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      }
      // Get settings without sensitive data
      getPublicSettings() {
        return {
          provider: this.settings.provider,
          fromAddress: this.settings.fromAddress,
          smtpHost: this.settings.smtpHost,
          smtpPort: this.settings.smtpPort,
          smtpSecure: this.settings.smtpSecure,
          gmailUser: this.settings.gmailUser,
          outlookUser: this.settings.outlookUser
        };
      }
      // Validate email configuration
      validateSettings() {
        const errors = [];
        if (!this.settings.fromAddress || !this.isValidEmail(this.settings.fromAddress)) {
          errors.push("Valid from address is required");
        }
        switch (this.settings.provider) {
          case "smtp":
            if (!this.settings.smtpHost) errors.push("SMTP host is required");
            if (!this.settings.smtpUser) errors.push("SMTP user is required");
            if (!this.settings.smtpPass) errors.push("SMTP password is required");
            break;
          case "gmail":
            if (!this.settings.gmailUser) errors.push("Gmail user is required");
            if (!this.settings.gmailAppPassword) errors.push("Gmail app password is required");
            break;
          case "outlook":
            if (!this.settings.outlookUser) errors.push("Outlook user is required");
            if (!this.settings.outlookPass) errors.push("Outlook password is required");
            break;
        }
        return {
          isValid: errors.length === 0,
          errors
        };
      }
      isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
    };
  }
});

// server/main.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cookieParser from "cookie-parser";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminSessions: () => adminSessions,
  adminSessionsRelations: () => adminSessionsRelations,
  adminUsers: () => adminUsers,
  adminUsersRelations: () => adminUsersRelations,
  customQuoteRequests: () => customQuoteRequests,
  dealerOrders: () => dealerOrders,
  dealerOrdersRelations: () => dealerOrdersRelations,
  dealerPasswordResetTokens: () => dealerPasswordResetTokens,
  dealerSessions: () => dealerSessions,
  dealerSessionsRelations: () => dealerSessionsRelations,
  dealerUserSessions: () => dealerUserSessions,
  dealerUserSessionsRelations: () => dealerUserSessionsRelations,
  dealerUsers: () => dealerUsers,
  dealerUsersRelations: () => dealerUsersRelations,
  dealers: () => dealers,
  dealersRelations: () => dealersRelations,
  insertAdminSessionSchema: () => insertAdminSessionSchema,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertCustomQuoteRequestSchema: () => insertCustomQuoteRequestSchema,
  insertDealerOrderSchema: () => insertDealerOrderSchema,
  insertDealerSchema: () => insertDealerSchema,
  insertDealerSessionSchema: () => insertDealerSessionSchema,
  insertDealerUserSchema: () => insertDealerUserSchema,
  insertDealerUserSessionSchema: () => insertDealerUserSessionSchema,
  insertMediaFileSchema: () => insertMediaFileSchema,
  insertModelVariantSchema: () => insertModelVariantSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertQuoteRequestSchema: () => insertQuoteRequestSchema,
  insertTrailerCategorySchema: () => insertTrailerCategorySchema,
  insertTrailerModelSchema: () => insertTrailerModelSchema,
  insertTrailerOptionSchema: () => insertTrailerOptionSchema,
  insertTrailerSeriesSchema: () => insertTrailerSeriesSchema,
  insertUserConfigurationSchema: () => insertUserConfigurationSchema,
  mediaFiles: () => mediaFiles,
  mediaFilesRelations: () => mediaFilesRelations,
  modelVariants: () => modelVariants,
  modelVariantsRelations: () => modelVariantsRelations,
  passwordResetTokens: () => passwordResetTokens,
  passwordResetTokensRelations: () => passwordResetTokensRelations,
  quoteRequests: () => quoteRequests,
  trailerCategories: () => trailerCategories,
  trailerCategoriesRelations: () => trailerCategoriesRelations,
  trailerModels: () => trailerModels,
  trailerModelsRelations: () => trailerModelsRelations,
  trailerOptions: () => trailerOptions,
  trailerSeries: () => trailerSeries,
  trailerSeriesRelations: () => trailerSeriesRelations,
  userConfigurations: () => userConfigurations,
  userConfigurationsRelations: () => userConfigurationsRelations
});
import { pgTable, text, serial, integer, boolean, json, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var trailerCategories = pgTable("trailer_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  startingPrice: integer("starting_price").notNull(),
  orderIndex: integer("order_index").default(0),
  isArchived: boolean("is_archived").default(false)
});
var trailerModels = pgTable("trailer_models", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  seriesId: integer("series_id"),
  // links to trailerSeries table
  series: text("series"),
  // series name as text (e.g., "FBH", "FBX")
  modelSeries: text("model_series").notNull(),
  // e.g., DHV207, FBH208
  name: text("name").notNull(),
  pullType: text("pull_type"),
  // 'bumper', 'gooseneck', 'both'
  gvwrRange: text("gvwr_range"),
  // e.g., "14,000 - 15,500"
  gvwr: text("gvwr"),
  // GVWR as text to match database
  payload: text("payload"),
  // payload as text to match database
  deckSize: text("deck_size"),
  // e.g., "20' x 7'"
  axles: text("axles"),
  // axles as text to match database
  deckHeight: text("deck_height"),
  overallWidth: text("overall_width"),
  lengthRange: text("length_range"),
  // e.g., "14 - 16'"
  basePrice: integer("base_price").default(0),
  imageUrl: text("image_url"),
  standardFeatures: json("features").$type(),
  // Match actual column name
  lengthOptions: json("length_options").$type(),
  // Available lengths for this model
  lengthPrice: json("length_price").$type(),
  // Pricing for each length
  lengthGvwr: json("length_gvwr").$type(),
  // GVWR values for each length
  lengthOrder: json("length_order").$type(),
  // Display order for each length option
  categoryOrder: json("category_order").$type(),
  // Display order for option categories (model-specific)
  pulltypeOptions: json("pulltype_options").$type(),
  // Pull type options as JSON
  model3dUrl: text("model_3d_url"),
  imageUrls: json("image_urls").$type(),
  // Gallery of images
  isArchived: boolean("is_archived").default(false)
});
var modelVariants = pgTable("model_variants", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  variantCode: text("variant_code").notNull().unique(),
  // e.g., DHV207-14B
  tracCode: text("trac_code").notNull(),
  length: text("length").notNull(),
  pullType: text("pull_type").notNull(),
  // 'B' for bumper, 'G' for gooseneck, 'P' for pintle
  msrp: integer("msrp").notNull(),
  gvwr: integer("gvwr").notNull(),
  gawr: text("gawr"),
  // e.g., "7,000 (2)"
  emptyWeight: integer("empty_weight"),
  payload: integer("payload"),
  bedSize: text("bed_size"),
  overallSize: text("overall_size"),
  capacity: text("capacity")
  // cubic yards for dump trailers
});
var trailerSeries = pgTable("trailer_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // e.g., "FBH", "FBX", "Skid-Steer Tilt"
  description: text("description").notNull(),
  slug: text("slug"),
  // URL-friendly version of name
  categoryId: integer("category_id").notNull(),
  // which category this series belongs to
  imageUrl: text("image_url"),
  basePrice: integer("base_price"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var trailerOptions = pgTable("trailer_options", {
  id: serial("id").primaryKey(),
  modelId: text("model_id"),
  // which specific model this option applies to
  category: text("category"),
  // simplified category name (e.g., 'tires', 'jack', 'extras')
  optionCategory: text("option_category").notNull(),
  // e.g., 'Tire Options', 'Jack Options', 'Wall Height Options'
  optionType: text("option_type").notNull(),
  // e.g., 'tire_standard', 'tire_upgrade', 'jack_hydraulic'
  name: text("name").notNull(),
  description: text("description"),
  tracCode: text("trac_code"),
  price: integer("price").notNull(),
  priceUnit: text("price_unit"),
  // null for fixed price, 'ft' for per foot pricing
  imageUrl: text("image_url"),
  isDefault: boolean("is_default").default(false),
  isMultiSelect: boolean("is_multi_select").default(false),
  // whether this option allows quantity selection
  isPerFt: boolean("is_per_ft").default(false),
  // whether pricing is per foot
  isArchived: boolean("is_archived").default(false),
  applicableModels: json("applicable_models").$type(),
  // which model series this applies to
  payload: integer("payload"),
  // payload capacity for length options
  hexColor: text("hex_color"),
  // hex color value for color options (e.g., '#FF0000')
  primerPrice: integer("primer_price")
  // primer price for color options
});
var userConfigurations = pgTable("user_configurations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  categorySlug: text("category_slug").notNull(),
  modelId: integer("model_id").notNull(),
  variantId: integer("variant_id").notNull(),
  selectedOptions: json("selected_options").$type().notNull(),
  totalPrice: integer("total_price").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 50 }),
  lastName: varchar("last_name", { length: 50 }),
  role: varchar("role", { length: 20 }).notNull().default("standard"),
  // 'admin' or 'standard'
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var adminSessions = pgTable("admin_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var dealers = pgTable("dealers", {
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
  updatedAt: timestamp("updated_at").defaultNow()
});
var dealerUsers = pgTable("dealer_users", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  // 'admin' or 'user'
  isActive: boolean("is_active").notNull().default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dealerSessions = pgTable("dealer_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var dealerPasswordResetTokens = pgTable("dealer_password_reset_tokens", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 200 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var dealerUserSessions = pgTable("dealer_user_sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull(),
  dealerId: integer("dealer_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var dealerOrders = pgTable("dealer_orders", {
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
  modelSpecs: json("model_specs").$type().notNull(),
  selectedOptions: json("selected_options").$type().notNull(),
  basePrice: integer("base_price").notNull(),
  optionsPrice: integer("options_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  // draft, submitted, processing, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var customQuoteRequests = pgTable("custom_quote_requests", {
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
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // pending, contacted, quoted, closed
  notes: text("notes"),
  // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var quoteRequests = pgTable("quote_requests", {
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
  selectedOptions: json("selected_options").$type(),
  totalPrice: integer("total_price"),
  trailerSpecs: json("trailer_specs").$type(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // pending, contacted, quoted, closed
  notes: text("notes"),
  // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  objectPath: text("object_path").notNull().unique(),
  // The normalized object storage path
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  // in bytes
  width: integer("width"),
  // image width in pixels
  height: integer("height"),
  // image height in pixels
  altText: text("alt_text"),
  description: text("description"),
  tags: json("tags").$type().default([]),
  uploadedBy: integer("uploaded_by"),
  // admin user ID who uploaded
  usageCount: integer("usage_count").default(0),
  // how many times this image is used
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertDealerSchema = createInsertSchema(dealers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDealerUserSchema = createInsertSchema(dealerUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true
});
var insertDealerSessionSchema = createInsertSchema(dealerSessions).omit({
  createdAt: true
});
var insertDealerUserSessionSchema = createInsertSchema(dealerUserSessions).omit({
  createdAt: true
});
var insertDealerOrderSchema = createInsertSchema(dealerOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true
});
var insertTrailerCategorySchema = createInsertSchema(trailerCategories).omit({ id: true });
var insertTrailerSeriesSchema = createInsertSchema(trailerSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTrailerModelSchema = createInsertSchema(trailerModels).omit({ id: true });
var insertModelVariantSchema = createInsertSchema(modelVariants).omit({ id: true });
var insertTrailerOptionSchema = createInsertSchema(trailerOptions).omit({ id: true });
var insertUserConfigurationSchema = createInsertSchema(userConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true
});
var insertAdminSessionSchema = createInsertSchema(adminSessions).omit({
  createdAt: true
});
var insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true
});
var insertCustomQuoteRequestSchema = createInsertSchema(customQuoteRequests).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true
});
var insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true
});
var insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var trailerCategoriesRelations = relations(trailerCategories, ({ many }) => ({
  models: many(trailerModels),
  series: many(trailerSeries)
}));
var trailerSeriesRelations = relations(trailerSeries, ({ one, many }) => ({
  category: one(trailerCategories, {
    fields: [trailerSeries.categoryId],
    references: [trailerCategories.id]
  }),
  models: many(trailerModels)
}));
var trailerModelsRelations = relations(trailerModels, ({ one, many }) => ({
  category: one(trailerCategories, {
    fields: [trailerModels.categoryId],
    references: [trailerCategories.id]
  }),
  series: one(trailerSeries, {
    fields: [trailerModels.seriesId],
    references: [trailerSeries.id]
  }),
  variants: many(modelVariants),
  configurations: many(userConfigurations)
}));
var modelVariantsRelations = relations(modelVariants, ({ one }) => ({
  model: one(trailerModels, {
    fields: [modelVariants.modelId],
    references: [trailerModels.id]
  })
}));
var userConfigurationsRelations = relations(userConfigurations, ({ one }) => ({
  model: one(trailerModels, {
    fields: [userConfigurations.modelId],
    references: [trailerModels.id]
  }),
  variant: one(modelVariants, {
    fields: [userConfigurations.variantId],
    references: [modelVariants.id]
  })
}));
var adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions)
}));
var adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminSessions.userId],
    references: [adminUsers.id]
  })
}));
var passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(adminUsers, {
    fields: [passwordResetTokens.userId],
    references: [adminUsers.id]
  })
}));
var dealersRelations = relations(dealers, ({ many }) => ({
  sessions: many(dealerSessions),
  orders: many(dealerOrders),
  users: many(dealerUsers)
}));
var dealerUsersRelations = relations(dealerUsers, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [dealerUsers.dealerId],
    references: [dealers.id]
  }),
  sessions: many(dealerUserSessions)
}));
var dealerSessionsRelations = relations(dealerSessions, ({ one }) => ({
  dealer: one(dealers, {
    fields: [dealerSessions.dealerId],
    references: [dealers.id]
  })
}));
var dealerUserSessionsRelations = relations(dealerUserSessions, ({ one }) => ({
  user: one(dealerUsers, {
    fields: [dealerUserSessions.userId],
    references: [dealerUsers.id]
  }),
  dealer: one(dealers, {
    fields: [dealerUserSessions.dealerId],
    references: [dealers.id]
  })
}));
var dealerOrdersRelations = relations(dealerOrders, ({ one }) => ({
  dealer: one(dealers, {
    fields: [dealerOrders.dealerId],
    references: [dealers.id]
  })
}));
var mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  uploadedByUser: one(adminUsers, {
    fields: [mediaFiles.uploadedBy],
    references: [adminUsers.id]
  })
}));

// server/db.ts
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = false;
var pool = null;
var db = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // Reduced for faster startup
    idleTimeoutMillis: 1e4,
    // 10 seconds
    connectionTimeoutMillis: 5e3,
    // 5 seconds for faster failure
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : void 0
  });
  db = drizzle({ client: pool, schema: schema_exports });
} else {
  if (process.env.NODE_ENV === "production") {
    console.warn("WARNING: DATABASE_URL not set. Database features will be disabled.");
    console.warn("To enable database features, add a PostgreSQL database in your Replit deployment settings.");
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }
}

// server/cache.ts
var FastCache = class {
  cache = /* @__PURE__ */ new Map();
  TTL = 3e5;
  // 5 minutes
  set(key, data, ttl = this.TTL) {
    this.cache.set(key, { data, expires: Date.now() + ttl });
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  clear() {
    this.cache.clear();
    console.log("\u{1F5D1}\uFE0F Cache cleared - dynamic pricing updated");
  }
  // Auto-cleanup expired entries every 5 minutes
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }, 3e5);
  }
};
var cache = new FastCache();
cache.startCleanup();

// server/storage.ts
import { sql, eq } from "drizzle-orm";

// server/no-db-storage.ts
var NoDatabaseStorage = class {
  adminUsers = /* @__PURE__ */ new Map();
  adminSessions = /* @__PURE__ */ new Map();
  nextId = 1;
  constructor() {
    console.log("Using in-memory storage (no database)");
  }
  // Trailer operations - return empty data
  async getTrailerCategories() {
    return [];
  }
  async getTrailerModelsByCategory(categorySlug) {
    return [];
  }
  async getTrailerModelsBySeries(seriesId) {
    return [];
  }
  async getTrailerModel(modelId) {
    return void 0;
  }
  async getTrailerOptions(modelId) {
    return [];
  }
  async getOptionsForModel(modelId) {
    return [];
  }
  async saveConfiguration(config) {
    return { id: 1, ...config };
  }
  async getConfigurations(sessionId) {
    return [];
  }
  async getConfiguration(id) {
    return void 0;
  }
  // Admin operations
  async createAdminUser(data) {
    const id = this.nextId++;
    const user = {
      id,
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      role: data.role ?? "standard",
      isActive: data.isActive ?? true,
      lastLogin: null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.adminUsers.set(id, user);
    return user;
  }
  async getAdminUserByUsername(username) {
    for (const user of this.adminUsers.values()) {
      if (user.username === username) return user;
    }
    return void 0;
  }
  async getAdminUserById(id) {
    return this.adminUsers.get(id);
  }
  async getAllAdminUsers() {
    return Array.from(this.adminUsers.values());
  }
  async updateAdminUser(id, updates) {
    const user = this.adminUsers.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    this.adminUsers.set(id, updatedUser);
    return updatedUser;
  }
  async deleteAdminUser(id) {
    this.adminUsers.delete(id);
  }
  async createAdminSession(data) {
    const session = {
      id: data.sessionId,
      userId: data.userId,
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt: data.expiresAt
    };
    this.adminSessions.set(data.sessionId, session);
    return session;
  }
  async getAdminSession(sessionId) {
    return this.adminSessions.get(sessionId);
  }
  async deleteAdminSession(sessionId) {
    this.adminSessions.delete(sessionId);
  }
  async deleteExpiredSessions() {
    const now = /* @__PURE__ */ new Date();
    for (const [id, session] of this.adminSessions.entries()) {
      if (session.expiresAt < now) {
        this.adminSessions.delete(id);
      }
    }
  }
  // Pricing management operations
  async getAllModels() {
    return [];
  }
  async getAllOptions() {
    return [];
  }
  async updateModel(id, updates) {
    throw new Error("Database not available");
  }
  async updateOption(id, updates) {
    throw new Error("Database not available");
  }
  async createOption(data) {
    throw new Error("Database not available");
  }
  async deleteOption(id) {
    throw new Error("Database not available");
  }
  async archiveOption(id) {
    throw new Error("Database not available");
  }
  async archiveModel(id) {
    throw new Error("Database not available");
  }
  async restoreModel(id) {
    throw new Error("Database not available");
  }
  async getOptionCategories() {
    return [];
  }
  // Missing methods
  async saveUserConfiguration(config) {
    return { id: 1, ...config };
  }
  async getUserConfiguration(sessionId) {
    return void 0;
  }
  async getAdminUserByEmail(email) {
    for (const user of this.adminUsers.values()) {
      if (user.email === email) return user;
    }
    return void 0;
  }
  async deactivateAdminUser(id) {
    const user = this.adminUsers.get(id);
    if (user) {
      user.isActive = false;
      this.adminUsers.set(id, user);
    }
  }
  // Airtable configuration methods
  airtableConfig = null;
  async saveAirtableConfig(config) {
    this.airtableConfig = config;
  }
  async getAirtableConfig() {
    return this.airtableConfig;
  }
  isAdminSession(sessionId) {
    return this.adminSessions.has(sessionId);
  }
  // Series management operations
  async getAllSeries() {
    return [];
  }
  async createSeries(data) {
    throw new Error("Database not available");
  }
  async updateSeries(id, updates) {
    throw new Error("Database not available");
  }
  async deleteSeries(id) {
    throw new Error("Database not available");
  }
  // Password reset token operations
  async createPasswordResetToken(token) {
    throw new Error("Database not available");
  }
  async getPasswordResetToken(token) {
    return void 0;
  }
  async markPasswordResetTokenAsUsed(token) {
    throw new Error("Database not available");
  }
  async deleteExpiredResetTokens() {
  }
  async createModel(data) {
    throw new Error("Database not available");
  }
};

// server/storage.ts
var isDatabaseAvailable = !!db;
var MemStorage = class {
  categories;
  models;
  options;
  configurations;
  currentId;
  constructor() {
    this.categories = /* @__PURE__ */ new Map();
    this.models = /* @__PURE__ */ new Map();
    this.options = /* @__PURE__ */ new Map();
    this.configurations = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.initializeData();
  }
  initializeData() {
    const categoriesData = [
      {
        id: 1,
        slug: "gooseneck",
        name: "Gooseneck Trailers",
        description: "Heavy-duty trailers with superior stability and higher payload capacity. Perfect for construction and industrial applications.",
        imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 18500,
        orderIndex: 1
      },
      {
        id: 2,
        slug: "tilt",
        name: "Tilt Equipment Trailers",
        description: "Hydraulic tilt design for easy loading of heavy machinery and equipment. Built for maximum durability.",
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 15200,
        orderIndex: 2
      },
      {
        id: 3,
        slug: "dump",
        name: "Dump Trailers",
        description: "Hydraulic dump systems with reinforced beds. Ideal for landscaping, construction, and material hauling.",
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 12500,
        orderIndex: 3
      },
      {
        id: 4,
        slug: "hauler",
        name: "Car/Equipment Haulers",
        description: "Low-profile design with drive-over fenders. Perfect for transporting vehicles and low-clearance equipment.",
        imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 14800,
        orderIndex: 4
      },
      {
        id: 5,
        slug: "landscape",
        name: "Landscape Trailers",
        description: "Side gates and removable ramps for easy loading. Designed specifically for landscaping professionals.",
        imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
        startingPrice: 8900,
        orderIndex: 5
      }
    ];
    categoriesData.forEach((cat) => this.categories.set(cat.id, cat));
    const modelsData = [
      // Dump Trailers
      {
        id: 1,
        categoryId: 3,
        seriesId: 1,
        modelId: "DHO215",
        name: "DHO215 - 16' Dump Trailer",
        gvwr: "15,400 lbs",
        payload: "12,600 lbs",
        deckSize: `16' x 83"`,
        axles: "Dual 7K",
        basePrice: 12500,
        imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["12V Hydraulic Pump", "Tarp Kit", "LED Lighting", "7K Axles"]
      },
      {
        id: 2,
        categoryId: 3,
        seriesId: 2,
        modelId: "DTX620",
        name: "DTX620 - 20' Heavy Duty Dump",
        gvwr: "20,000 lbs",
        payload: "16,800 lbs",
        deckSize: `20' x 96"`,
        axles: "Triple 7K",
        basePrice: 18900,
        imageUrl: "https://images.unsplash.com/photo-1586798271628-e8463d8c3c30?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["24V Hydraulic System", "Premium Tarp", "LED Package", "Triple Axles"]
      },
      // Gooseneck Trailers
      {
        id: 3,
        categoryId: 1,
        seriesId: 3,
        modelId: "FBX210",
        name: "FBX210 - 28' Gooseneck Flatbed",
        gvwr: "25,000 lbs",
        payload: "20,200 lbs",
        deckSize: `28' x 102"`,
        axles: "Dual 12K",
        basePrice: 18500,
        imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["Gooseneck Hitch", "Wood Deck", "LED Lights", "Adjustable Coupler"]
      },
      // Tilt Equipment
      {
        id: 4,
        categoryId: 2,
        seriesId: 4,
        modelId: "TSX208",
        name: "TSX208 - 20' Tilt Equipment",
        gvwr: "16,000 lbs",
        payload: "13,200 lbs",
        deckSize: `20' x 83"`,
        axles: "Dual 8K",
        basePrice: 15200,
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        features: ["Hydraulic Tilt", "Steel Deck", "Winch Track", "Tool Box"]
      }
    ];
    modelsData.forEach((model) => this.models.set(model.modelId, model));
    const optionsData = {
      "DHO215": [
        { id: 1, modelId: "DHO215", applicableModels: ["DHO215"], category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 2, modelId: "DHO215", applicableModels: ["DHO215"], category: "tires", name: 'ST235/85R16 "G" 14-ply', price: 600, isMultiSelect: false },
        { id: 3, modelId: "DHO215", applicableModels: ["DHO215"], category: "ramps", name: "No Ramp", price: 0, isMultiSelect: false },
        { id: 4, modelId: "DHO215", applicableModels: ["DHO215"], category: "ramps", name: "Slide-in Ramps", price: 450, isMultiSelect: false },
        { id: 5, modelId: "DHO215", applicableModels: ["DHO215"], category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 6, modelId: "DHO215", applicableModels: ["DHO215"], category: "color", name: "Custom Color", price: 1200, isMultiSelect: false },
        { id: 7, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "Toolbox", price: 850, isMultiSelect: true },
        { id: 8, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "Spare Tire Mount", price: 200, isMultiSelect: true },
        { id: 9, modelId: "DHO215", applicableModels: ["DHO215"], category: "extras", name: "D-Rings (4)", price: 120, isMultiSelect: true }
      ],
      "DTX620": [
        { id: 10, modelId: "DTX620", applicableModels: ["DTX620"], category: "tires", name: "Standard ST235/85R16", price: 0, isMultiSelect: false },
        { id: 11, modelId: "DTX620", applicableModels: ["DTX620"], category: "tires", name: 'ST235/85R16 "G" 14-ply', price: 900, isMultiSelect: false },
        { id: 12, modelId: "DTX620", applicableModels: ["DTX620"], category: "walls", name: 'Standard 24" Walls', price: 0, isMultiSelect: false },
        { id: 13, modelId: "DTX620", applicableModels: ["DTX620"], category: "walls", name: 'High 36" Walls', price: 1500, isMultiSelect: false },
        { id: 14, modelId: "DTX620", applicableModels: ["DTX620"], category: "color", name: "Standard Black", price: 0, isMultiSelect: false },
        { id: 15, modelId: "DTX620", applicableModels: ["DTX620"], category: "color", name: "Custom Color", price: 1200, isMultiSelect: false }
      ],
      "FBX210": [
        { id: 16, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "24' Length", price: -2e3, isMultiSelect: false },
        { id: 17, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "28' Length", price: 0, isMultiSelect: false },
        { id: 18, modelId: "FBX210", applicableModels: ["FBX210"], category: "deck", name: "32' Length", price: 3e3, isMultiSelect: false },
        { id: 19, modelId: "FBX210", applicableModels: ["FBX210"], category: "ramps", name: "No Ramps", price: 0, isMultiSelect: false },
        { id: 20, modelId: "FBX210", applicableModels: ["FBX210"], category: "ramps", name: "8' Slide-in Ramps", price: 1200, isMultiSelect: false }
      ],
      "TSX208": [
        { id: 21, modelId: "TSX208", applicableModels: ["TSX208"], category: "winch", name: "No Winch", price: 0, isMultiSelect: false },
        { id: 22, modelId: "TSX208", applicableModels: ["TSX208"], category: "winch", name: "12V Electric Winch", price: 1500, isMultiSelect: false }
      ]
    };
    Object.entries(optionsData).forEach(([modelId, options]) => {
      this.options.set(modelId, options);
    });
  }
  async getTrailerCategories() {
    return Array.from(this.categories.values());
  }
  async getAllTrailerCategories() {
    return Array.from(this.categories.values());
  }
  async getTrailerModelsByCategory(categorySlug) {
    const category = Array.from(this.categories.values()).find((cat) => cat.slug === categorySlug);
    if (!category) return [];
    return Array.from(this.models.values()).filter((model) => model.categoryId === category.id);
  }
  async getTrailerModelsBySeries(seriesId) {
    return Array.from(this.models.values()).filter((model) => model.seriesId === seriesId);
  }
  async getTrailerModel(modelId) {
    return this.models.get(modelId);
  }
  async getTrailerOptions(modelId) {
    return this.options.get(modelId) || [];
  }
  async getOptionsForModel(modelId) {
    const allOptions = Array.from(this.options.values()).flat();
    const nonLengthOptions = allOptions.filter(
      (option) => option.applicableModels.includes(modelId) && option.category !== "length"
    );
    const lengthOptions = [];
    const model = Array.from(this.models.values()).flat().find((m) => m.modelId === modelId);
    if (model && model.lengthOptions) {
      const lengths = typeof model.lengthOptions === "string" ? JSON.parse(model.lengthOptions) : model.lengthOptions;
      const lengthPricing = model.lengthPrice || {};
      const lengthOrderData = model.lengthOrder || {};
      if (Array.isArray(lengths)) {
        const sortedLengths = [...lengths].sort((a, b) => {
          const orderA = lengthOrderData[a] ?? 999;
          const orderB = lengthOrderData[b] ?? 999;
          return orderA - orderB;
        });
        sortedLengths.forEach((length, index) => {
          lengthOptions.push({
            id: `length_${modelId}_${index}`,
            modelId,
            applicableModels: [modelId],
            name: length,
            price: lengthPricing[length] || 0,
            category: "length",
            imageUrl: null,
            isArchived: false,
            hexColor: null,
            primerPrice: 0
          });
        });
      }
    }
    return [...nonLengthOptions, ...lengthOptions];
  }
  async saveUserConfiguration(config) {
    const id = this.currentId++;
    const userConfig = {
      ...config,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      modelId: config.modelId || 0,
      variantId: config.variantId || 0
    };
    this.configurations.set(config.sessionId, userConfig);
    return userConfig;
  }
  async getUserConfiguration(sessionId) {
    return this.configurations.get(sessionId);
  }
  // Admin operations (not implemented in memory storage)
  async createAdminUser(user) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async getAdminUserByUsername(username) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async getAdminUserByEmail(email) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async getAdminUserById(id) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async updateAdminUser(id, updates) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async getAllAdminUsers() {
    throw new Error("Admin operations not supported in memory storage");
  }
  async deactivateAdminUser(id) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async createAdminSession(session) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async getAdminSession(sessionId) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async deleteAdminSession(sessionId) {
    throw new Error("Admin operations not supported in memory storage");
  }
  async deleteExpiredSessions() {
    throw new Error("Admin operations not supported in memory storage");
  }
  // Password reset token operations (not supported in memory storage)
  async createPasswordResetToken(token) {
    throw new Error("Password reset operations not supported in memory storage");
  }
  async getPasswordResetToken(token) {
    throw new Error("Password reset operations not supported in memory storage");
  }
  async markPasswordResetTokenAsUsed(token) {
    throw new Error("Password reset operations not supported in memory storage");
  }
  async deleteExpiredResetTokens() {
    throw new Error("Password reset operations not supported in memory storage");
  }
  // Pricing management operations
  async getAllModels() {
    return Array.from(this.models.values());
  }
  async getAllOptions() {
    return Array.from(this.options.values()).flat();
  }
  async updateModel(id, updates) {
    const model = Array.from(this.models.values()).find((m) => m.id === id);
    if (!model) {
      throw new Error("Model not found");
    }
    const updatedModel = { ...model, ...updates };
    this.models.set(model.id.toString(), updatedModel);
    return updatedModel;
  }
  async updateOption(id, updates) {
    for (const [modelId, options] of Array.from(this.options.entries())) {
      const optionIndex = options.findIndex((o) => o.id === id);
      if (optionIndex !== -1) {
        const updatedOption = { ...options[optionIndex], ...updates };
        options[optionIndex] = updatedOption;
        this.options.set(modelId, options);
        return updatedOption;
      }
    }
    throw new Error("Option not found");
  }
  async createOption(data) {
    const applicableModels = data.applicableModels || (data.modelId ? [data.modelId] : []);
    const modelId = data.modelId || applicableModels[0] || "";
    const newOption = {
      id: this.currentId++,
      modelId,
      // Backward compatibility
      applicableModels,
      name: data.name,
      category: data.category,
      price: data.price,
      isMultiSelect: false,
      hexColor: data.hexColor,
      primerPrice: data.primerPrice
    };
    applicableModels.forEach((model) => {
      const existingOptions = this.options.get(model) || [];
      if (!existingOptions.find((opt) => opt.id === newOption.id)) {
        existingOptions.push(newOption);
        this.options.set(model, existingOptions);
      }
    });
    return newOption;
  }
  async deleteOption(id) {
    for (const [modelId, options] of Array.from(this.options.entries())) {
      const filteredOptions = options.filter((option) => option.id !== id);
      if (filteredOptions.length !== options.length) {
        this.options.set(modelId, filteredOptions);
        return;
      }
    }
    throw new Error("Option not found");
  }
  async archiveOption(id) {
    throw new Error("MemStorage archiveOption not implemented for pricing management");
  }
  async archiveModel(id) {
    throw new Error("MemStorage archiveModel not implemented for pricing management");
  }
  async restoreModel(id) {
    throw new Error("MemStorage restoreModel not implemented for pricing management");
  }
  async archiveCategory(id) {
    throw new Error("MemStorage archiveCategory not implemented for pricing management");
  }
  async restoreCategory(id) {
    throw new Error("MemStorage restoreCategory not implemented for pricing management");
  }
  async getOptionCategories() {
    const allOptions = Array.from(this.options.values()).flat();
    const categories = new Set(allOptions.map((option) => option.category));
    return Array.from(categories);
  }
  // Store Airtable config in memory (for development)
  airtableConfig = null;
  adminSessions = /* @__PURE__ */ new Set();
  async saveAirtableConfig(config) {
    this.airtableConfig = config;
  }
  async getAirtableConfig() {
    return this.airtableConfig;
  }
  isAdminSession(sessionId) {
    return true;
  }
  // Series management operations
  async getAllSeries() {
    return [];
  }
  async createSeries(data) {
    const series = {
      id: this.currentId++,
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    return series;
  }
  async createModel(data) {
    const model = {
      id: this.currentId++,
      categoryId: data.categoryId,
      seriesId: data.seriesId,
      modelId: data.modelSeries,
      name: data.name,
      gvwr: "N/A",
      payload: "N/A",
      deckSize: "N/A",
      axles: "N/A",
      basePrice: data.basePrice || 0,
      imageUrl: data.imageUrl,
      features: data.standardFeatures || [],
      isArchived: false
    };
    this.models.set(model.modelId, model);
    return model;
  }
  async updateSeries(id, updates) {
    return { id, ...updates };
  }
  async deleteSeries(id) {
    return;
  }
  async archiveSeries(id) {
    return { id };
  }
  async restoreSeries(id) {
    return { id };
  }
};
var DatabaseStorage = class {
  async getOptionsForModel(modelId) {
    try {
      const optionsResult = await db.execute(sql`
        SELECT id, name, price, category, model_id, applicable_models, image_url, is_archived, hex_color, primer_price, is_multi_select, is_per_ft, is_default
        FROM trailer_options
        WHERE (is_archived IS NULL OR is_archived = false)
          AND (applicable_models IS NULL OR applicable_models @> ${JSON.stringify([modelId])})
          AND category != 'length'
        ORDER BY category, name
      `);
      const nonLengthOptions = optionsResult.rows.map((option) => ({
        id: option.id,
        modelId: option.model_id,
        applicableModels: option.applicable_models,
        name: option.name,
        price: option.price,
        category: option.category,
        imageUrl: option.image_url,
        isArchived: option.is_archived || false,
        hexColor: option.hex_color,
        primerPrice: option.primer_price,
        isMultiSelect: option.is_multi_select || false,
        isPerFt: option.is_per_ft || false,
        isDefault: option.is_default || false
      }));
      const lengthOptions = [];
      const modelResult = await db.execute(sql`
        SELECT length_options, length_price, length_order
        FROM trailer_models
        WHERE model_id = ${modelId}
          AND (is_archived IS NULL OR is_archived = false)
        LIMIT 1
      `);
      if (modelResult.rows.length > 0) {
        const model = modelResult.rows[0];
        if (model.length_options) {
          const lengths = typeof model.length_options === "string" ? JSON.parse(model.length_options) : model.length_options;
          const lengthPricing = model.length_price ? typeof model.length_price === "string" ? JSON.parse(model.length_price) : model.length_price : {};
          const lengthOrderData = model.length_order ? typeof model.length_order === "string" ? JSON.parse(model.length_order) : model.length_order : {};
          if (Array.isArray(lengths)) {
            const sortedLengths = [...lengths].sort((a, b) => {
              const orderA = lengthOrderData[a] ?? 999;
              const orderB = lengthOrderData[b] ?? 999;
              return orderA - orderB;
            });
            sortedLengths.forEach((length, index) => {
              lengthOptions.push({
                id: `length_${modelId}_${index}`,
                modelId,
                applicableModels: [modelId],
                name: length,
                price: lengthPricing[length] || 0,
                category: "length",
                imageUrl: null,
                isArchived: false,
                hexColor: null,
                primerPrice: 0,
                isMultiSelect: false,
                isDefault: index === 0
              });
            });
          }
        }
      }
      return [...nonLengthOptions, ...lengthOptions];
    } catch (error) {
      console.error("Error fetching options for model:", error);
      throw error;
    }
  }
  async getTrailerCategories() {
    try {
      const result = await db.execute(sql`
        SELECT 
          c.id, c.slug, c.name, c.description, c.image_url,
          COALESCE(c.is_archived, false) as is_archived,
          COALESCE(c.order_index, 0) as order_index,
          COALESCE(MIN(m.base_price), c.starting_price) as starting_price
        FROM trailer_categories c
        LEFT JOIN trailer_models m ON c.id = m.category_id 
          AND (m.is_archived IS NULL OR m.is_archived = false)
        WHERE COALESCE(c.is_archived, false) = false
        GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.starting_price, c.is_archived, c.order_index
        ORDER BY COALESCE(c.order_index, 0), c.id
      `);
      return result.rows.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        startingPrice: cat.starting_price,
        orderIndex: cat.order_index ?? 0,
        isArchived: cat.is_archived
      }));
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  }
  async getAllTrailerCategories() {
    try {
      const result = await db.execute(sql`
        SELECT 
          c.id, c.slug, c.name, c.description, c.image_url,
          COALESCE(c.is_archived, false) as is_archived,
          COALESCE(c.order_index, 0) as order_index,
          COALESCE(MIN(m.base_price), c.starting_price) as starting_price
        FROM trailer_categories c
        LEFT JOIN trailer_models m ON c.id = m.category_id 
          AND (m.is_archived IS NULL OR m.is_archived = false)
        GROUP BY c.id, c.slug, c.name, c.description, c.image_url, c.starting_price, c.is_archived, c.order_index
        ORDER BY COALESCE(c.order_index, 0), c.id
      `);
      return result.rows.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.image_url,
        startingPrice: cat.starting_price,
        orderIndex: cat.order_index ?? 0,
        isArchived: cat.is_archived
      }));
    } catch (error) {
      console.error("Error fetching all categories:", error);
      throw error;
    }
  }
  async getTrailerModelsByCategory(categorySlug) {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.model_id, m.name, 
               m.deck_size, m.axles, m.base_price, m.image_url, m.image_urls, m.model_3d_url, m.features,
               m.length_gvwr, m.length_payload, m.category_order
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        WHERE c.slug = ${categorySlug} AND NOT m.is_archived
        ORDER BY m.id
      `);
      return result.rows.map((model) => ({
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        imageUrls: model.image_urls ? typeof model.image_urls === "string" ? JSON.parse(model.image_urls) : model.image_urls : null,
        model3dUrl: model.model_3d_url,
        features: model.features || [],
        lengthGvwr: model.length_gvwr,
        lengthPayload: model.length_payload,
        categoryOrder: model.category_order ? typeof model.category_order === "string" ? JSON.parse(model.category_order) : model.category_order : null
      }));
    } catch (error) {
      console.error("Error fetching models by category:", error);
      throw error;
    }
  }
  async getTrailerModelsBySeries(seriesId) {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name,
               m.deck_size, m.axles, m.base_price, m.image_url, m.image_urls, m.model_3d_url, m.features,
               m.pulltype_options, m.length_options, m.length_price,
               m.length_gvwr, m.length_payload, m.is_archived, m.category_sub_type, m.category_order,
               c.name as category_name, s.name as series_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.series_id = ${seriesId} AND NOT m.is_archived
        ORDER BY m.name
      `);
      return result.rows.map((model) => {
        let lengthDeckSize = null;
        if (model.deck_size) {
          try {
            lengthDeckSize = typeof model.deck_size === "string" ? JSON.parse(model.deck_size) : model.deck_size;
          } catch (e) {
            console.warn(`Failed to parse deck_size for model ${model.model_id}:`, e);
          }
        }
        return {
          id: model.id,
          categoryId: model.category_id,
          seriesId: model.series_id,
          seriesName: model.series_name,
          modelId: model.model_id,
          name: model.name,
          axles: model.axles,
          basePrice: model.base_price,
          imageUrl: model.image_url,
          imageUrls: model.image_urls ? typeof model.image_urls === "string" ? JSON.parse(model.image_urls) : model.image_urls : null,
          features: model.features || [],
          pulltypeOptions: model.pulltype_options,
          lengthOptions: model.length_options || [],
          lengthPrice: model.length_price,
          lengthGvwr: model.length_gvwr,
          lengthPayload: model.length_payload,
          lengthDeckSize,
          categoryName: model.category_name,
          model3dUrl: model.model_3d_url,
          categorySubType: model.category_sub_type,
          isArchived: model.is_archived || false,
          categoryOrder: model.category_order ? typeof model.category_order === "string" ? JSON.parse(model.category_order) : model.category_order : null
        };
      });
    } catch (error) {
      console.error("Error fetching models by series:", error);
      throw error;
    }
  }
  async getTrailerModel(modelId) {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.model_id, m.name,
               m.deck_size, m.axles, m.base_price, m.image_url, m.image_urls, m.model_3d_url,
               m.features, m.length_payload, m.category_order, m.series_id, s.name as series_name
        FROM trailer_models m
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.model_id = ${modelId}
      `);
      if (result.rows.length === 0) return void 0;
      const model = result.rows[0];
      return {
        id: model.id,
        categoryId: model.category_id,
        seriesId: model.series_id,
        seriesName: model.series_name,
        modelId: model.model_id,
        name: model.name,
        payload: model.payload,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        imageUrls: model.image_urls ? typeof model.image_urls === "string" ? JSON.parse(model.image_urls) : model.image_urls : null,
        model3dUrl: model.model_3d_url,
        features: model.features || [],
        lengthPayload: model.length_payload,
        categoryOrder: model.category_order ? typeof model.category_order === "string" ? JSON.parse(model.category_order) : model.category_order : null
      };
    } catch (error) {
      console.error("Error fetching model:", error);
      throw error;
    }
  }
  async getTrailerOptions(modelId) {
    try {
      const result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_per_ft
        FROM trailer_options
        WHERE model_id = ${modelId}
        ORDER BY category, name
      `);
      return result.rows.map((option) => ({
        id: option.id,
        modelId: option.model_id,
        category: option.category,
        name: option.name,
        price: option.price,
        isMultiSelect: option.is_multi_select || false,
        isPerFt: option.is_per_ft || false
      }));
    } catch (error) {
      console.error("Error fetching options:", error);
      throw error;
    }
  }
  async saveUserConfiguration(config) {
    return {
      id: Date.now(),
      sessionId: config.sessionId,
      categorySlug: config.categorySlug,
      modelId: config.modelId || 0,
      variantId: config.variantId || 0,
      selectedOptions: config.selectedOptions,
      totalPrice: config.totalPrice,
      createdAt: /* @__PURE__ */ new Date()
    };
  }
  async getUserConfiguration(sessionId) {
    return void 0;
  }
  // Admin User Operations
  async createAdminUser(user) {
    try {
      const [newUser] = await db.insert(adminUsers).values(user).returning();
      return newUser;
    } catch (error) {
      console.error("Error creating admin user:", error);
      throw error;
    }
  }
  async getAdminUserByUsername(username) {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
      return user;
    } catch (error) {
      console.error("Error fetching admin user by username:", error);
      throw error;
    }
  }
  async getAdminUserByEmail(email) {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      return user;
    } catch (error) {
      console.error("Error fetching admin user by email:", error);
      throw error;
    }
  }
  async getAdminUserById(id) {
    try {
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching admin user by id:", error);
      throw error;
    }
  }
  async updateAdminUser(id, updates) {
    try {
      const [updatedUser] = await db.update(adminUsers).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(adminUsers.id, id)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating admin user:", error);
      throw error;
    }
  }
  async getAllAdminUsers() {
    try {
      return await db.select().from(adminUsers).orderBy(adminUsers.createdAt);
    } catch (error) {
      console.error("Error fetching all admin users:", error);
      throw error;
    }
  }
  async deactivateAdminUser(id) {
    try {
      await db.update(adminUsers).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(adminUsers.id, id));
    } catch (error) {
      console.error("Error deactivating admin user:", error);
      throw error;
    }
  }
  // Session Operations
  async createAdminSession(session) {
    try {
      const [newSession] = await db.insert(adminSessions).values(session).returning();
      return newSession;
    } catch (error) {
      console.error("Error creating admin session:", error);
      throw error;
    }
  }
  async getAdminSession(sessionId) {
    try {
      const [session] = await db.select().from(adminSessions).where(eq(adminSessions.id, sessionId));
      return session;
    } catch (error) {
      console.error("Error fetching admin session:", error);
      throw error;
    }
  }
  async deleteAdminSession(sessionId) {
    try {
      await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
    } catch (error) {
      console.error("Error deleting admin session:", error);
      throw error;
    }
  }
  async deleteExpiredSessions() {
    try {
      await db.delete(adminSessions).where(sql`expires_at < NOW()`);
    } catch (error) {
      console.error("Error deleting expired sessions:", error);
      throw error;
    }
  }
  // Password Reset Token Operations
  async createPasswordResetToken(token) {
    try {
      const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
      return newToken;
    } catch (error) {
      console.error("Error creating password reset token:", error);
      throw error;
    }
  }
  async getPasswordResetToken(token) {
    try {
      const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return resetToken;
    } catch (error) {
      console.error("Error fetching password reset token:", error);
      throw error;
    }
  }
  async markPasswordResetTokenAsUsed(token) {
    try {
      await db.update(passwordResetTokens).set({ isUsed: true }).where(eq(passwordResetTokens.token, token));
    } catch (error) {
      console.error("Error marking password reset token as used:", error);
      throw error;
    }
  }
  async deleteExpiredResetTokens() {
    try {
      await db.delete(passwordResetTokens).where(sql`expires_at < NOW() OR is_used = true`);
    } catch (error) {
      console.error("Error deleting expired password reset tokens:", error);
      throw error;
    }
  }
  // Pricing management operations
  async getAllModels() {
    try {
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name,
               m.deck_size, m.axles, m.length_options, m.pulltype_options, m.length_price, m.length_gvwr, m.length_payload, m.length_order, m.category_order, m.base_price, 
               m.image_url, m.image_urls, m.model_3d_url, m.features, m.is_archived, m.category_sub_type, c.name as category_name,
               s.name as series_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        LEFT JOIN trailer_series s ON m.series_id = s.id
        ORDER BY c.name, m.id
      `);
      console.log("Raw models result:", result.rows.length);
      return result.rows.map((model) => ({
        id: model.id,
        categoryId: model.category_id,
        seriesId: model.series_id,
        seriesName: model.series_name,
        // Now comes from the JOIN with trailer_series
        modelId: model.model_id,
        name: model.name,
        axles: model.axles,
        lengthOptions: model.length_options ? typeof model.length_options === "string" ? JSON.parse(model.length_options) : model.length_options : null,
        pulltypeOptions: model.pulltype_options ? typeof model.pulltype_options === "string" ? JSON.parse(model.pulltype_options) : model.pulltype_options : null,
        lengthPrice: model.length_price ? typeof model.length_price === "string" ? JSON.parse(model.length_price) : model.length_price : null,
        lengthGvwr: model.length_gvwr ? typeof model.length_gvwr === "string" ? JSON.parse(model.length_gvwr) : model.length_gvwr : null,
        lengthPayload: model.length_payload ? typeof model.length_payload === "string" ? JSON.parse(model.length_payload) : model.length_payload : null,
        lengthDeckSize: model.deck_size ? typeof model.deck_size === "string" ? JSON.parse(model.deck_size) : model.deck_size : null,
        lengthOrder: model.length_order ? typeof model.length_order === "string" ? JSON.parse(model.length_order) : model.length_order : null,
        categoryOrder: model.category_order ? typeof model.category_order === "string" ? JSON.parse(model.category_order) : model.category_order : null,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        imageUrls: model.image_urls ? typeof model.image_urls === "string" ? JSON.parse(model.image_urls) : model.image_urls : null,
        model3dUrl: model.model_3d_url,
        features: model.features || [],
        categoryName: model.category_name,
        categorySubType: model.category_sub_type,
        isArchived: model.is_archived || false
      }));
    } catch (error) {
      console.error("Error fetching all models:", error);
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }
  async getAllSeries() {
    try {
      const result = await db.execute(sql`
        SELECT s.id, s.name, s.category_id, s.slug, s.description, s.base_price, s.image_url,
               COALESCE(s.is_archived, false) as is_archived, c.name as category_name
        FROM trailer_series s
        JOIN trailer_categories c ON s.category_id = c.id
        ORDER BY c.name, s.name
      `);
      return result.rows.map((series) => ({
        id: series.id,
        name: series.name,
        categoryId: series.category_id,
        categoryName: series.category_name,
        slug: series.slug,
        description: series.description,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        isArchived: series.is_archived
      }));
    } catch (error) {
      console.error("Error fetching all series:", error);
      throw error;
    }
  }
  async getAllOptions() {
    try {
      const result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_per_ft, is_archived, image_url, applicable_models, hex_color, primer_price
        FROM trailer_options
        ORDER BY category, name
      `);
      return result.rows.map((option) => ({
        id: option.id,
        modelId: option.model_id,
        applicableModels: option.applicable_models || [option.model_id],
        name: option.name,
        category: option.category,
        price: option.price,
        isRequired: false,
        isMultiSelect: option.is_multi_select || false,
        isPerFt: option.is_per_ft || false,
        isArchived: option.is_archived || false,
        imageUrl: option.image_url,
        options: [],
        hexColor: option.hex_color,
        primerPrice: option.primer_price
      }));
    } catch (error) {
      console.error("Error fetching all options:", error);
      throw error;
    }
  }
  async updateModel(id, updates) {
    try {
      if (updates.basePrice !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET base_price = ${updates.basePrice}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.modelId !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET model_id = ${updates.modelId}
          WHERE id = ${id}
        `);
      }
      if (updates.gvwr !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET gvwr = ${updates.gvwr}
          WHERE id = ${id}
        `);
      }
      if (updates.payload !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET payload = ${updates.payload}
          WHERE id = ${id}
        `);
      }
      if (updates.deckSize !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET deck_size = ${updates.deckSize}
          WHERE id = ${id}
        `);
      }
      if (updates.axles !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET axles = ${updates.axles}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthOptions !== void 0) {
        const lengthOptionsJson = updates.lengthOptions ? JSON.stringify(updates.lengthOptions) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_options = ${lengthOptionsJson}
          WHERE id = ${id}
        `);
      }
      if (updates.pulltypeOptions !== void 0) {
        const pulltypeOptionsJson = updates.pulltypeOptions ? JSON.stringify(updates.pulltypeOptions) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET pulltype_options = ${pulltypeOptionsJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthPrice !== void 0) {
        const lengthPriceJson = updates.lengthPrice ? JSON.stringify(updates.lengthPrice) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_price = ${lengthPriceJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthGvwr !== void 0) {
        const lengthGvwrJson = updates.lengthGvwr ? JSON.stringify(updates.lengthGvwr) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_gvwr = ${lengthGvwrJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthPayload !== void 0) {
        const lengthPayloadJson = updates.lengthPayload ? JSON.stringify(updates.lengthPayload) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_payload = ${lengthPayloadJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthDeckSize !== void 0) {
        const lengthDeckSizeJson = updates.lengthDeckSize ? JSON.stringify(updates.lengthDeckSize) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET deck_size = ${lengthDeckSizeJson}
          WHERE id = ${id}
        `);
      }
      if (updates.lengthOrder !== void 0) {
        const lengthOrderJson = updates.lengthOrder ? JSON.stringify(updates.lengthOrder) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET length_order = ${lengthOrderJson}
          WHERE id = ${id}
        `);
      }
      if (updates.categoryOrder !== void 0) {
        const categoryOrderJson = updates.categoryOrder ? JSON.stringify(updates.categoryOrder) : null;
        await db.execute(sql`
          UPDATE trailer_models 
          SET category_order = ${categoryOrderJson}
          WHERE id = ${id}
        `);
      }
      if (updates.categoryId !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET category_id = ${updates.categoryId}
          WHERE id = ${id}
        `);
      }
      if (updates.categorySubType !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET category_sub_type = ${updates.categorySubType}
          WHERE id = ${id}
        `);
      }
      if (updates.seriesId !== void 0) {
        console.log(`\u{1F504} Attempting to update series_id to ${updates.seriesId} for model ${id}`);
        const updateResult = await db.execute(sql`
          UPDATE trailer_models 
          SET series_id = ${updates.seriesId}
          WHERE id = ${id}
        `);
        console.log(`\u2705 Series_id update result:`, updateResult);
      }
      if (updates.isArchived !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET is_archived = ${updates.isArchived}
          WHERE id = ${id}
        `);
      }
      if (updates.imageUrl !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET image_url = ${updates.imageUrl}
          WHERE id = ${id}
        `);
      }
      if (updates.model3dUrl !== void 0) {
        await db.execute(sql`
          UPDATE trailer_models 
          SET model_3d_url = ${updates.model3dUrl}
          WHERE id = ${id}
        `);
      }
      const result = await db.execute(sql`
        SELECT m.id, m.category_id, m.series_id, m.model_id, m.name,
               m.deck_size, m.axles, m.length_options, m.pulltype_options, m.length_price, m.length_gvwr, m.length_payload, m.base_price, 
               m.image_url, m.model_3d_url, m.features, m.is_archived, m.category_sub_type, s.name as series_name
        FROM trailer_models m
        LEFT JOIN trailer_series s ON m.series_id = s.id
        WHERE m.id = ${id}
      `);
      const updatedModel = result.rows[0];
      cache.clear();
      console.log(`\u{1F5D1}\uFE0F Cache cleared - dynamic pricing updated`);
      return {
        id: updatedModel.id,
        categoryId: updatedModel.category_id,
        seriesId: updatedModel.series_id,
        seriesName: updatedModel.series_name,
        // From the JOIN with trailer_series
        modelId: updatedModel.model_id,
        name: updatedModel.name,
        gvwr: updatedModel.gvwr,
        payload: updatedModel.payload,
        deckSize: updatedModel.deck_size,
        axles: updatedModel.axles,
        lengthOptions: updatedModel.length_options ? typeof updatedModel.length_options === "string" ? JSON.parse(updatedModel.length_options) : updatedModel.length_options : null,
        lengthPrice: updatedModel.length_price ? typeof updatedModel.length_price === "string" ? JSON.parse(updatedModel.length_price) : updatedModel.length_price : null,
        lengthGvwr: updatedModel.length_gvwr ? typeof updatedModel.length_gvwr === "string" ? JSON.parse(updatedModel.length_gvwr) : updatedModel.length_gvwr : null,
        lengthPayload: updatedModel.length_payload ? typeof updatedModel.length_payload === "string" ? JSON.parse(updatedModel.length_payload) : updatedModel.length_payload : null,
        lengthDeckSize: updatedModel.deck_size ? typeof updatedModel.deck_size === "string" ? JSON.parse(updatedModel.deck_size) : updatedModel.deck_size : null,
        pulltypeOptions: updatedModel.pulltype_options ? typeof updatedModel.pulltype_options === "string" ? JSON.parse(updatedModel.pulltype_options) : updatedModel.pulltype_options : null,
        basePrice: updatedModel.base_price,
        imageUrl: updatedModel.image_url,
        imageUrls: updatedModel.image_urls ? typeof updatedModel.image_urls === "string" ? JSON.parse(updatedModel.image_urls) : updatedModel.image_urls : null,
        model3dUrl: updatedModel.model_3d_url,
        features: updatedModel.features || [],
        categorySubType: updatedModel.category_sub_type,
        isArchived: updatedModel.is_archived || false
      };
    } catch (error) {
      console.error("Error updating model:", error);
      throw error;
    }
  }
  async addModelImage(id, url) {
    try {
      const current = await db.execute(sql`SELECT image_urls, image_url FROM trailer_models WHERE id = ${id}`);
      if (current.rows.length === 0) throw new Error("Model not found");
      const row = current.rows[0];
      const existing = row.image_urls ? typeof row.image_urls === "string" ? JSON.parse(row.image_urls) : row.image_urls : row.image_url ? [row.image_url] : [];
      const newUrls = existing.includes(url) ? existing : [...existing, url];
      const newUrlsJson = JSON.stringify(newUrls);
      const primary = newUrls[0] || null;
      await db.execute(sql`UPDATE trailer_models SET image_urls = ${newUrlsJson}::jsonb, image_url = ${primary} WHERE id = ${id}`);
      cache.clear();
      const result = await db.execute(sql`SELECT m.*, s.name as series_name FROM trailer_models m LEFT JOIN trailer_series s ON m.series_id = s.id WHERE m.id = ${id}`);
      const m = result.rows[0];
      return { id: m.id, categoryId: m.category_id, seriesId: m.series_id, seriesName: m.series_name, modelId: m.model_id, name: m.name, basePrice: m.base_price, imageUrl: m.image_url, imageUrls: newUrls, model3dUrl: m.model_3d_url, features: m.features || [], isArchived: m.is_archived || false };
    } catch (error) {
      console.error("Error adding model image:", error);
      throw error;
    }
  }
  async removeModelImage(id, url) {
    try {
      const current = await db.execute(sql`SELECT image_urls, image_url FROM trailer_models WHERE id = ${id}`);
      if (current.rows.length === 0) throw new Error("Model not found");
      const row = current.rows[0];
      const existing = row.image_urls ? typeof row.image_urls === "string" ? JSON.parse(row.image_urls) : row.image_urls : row.image_url ? [row.image_url] : [];
      const newUrls = existing.filter((u) => u !== url);
      const newUrlsJson = newUrls.length > 0 ? JSON.stringify(newUrls) : null;
      const primary = newUrls[0] || null;
      await db.execute(sql`UPDATE trailer_models SET image_urls = ${newUrlsJson}::jsonb, image_url = ${primary} WHERE id = ${id}`);
      cache.clear();
      const result = await db.execute(sql`SELECT m.*, s.name as series_name FROM trailer_models m LEFT JOIN trailer_series s ON m.series_id = s.id WHERE m.id = ${id}`);
      const m = result.rows[0];
      return { id: m.id, categoryId: m.category_id, seriesId: m.series_id, seriesName: m.series_name, modelId: m.model_id, name: m.name, basePrice: m.base_price, imageUrl: m.image_url, imageUrls: newUrls, model3dUrl: m.model_3d_url, features: m.features || [], isArchived: m.is_archived || false };
    } catch (error) {
      console.error("Error removing model image:", error);
      throw error;
    }
  }
  async reorderModelImages(id, urls) {
    try {
      const newUrlsJson = urls.length > 0 ? JSON.stringify(urls) : null;
      const primary = urls[0] || null;
      await db.execute(sql`UPDATE trailer_models SET image_urls = ${newUrlsJson}::jsonb, image_url = ${primary} WHERE id = ${id}`);
      cache.clear();
      const result = await db.execute(sql`SELECT m.*, s.name as series_name FROM trailer_models m LEFT JOIN trailer_series s ON m.series_id = s.id WHERE m.id = ${id}`);
      const m = result.rows[0];
      return { id: m.id, categoryId: m.category_id, seriesId: m.series_id, seriesName: m.series_name, modelId: m.model_id, name: m.name, basePrice: m.base_price, imageUrl: m.image_url, imageUrls: urls, model3dUrl: m.model_3d_url, features: m.features || [], isArchived: m.is_archived || false };
    } catch (error) {
      console.error("Error reordering model images:", error);
      throw error;
    }
  }
  async updateOption(id, updates) {
    try {
      let result;
      const updateData = {};
      if (updates.price !== void 0) updateData.price = updates.price;
      if (updates.name !== void 0) updateData.name = updates.name;
      if (updates.category !== void 0) updateData.category = updates.category;
      if (updates.modelId !== void 0) updateData.model_id = updates.modelId;
      if (updates.applicableModels !== void 0) updateData.applicable_models = updates.applicableModels;
      if (updates.isArchived !== void 0) updateData.is_archived = updates.isArchived;
      if (updates.isMultiSelect !== void 0) updateData.is_multi_select = updates.isMultiSelect;
      if (updates.imageUrl !== void 0) updateData.image_url = updates.imageUrl;
      if (Object.keys(updateData).length > 0) {
        if (updates.price !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET price = ${updates.price}
            WHERE id = ${id}
          `);
        }
        if (updates.name !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET name = ${updates.name}
            WHERE id = ${id}
          `);
        }
        if (updates.category !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET category = ${updates.category}
            WHERE id = ${id}
          `);
        }
        if (updates.modelId !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET model_id = ${updates.modelId}
            WHERE id = ${id}
          `);
        }
        if (updates.isArchived !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET is_archived = ${updates.isArchived}
            WHERE id = ${id}
          `);
        }
        if (updates.isMultiSelect !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET is_multi_select = ${updates.isMultiSelect}
            WHERE id = ${id}
          `);
        }
        if (updates.imageUrl !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET image_url = ${updates.imageUrl}
            WHERE id = ${id}
          `);
        }
        if (updates.applicableModels !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET applicable_models = ${JSON.stringify(updates.applicableModels)}
            WHERE id = ${id}
          `);
        }
        if (updates.hexColor !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET hex_color = ${updates.hexColor}
            WHERE id = ${id}
          `);
        }
        if (updates.primerPrice !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET primer_price = ${updates.primerPrice}
            WHERE id = ${id}
          `);
        }
        if (updates.isPerFt !== void 0) {
          await db.execute(sql`
            UPDATE trailer_options 
            SET is_per_ft = ${updates.isPerFt}
            WHERE id = ${id}
          `);
        }
      }
      result = await db.execute(sql`
        SELECT id, model_id, category, name, price, is_multi_select, is_per_ft, is_archived, image_url, applicable_models, hex_color, primer_price
        FROM trailer_options WHERE id = ${id}
      `);
      const updatedOption = result.rows[0];
      return {
        id: updatedOption.id,
        modelId: updatedOption.model_id,
        applicableModels: updatedOption.applicable_models || [],
        name: updatedOption.name,
        category: updatedOption.category,
        price: updatedOption.price,
        isMultiSelect: updatedOption.is_multi_select || false,
        isPerFt: updatedOption.is_per_ft || false,
        isArchived: updatedOption.is_archived || false,
        imageUrl: updatedOption.image_url,
        hexColor: updatedOption.hex_color,
        primerPrice: updatedOption.primer_price
      };
    } catch (error) {
      console.error("Error updating option:", error);
      throw error;
    }
  }
  async createOption(data) {
    try {
      const applicableModels = data.applicableModels || (data.modelId ? [data.modelId] : []);
      const modelId = data.modelId || applicableModels[0] || "";
      const result = await db.execute(sql`
        INSERT INTO trailer_options (model_id, name, category, price, is_multi_select, is_per_ft, applicable_models, hex_color, primer_price, image_url)
        VALUES (${modelId}, ${data.name}, ${data.category}, ${data.price}, ${data.isMultiSelect || false}, ${data.isPerFt || false}, ${JSON.stringify(applicableModels)}, ${data.hexColor || null}, ${data.primerPrice || null}, ${data.imageUrl || null})
        RETURNING id, model_id, name, category, price, is_multi_select, is_per_ft, applicable_models, hex_color, primer_price, image_url
      `);
      const newOption = result.rows[0];
      return {
        id: newOption.id,
        modelId: newOption.model_id,
        applicableModels: newOption.applicable_models || [],
        name: newOption.name,
        category: newOption.category,
        price: newOption.price,
        isRequired: false,
        isMultiSelect: newOption.is_multi_select || false,
        isPerFt: newOption.is_per_ft || false,
        options: [],
        hexColor: newOption.hex_color,
        primerPrice: newOption.primer_price,
        imageUrl: newOption.image_url
      };
    } catch (error) {
      console.error("Error creating option:", error);
      throw error;
    }
  }
  async deleteOption(id) {
    try {
      await db.execute(sql`
        DELETE FROM trailer_options WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error deleting option:", error);
      throw error;
    }
  }
  async archiveOption(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_options 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error archiving option:", error);
      throw error;
    }
  }
  async restoreOption(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_options 
        SET is_archived = false
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error restoring option:", error);
      throw error;
    }
  }
  async archiveModel(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_models 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error archiving model:", error);
      throw error;
    }
  }
  async restoreModel(modelId) {
    try {
      await db.execute(sql`
        UPDATE trailer_models 
        SET is_archived = false 
        WHERE id = ${modelId}
      `);
      const result = await db.execute(sql`
        SELECT m.*, c.name as category_name
        FROM trailer_models m
        JOIN trailer_categories c ON m.category_id = c.id
        WHERE m.id = ${modelId}
      `);
      const model = result.rows[0];
      return {
        id: model.id,
        categoryId: model.category_id,
        modelId: model.model_id,
        name: model.name,
        payload: model.payload,
        deckSize: model.deck_size,
        axles: model.axles,
        basePrice: model.base_price,
        imageUrl: model.image_url,
        model3dUrl: model.model_3d_url,
        features: model.features || [],
        categoryName: model.category_name,
        isArchived: false
      };
    } catch (error) {
      console.error("Error restoring model:", error);
      throw error;
    }
  }
  async archiveCategory(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_categories 
        SET is_archived = true
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error archiving category:", error);
      throw error;
    }
  }
  async restoreCategory(categoryId) {
    try {
      await db.execute(sql`
        UPDATE trailer_categories 
        SET is_archived = false 
        WHERE id = ${categoryId}
      `);
      const result = await db.execute(sql`
        SELECT * FROM trailer_categories
        WHERE id = ${categoryId}
      `);
      const category = result.rows[0];
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.image_url,
        startingPrice: category.starting_price,
        orderIndex: category.order_index,
        isArchived: false
      };
    } catch (error) {
      console.error("Error restoring category:", error);
      throw error;
    }
  }
  async getOptionCategories() {
    try {
      const result = await db.execute(sql`
        SELECT "Name" FROM trailer_option_categories 
        WHERE "Name" IS NOT NULL 
        ORDER BY "Name"
      `);
      return result.rows.map((row) => row.Name);
    } catch (error) {
      console.error("Error fetching option categories:", error);
      throw error;
    }
  }
  // Airtable configuration methods (stored in memory for now)
  airtableConfig = null;
  async saveAirtableConfig(config) {
    this.airtableConfig = config;
  }
  async getAirtableConfig() {
    return this.airtableConfig;
  }
  isAdminSession(sessionId) {
    return !!sessionId;
  }
  // Series management operations - this is the correct getAllSeries implementation
  async getSeriesByCategory(categorySlug) {
    try {
      const result = await db.execute(sql`
        SELECT s.id, s.category_id, s.name, s.description, s.slug, s.base_price,
               s.image_url, COALESCE(s.is_archived, false) as is_archived,
               s.created_at, s.updated_at, c.name as category_name
        FROM trailer_series s
        JOIN trailer_categories c ON s.category_id = c.id
        WHERE c.slug = ${categorySlug} AND COALESCE(s.is_archived, false) = false
        ORDER BY s.name
      `);
      return result.rows.map((series) => ({
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      }));
    } catch (error) {
      console.error("Error fetching series by category:", error);
      throw error;
    }
  }
  async createSeries(data) {
    try {
      const result = await db.execute(sql`
        INSERT INTO trailer_series (category_id, name, description, slug, base_price, image_url)
        VALUES (${data.categoryId}, ${data.name}, ${data.description}, ${data.slug}, ${data.basePrice}, ${data.imageUrl || null})
        RETURNING id, category_id, name, description, slug, base_price, image_url, created_at, updated_at
      `);
      const series = result.rows[0];
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        imageUrl: series.image_url,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error("Error creating series:", error);
      throw error;
    }
  }
  async createModel(data) {
    try {
      const result = await db.execute(sql`
        INSERT INTO trailer_models (category_id, series_id, model_id, name, base_price, image_url, features, axles, length_options, pulltype_options, length_payload, length_gvwr, deck_size)
        VALUES (${data.categoryId}, ${data.seriesId || null}, ${data.modelSeries}, ${data.name}, ${data.basePrice || 0}, ${data.imageUrl}, ${JSON.stringify(data.standardFeatures)}, ${data.axles || null}, ${data.lengthOptions ? JSON.stringify(data.lengthOptions) : null}, ${data.pulltypeOptions ? JSON.stringify(data.pulltypeOptions) : null}, ${data.lengthPayload ? JSON.stringify(data.lengthPayload) : null}, ${data.lengthGvwr ? JSON.stringify(data.lengthGvwr) : null}, ${data.lengthDeckSize ? JSON.stringify(data.lengthDeckSize) : null})
        RETURNING id, category_id, series_id, model_id, name, base_price, image_url, features, axles, length_options, pulltype_options, length_payload, length_gvwr, deck_size
      `);
      const model = result.rows[0];
      const categoryResult = await db.execute(sql`
        SELECT name FROM trailer_categories WHERE id = ${model.category_id}
      `);
      const categoryName = categoryResult.rows[0]?.name || "Unknown Category";
      let seriesName = "No Series";
      if (model.series_id) {
        const seriesResult = await db.execute(sql`
          SELECT name FROM trailer_series WHERE id = ${model.series_id}
        `);
        seriesName = seriesResult.rows[0]?.name || "Unknown Series";
      }
      return {
        id: model.id,
        categoryId: model.category_id,
        categoryName,
        seriesName,
        modelId: model.model_id,
        name: model.name,
        axles: model.axles,
        lengthOptions: model.length_options ? typeof model.length_options === "string" ? JSON.parse(model.length_options) : model.length_options : null,
        pulltypeOptions: model.pulltype_options ? typeof model.pulltype_options === "string" ? JSON.parse(model.pulltype_options) : model.pulltype_options : null,
        lengthPrice: model.length_price ? typeof model.length_price === "string" ? JSON.parse(model.length_price) : model.length_price : null,
        lengthPayload: model.length_payload ? typeof model.length_payload === "string" ? JSON.parse(model.length_payload) : model.length_payload : null,
        lengthGvwr: model.length_gvwr ? typeof model.length_gvwr === "string" ? JSON.parse(model.length_gvwr) : model.length_gvwr : null,
        lengthDeckSize: model.deck_size ? typeof model.deck_size === "string" ? JSON.parse(model.deck_size) : model.deck_size : null,
        imageUrl: model.image_url,
        features: JSON.parse(model.features),
        basePrice: model.base_price || 0,
        isArchived: false
      };
    } catch (error) {
      console.error("Error creating model:", error);
      throw error;
    }
  }
  async updateSeries(id, updates) {
    try {
      if (updates.categoryId !== void 0) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET category_id = ${updates.categoryId}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== void 0) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.description !== void 0) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET description = ${updates.description}
          WHERE id = ${id}
        `);
      }
      if (updates.slug !== void 0) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET slug = ${updates.slug}
          WHERE id = ${id}
        `);
      }
      if (updates.basePrice !== void 0) {
        await db.execute(sql`
          UPDATE trailer_series 
          SET base_price = ${updates.basePrice}
          WHERE id = ${id}
        `);
      }
      const result = await db.execute(sql`
        SELECT id, category_id, name, description, slug, base_price, created_at, updated_at
        FROM trailer_series WHERE id = ${id}
      `);
      const series = result.rows[0];
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error("Error updating series:", error);
      throw error;
    }
  }
  async deleteSeries(id) {
    try {
      const modelsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM trailer_models 
        WHERE series_id = ${id} AND NOT is_archived
      `);
      const modelsCount = modelsResult.rows[0].count;
      if (modelsCount > 0) {
        throw new Error("Cannot delete series with existing active models. Archive all models first.");
      }
      await db.execute(sql`
        UPDATE trailer_models 
        SET series_id = NULL 
        WHERE series_id = ${id} AND is_archived = true
      `);
      await db.execute(sql`
        DELETE FROM trailer_series 
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error deleting series:", error);
      throw error;
    }
  }
  async archiveSeries(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_series 
        SET is_archived = true
        WHERE id = ${id}
      `);
      const result = await db.execute(sql`
        SELECT s.*, c.name as category_name
        FROM trailer_series s
        LEFT JOIN trailer_categories c ON s.category_id = c.id
        WHERE s.id = ${id}
      `);
      const series = result.rows[0];
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error("Error archiving series:", error);
      throw error;
    }
  }
  async restoreSeries(id) {
    try {
      await db.execute(sql`
        UPDATE trailer_series 
        SET is_archived = false
        WHERE id = ${id}
      `);
      const result = await db.execute(sql`
        SELECT s.*, c.name as category_name
        FROM trailer_series s
        LEFT JOIN trailer_categories c ON s.category_id = c.id
        WHERE s.id = ${id}
      `);
      const series = result.rows[0];
      return {
        id: series.id,
        categoryId: series.category_id,
        name: series.name,
        description: series.description,
        slug: series.slug,
        basePrice: series.base_price,
        categoryName: series.category_name,
        isArchived: series.is_archived,
        createdAt: series.created_at,
        updatedAt: series.updated_at
      };
    } catch (error) {
      console.error("Error restoring series:", error);
      throw error;
    }
  }
  // Category management operations
  async updateCategory(id, updates) {
    try {
      if (updates.slug !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET slug = ${updates.slug}
          WHERE id = ${id}
        `);
      }
      if (updates.name !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET name = ${updates.name}
          WHERE id = ${id}
        `);
      }
      if (updates.description !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET description = ${updates.description}
          WHERE id = ${id}
        `);
      }
      if (updates.imageUrl !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET image_url = ${updates.imageUrl}
          WHERE id = ${id}
        `);
      }
      if (updates.startingPrice !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET starting_price = ${updates.startingPrice}
          WHERE id = ${id}
        `);
      }
      if (updates.orderIndex !== void 0) {
        await db.execute(sql`
          UPDATE trailer_categories 
          SET order_index = ${updates.orderIndex}
          WHERE id = ${id}
        `);
      }
      const result = await db.execute(sql`
        SELECT id, slug, name, description, image_url, starting_price
        FROM trailer_categories WHERE id = ${id}
      `);
      const category = result.rows[0];
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        imageUrl: category.image_url,
        startingPrice: category.starting_price
      };
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }
};
var storageInstance = null;
function getStorage() {
  if (!storageInstance) {
    if (isDatabaseAvailable && process.env.DATABASE_URL) {
      console.log("Using database storage");
      storageInstance = new DatabaseStorage();
    } else if (process.env.NODE_ENV === "production") {
      console.log("Using no-database storage for production");
      storageInstance = new NoDatabaseStorage();
    } else {
      console.log("Using in-memory storage for development");
      storageInstance = new MemStorage();
    }
  }
  return storageInstance;
}
var storage = getStorage();

// server/routes.ts
import { sql as sql2, eq as eq2, inArray } from "drizzle-orm";

// server/auth.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}
async function authenticateUser(username, password) {
  try {
    const user = await storage.getAdminUserByUsername(username);
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }
    if (!user.isActive) {
      return { success: false, error: "Account is deactivated" };
    }
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: "Invalid username or password" };
    }
    await storage.updateAdminUser(user.id, { lastLogin: /* @__PURE__ */ new Date() });
    return { success: true, user };
  } catch (error) {
    console.error("Error authenticating user:", error);
    return { success: false, error: "Authentication failed" };
  }
}
async function createSession(userId) {
  try {
    const sessionId = generateSessionId();
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const session = await storage.createAdminSession({
      id: sessionId,
      userId,
      expiresAt
    });
    return {
      success: true,
      sessionId: session.id,
      expiresAt: session.expiresAt
    };
  } catch (error) {
    console.error("Error creating session:", error);
    return { success: false, error: "Failed to create session" };
  }
}
async function validateSession(sessionId) {
  try {
    const session = await storage.getAdminSession(sessionId);
    if (!session) {
      return { success: false, error: "Invalid session" };
    }
    if (/* @__PURE__ */ new Date() > session.expiresAt) {
      await storage.deleteAdminSession(sessionId);
      return { success: false, error: "Session expired" };
    }
    const sessionUser = await storage.getAdminUserById(session.userId);
    if (!sessionUser || !sessionUser.isActive) {
      return { success: false, error: "User not found or inactive" };
    }
    return { success: true, user: sessionUser };
  } catch (error) {
    console.error("Error validating session:", error);
    return { success: false, error: "Session validation failed" };
  }
}
async function logout(sessionId) {
  try {
    await storage.deleteAdminSession(sessionId);
  } catch (error) {
    console.error("Error during logout:", error);
  }
}
function isAdmin(user) {
  return user.role === "admin";
}

// server/routes.ts
init_email_service();
import { z } from "zod";
import crypto3 from "crypto";
import bcrypt2 from "bcryptjs";

// server/objectStorage.ts
import { put, head, del, list } from "@vercel/blob";
import { randomUUID } from "crypto";
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
function dbPathToBlobPath(objectPath) {
  if (!objectPath.startsWith("/objects/")) {
    throw new ObjectNotFoundError();
  }
  return objectPath.slice("/objects/".length);
}
function blobUrlToDbPath(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith(".public.blob.vercel-storage.com") || u.hostname.endsWith(".blob.vercel-storage.com")) {
      const pathname = u.pathname.replace(/^\//, "");
      return `/objects/${pathname}`;
    }
  } catch {
  }
  return null;
}
var ObjectStorageService = class {
  constructor() {
  }
  // Legacy API — kept so existing callers that call these getters still work.
  // PUBLIC_OBJECT_SEARCH_PATHS / PRIVATE_OBJECT_DIR are no longer used at runtime
  // but we don't throw if unset; tests and admin-seed paths may reference them.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    return pathsStr.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
  }
  getPrivateObjectDir() {
    return process.env.PRIVATE_OBJECT_DIR || "";
  }
  // Search for a public object by pathname. Returns null if not found.
  async searchPublicObject(filePath) {
    const cleaned = filePath.replace(/^\/+/, "");
    try {
      const meta = await head(cleaned);
      return blobMetaToObject(cleaned, meta);
    } catch {
      return null;
    }
  }
  // Stream/redirect the blob to the response. With public Blob URLs we just
  // 302-redirect — the CDN serves the file directly, fastest path.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    res.set({
      "Cache-Control": `public, max-age=${cacheTtlSec}`
    });
    res.redirect(302, file.url);
  }
  // Returns a URL the client can PUT a file to. Our /api/blob-upload/:id route
  // handler in routes.ts streams the body into Vercel Blob server-side.
  async getObjectEntityUploadURL() {
    const objectId = randomUUID();
    const baseUrl = process.env.BASE_URL || "";
    const path2 = `/api/blob-upload/${encodeURIComponent(`models/${objectId}`)}`;
    return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path2}` : path2;
  }
  // Resolves "/objects/<pathname>" to a BlobObject by hitting head().
  async getObjectEntityFile(objectPath) {
    const pathname = dbPathToBlobPath(objectPath);
    try {
      const meta = await head(pathname);
      return blobMetaToObject(pathname, meta);
    } catch {
      throw new ObjectNotFoundError();
    }
  }
  // Normalize whatever the client just uploaded (a full Vercel Blob URL or
  // sometimes just a path) into the canonical "/objects/<pathname>" form that
  // the DB stores.
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith("/objects/")) return rawPath;
    const fromBlobUrl = blobUrlToDbPath(rawPath);
    if (fromBlobUrl) return fromBlobUrl;
    return rawPath;
  }
  // Sets ACL — Vercel Blob has no per-object ACL on public stores. Normalizing
  // the path is the only useful work here, so this just delegates.
  async trySetObjectEntityAclPolicy(rawPath, _aclPolicy) {
    return this.normalizeObjectEntityPath(rawPath);
  }
  // Public-access blobs are readable by anyone; we don't gate reads at this
  // layer. Write/delete is only triggered by authed admin endpoints upstream.
  async canAccessObjectEntity(_args) {
    return true;
  }
};
async function uploadBlob(pathname, body, contentType) {
  const result = await put(pathname, body, {
    access: "public",
    allowOverwrite: true,
    contentType
  });
  return {
    pathname: result.pathname,
    url: result.url,
    contentType: result.contentType
  };
}
function blobMetaToObject(pathname, meta) {
  return {
    pathname,
    url: meta.url,
    contentType: meta.contentType,
    size: meta.size
  };
}

// server/routes.ts
var requireAuth = async (req, res, next) => {
  const sessionId = req.get("authorization")?.replace("Bearer ", "");
  if (!sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const authResult = await validateSession(sessionId);
  if (!authResult.success) {
    return res.status(401).json({ error: authResult.error });
  }
  req.user = authResult.user;
  req.sessionId = sessionId;
  next();
};
var requireAdmin = (req, res, next) => {
  if (!req.user || !isAdmin(req.user)) {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
};
var requireDealerAuth = async (req, res, next) => {
  const authHeader = req.get("authorization");
  const sessionId = authHeader?.replace("Bearer ", "");
  if (!sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const [dealerSession] = await db.select().from(dealerSessions).where(eq2(dealerSessions.id, sessionId));
    if (dealerSession && dealerSession.expiresAt >= /* @__PURE__ */ new Date()) {
      const [dealer2] = await db.select().from(dealers).where(eq2(dealers.id, dealerSession.dealerId));
      if (!dealer2 || !dealer2.isActive) {
        return res.status(401).json({ error: "Dealer account not active" });
      }
      req.dealer = dealer2;
      req.sessionId = sessionId;
      return next();
    }
    const [userSession] = await db.select().from(dealerUserSessions).where(eq2(dealerUserSessions.id, sessionId));
    if (!userSession || userSession.expiresAt < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const [dealerUser] = await db.select().from(dealerUsers).where(eq2(dealerUsers.id, userSession.userId));
    if (!dealerUser || !dealerUser.isActive) {
      return res.status(401).json({ error: "User account not active" });
    }
    const [dealer] = await db.select().from(dealers).where(eq2(dealers.id, userSession.dealerId));
    if (!dealer || !dealer.isActive) {
      return res.status(401).json({ error: "Dealer account not active" });
    }
    req.dealer = dealer;
    req.dealerUser = dealerUser;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};
var loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});
var createUserSchema = insertAdminUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters")
}).omit({ passwordHash: true });
var generateOrderNumber = () => {
  const timestamp2 = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WT-${timestamp2}-${random}`;
};
async function registerRoutes(app2) {
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getTrailerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in /api/categories:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to fetch categories",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.post("/api/categories", requireAuth, async (req, res) => {
    try {
      console.log("POST /api/categories req.body:", JSON.stringify(req.body));
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes("storage.googleapis.com")) {
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
  app2.patch("/api/categories/reorder", requireAuth, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute(sql2`
          UPDATE trailer_categories SET order_index = ${i + 1} WHERE id = ${orderedIds[i]}
        `);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });
  app2.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { slug, name, description, imageUrl, startingPrice, orderIndex } = req.body;
      console.log(`\u{1F50D} UPDATE REQUEST - Category ID: ${categoryId}`);
      console.log(`\u{1F4E8} Request Body:`, JSON.stringify(req.body, null, 2));
      const updateData = {};
      if (slug !== void 0) updateData.slug = slug;
      if (name !== void 0) updateData.name = name;
      if (description !== void 0) updateData.description = description;
      if (imageUrl !== void 0) updateData.imageUrl = imageUrl;
      if (startingPrice !== void 0) updateData.startingPrice = startingPrice;
      if (orderIndex !== void 0) updateData.orderIndex = orderIndex;
      console.log(`\u{1F4DD} Update Data:`, JSON.stringify(updateData, null, 2));
      const result = await storage.updateCategory(categoryId, updateData);
      console.log(`\u2705 Update Result:`, JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error) {
      console.error("\u274C Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });
  app2.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const modelsResult = await db.execute(sql2`
        SELECT COUNT(*) as count 
        FROM trailer_models 
        WHERE category_id = ${categoryId} AND NOT is_archived
      `);
      const modelsCount = modelsResult.rows[0].count;
      if (modelsCount > 0) {
        return res.status(400).json({ message: "Cannot delete category with existing active models. Archive all models first." });
      }
      const result = await db.execute(sql2`
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
  app2.get("/api/series/all", async (req, res) => {
    try {
      const series = await storage.getAllSeries();
      res.json(series);
    } catch (error) {
      console.error("Error in /api/series/all:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });
  app2.get("/api/categories/:slug/series", async (req, res) => {
    try {
      const { slug } = req.params;
      const series = await storage.getSeriesByCategory(slug);
      res.json(series);
    } catch (error) {
      console.error("Error fetching series by category:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });
  app2.post("/api/series", requireAuth, async (req, res) => {
    try {
      const { categoryId, name, description, slug, basePrice, imageUrl } = req.body;
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes("storage.googleapis.com")) {
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
        imageUrl: normalizedImageUrl
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating series:", error);
      if (error?.code === "23505") {
        const detail = error?.detail || "";
        if (detail.includes("slug")) {
          return res.status(409).json({ message: `A series with that slug already exists. Please use a unique slug.` });
        }
        return res.status(409).json({ message: `A duplicate entry was found: ${detail}` });
      }
      res.status(500).json({ message: "Failed to create series" });
    }
  });
  app2.patch("/api/series/:id", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const { categoryId, name, description, slug, basePrice } = req.body;
      const updateData = {};
      if (categoryId !== void 0) updateData.categoryId = categoryId;
      if (name !== void 0) updateData.name = name;
      if (description !== void 0) updateData.description = description;
      if (slug !== void 0) updateData.slug = slug;
      if (basePrice !== void 0) updateData.basePrice = basePrice;
      const result = await storage.updateSeries(seriesId, updateData);
      res.json(result);
    } catch (error) {
      console.error("Error updating series:", error);
      res.status(500).json({ message: "Failed to update series" });
    }
  });
  app2.delete("/api/series/:id", requireAuth, async (req, res) => {
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
  app2.patch("/api/series/:id/archive", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const archivedSeries = await storage.archiveSeries(seriesId);
      res.json(archivedSeries);
    } catch (error) {
      console.error("Error archiving series:", error);
      res.status(500).json({ error: "Failed to archive series" });
    }
  });
  app2.patch("/api/series/:id/restore", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const restoredSeries = await storage.restoreSeries(seriesId);
      res.json(restoredSeries);
    } catch (error) {
      console.error("Error restoring series:", error);
      res.status(500).json({ error: "Failed to restore series" });
    }
  });
  app2.post("/api/models", requireAuth, async (req, res) => {
    try {
      const { categoryId, seriesId, modelSeries, name, basePrice, imageUrl, standardFeatures, gvwr, payload, deckSize, axles, lengthOptions, pulltypeOptions } = req.body;
      let normalizedImageUrl = imageUrl || "/objects/models/default-model.png";
      if (normalizedImageUrl && normalizedImageUrl.includes("storage.googleapis.com")) {
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
        pulltypeOptions
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating model:", error);
      if (error?.code === "23505") {
        const detail = error?.detail || "";
        if (detail.includes("model_id")) {
          return res.status(409).json({ message: `A model with that Model ID already exists. Please use a unique Model ID.` });
        }
        return res.status(409).json({ message: `A duplicate entry was found: ${detail}` });
      }
      res.status(500).json({ message: "Failed to create model" });
    }
  });
  app2.patch("/api/series/:id/models", requireAuth, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const { modelIds } = req.body;
      await db.update(trailerModels).set({ seriesId: null }).where(eq2(trailerModels.seriesId, seriesId));
      if (modelIds && modelIds.length > 0) {
        await db.update(trailerModels).set({ seriesId }).where(inArray(trailerModels.id, modelIds));
      }
      res.json({ message: "Model assignments updated successfully" });
    } catch (error) {
      console.error("Error updating series models:", error);
      res.status(500).json({ message: "Failed to update model assignments" });
    }
  });
  app2.get("/api/categories/:categorySlug/models", async (req, res) => {
    try {
      const { categorySlug } = req.params;
      const models = await storage.getTrailerModelsByCategory(categorySlug);
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });
  app2.get("/api/series/:seriesId/models", async (req, res) => {
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
  app2.post("/api/custom-quotes", async (req, res) => {
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
  app2.get("/api/custom-quotes", requireAuth, async (req, res) => {
    try {
      const quotes = await db.select().from(customQuoteRequests).orderBy(customQuoteRequests.createdAt);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching custom quotes:", error);
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });
  app2.patch("/api/custom-quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { status, notes } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (status) updateData.status = status;
      if (notes !== void 0) updateData.notes = notes;
      const result = await db.update(customQuoteRequests).set(updateData).where(eq2(customQuoteRequests.id, quoteId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating custom quote:", error);
      res.status(500).json({ message: "Failed to update quote request" });
    }
  });
  app2.post("/api/quotes", async (req, res) => {
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
  app2.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const quotes = await db.select().from(quoteRequests).orderBy(quoteRequests.createdAt);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });
  app2.patch("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { status, notes } = req.body;
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (status) updateData.status = status;
      if (notes !== void 0) updateData.notes = notes;
      const result = await db.update(quoteRequests).set(updateData).where(eq2(quoteRequests.id, quoteId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Quote request not found" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating quote request:", error);
      res.status(500).json({ message: "Failed to update quote request" });
    }
  });
  app2.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const result = await db.delete(quoteRequests).where(eq2(quoteRequests.id, quoteId)).returning();
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
  app2.post("/api/dealer/login", async (req, res) => {
    try {
      const { dealerId, password } = req.body;
      console.log("\u{1F510} Dealer login attempt:");
      console.log("\u{1F4DD} Received dealerId:", dealerId);
      const [dealer] = await db.select().from(dealers).where(eq2(dealers.dealerId, dealerId));
      console.log("\u{1F50D} Database query result:", dealer);
      if (!dealer || !dealer.isActive) {
        console.log("\u274C Authentication failed: dealer not found or inactive");
        console.log("\u{1F4CA} Dealer exists:", !!dealer);
        console.log("\u{1F4CA} Dealer active:", dealer?.isActive);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const validPassword = await bcrypt2.compare(password, dealer.passwordHash);
      if (!validPassword) {
        console.log("\u274C Authentication failed: invalid password");
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const sessionId = crypto3.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await db.insert(dealerSessions).values({
        id: sessionId,
        dealerId: dealer.id,
        expiresAt
      });
      res.json({
        dealer: {
          id: dealer.id,
          dealerId: dealer.dealerId,
          dealerName: dealer.dealerName,
          contactName: dealer.contactName,
          email: dealer.email,
          territory: dealer.territory
        },
        sessionId,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("Dealer login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/dealer/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F510} Password reset requested for email:", email);
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const [dealer] = await db.select().from(dealers).where(eq2(dealers.email, email));
      if (!dealer || !dealer.isActive) {
        console.log("\u26A0\uFE0F Password reset requested for non-existent/inactive dealer:", email);
        return res.json({ message: "If a dealer account with that email exists, a reset link has been sent to that email address." });
      }
      const emailService = EmailService.getInstance();
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1e3);
      await db.insert(dealerPasswordResetTokens).values({
        dealerId: dealer.id,
        token: resetToken,
        email: dealer.email,
        expiresAt
      });
      const dealerName = dealer.contactName || dealer.dealerName || dealer.companyName;
      const emailSent = await emailService.sendDealerPasswordResetEmail(
        dealer.email,
        dealerName,
        resetToken
      );
      if (emailSent) {
        console.log("\u2705 Password reset email sent to:", dealer.email);
      } else {
        console.log("\u26A0\uFE0F Password reset email failed, but token created for:", dealer.email);
      }
      res.json({ message: "If a dealer account with that email exists, a reset link has been sent to that email address." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });
  app2.get("/api/dealer/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [resetRecord] = await db.select().from(dealerPasswordResetTokens).where(eq2(dealerPasswordResetTokens.token, token));
      if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      res.json({ valid: true, email: resetRecord.email });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ error: "Failed to validate reset token" });
    }
  });
  app2.post("/api/dealer/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }
      const [resetRecord] = await db.select().from(dealerPasswordResetTokens).where(eq2(dealerPasswordResetTokens.token, token));
      if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await db.update(dealers).set({
        passwordHash: hashedPassword,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(dealers.id, resetRecord.dealerId));
      await db.update(dealerPasswordResetTokens).set({ isUsed: true }).where(eq2(dealerPasswordResetTokens.token, token));
      await db.delete(dealerSessions).where(eq2(dealerSessions.dealerId, resetRecord.dealerId));
      console.log("\u2705 Password reset successful for dealer:", resetRecord.dealerId);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/dealer/change-password", requireDealerAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }
      if (req.dealerUser) {
        const dealerUser = req.dealerUser;
        const validCurrentPassword = await bcrypt2.compare(currentPassword, dealerUser.passwordHash);
        if (!validCurrentPassword) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }
        const hashedNewPassword = await hashPassword(newPassword);
        await db.update(dealerUsers).set({
          passwordHash: hashedNewPassword,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(dealerUsers.id, dealerUser.id));
        console.log("\u2705 Password changed successfully for dealer user:", dealerUser.username);
      } else {
        const dealer = req.dealer;
        const validCurrentPassword = await bcrypt2.compare(currentPassword, dealer.passwordHash);
        if (!validCurrentPassword) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }
        const hashedNewPassword = await hashPassword(newPassword);
        await db.update(dealers).set({
          passwordHash: hashedNewPassword,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(dealers.id, dealer.id));
        console.log("\u2705 Password changed successfully for dealer:", dealer.dealerId);
      }
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  app2.get("/api/dealer/profile", requireDealerAuth, async (req, res) => {
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
          role: req.dealerUser.role
        }
      });
    } else {
      res.json(req.dealer);
    }
  });
  app2.patch("/api/dealer/profile", requireDealerAuth, async (req, res) => {
    try {
      const updates = req.body;
      const dealerId = req.dealer.id;
      delete updates.dealerId;
      delete updates.passwordHash;
      delete updates.isActive;
      delete updates.id;
      const [updatedDealer] = await db.update(dealers).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(dealers.id, dealerId)).returning();
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app2.get("/api/dealer/orders", requireDealerAuth, async (req, res) => {
    try {
      const orders = await db.select().from(dealerOrders).where(eq2(dealerOrders.dealerId, req.dealer.id)).orderBy(dealerOrders.createdAt);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching dealer orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app2.post("/api/dealer/orders", requireDealerAuth, async (req, res) => {
    try {
      const orderData = req.body;
      const orderNumber = generateOrderNumber();
      const [order] = await db.insert(dealerOrders).values({
        ...orderData,
        dealerId: req.dealer.id,
        orderNumber,
        status: "draft"
      }).returning();
      res.json(order);
    } catch (error) {
      console.error("Error saving dealer order:", error);
      res.status(500).json({ error: "Failed to save order" });
    }
  });
  app2.patch("/api/dealer/orders/:id", requireDealerAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      const [existingOrder] = await db.select().from(dealerOrders).where(eq2(dealerOrders.id, orderId));
      if (!existingOrder || existingOrder.dealerId !== req.dealer.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      const [updatedOrder] = await db.update(dealerOrders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(dealerOrders.id, orderId)).returning();
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating dealer order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });
  app2.delete("/api/dealer/orders/:id", requireDealerAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [existingOrder] = await db.select().from(dealerOrders).where(eq2(dealerOrders.id, orderId));
      if (!existingOrder || existingOrder.dealerId !== req.dealer.id) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existingOrder.status !== "draft") {
        return res.status(400).json({ error: "Can only delete draft orders" });
      }
      await db.delete(dealerOrders).where(eq2(dealerOrders.id, orderId));
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting dealer order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });
  app2.get("/api/dealer/users", requireDealerAuth, async (req, res) => {
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
        createdAt: dealerUsers.createdAt
      }).from(dealerUsers).where(eq2(dealerUsers.dealerId, req.dealer.id)).orderBy(dealerUsers.createdAt);
      res.json(users);
    } catch (error) {
      console.error("Error fetching dealer users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/dealer/users", requireDealerAuth, async (req, res) => {
    try {
      const { username, email, firstName, lastName, title, password, role = "user" } = req.body;
      if (!username || !email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (role === "admin") {
        const isCurrentUserAdmin = !req.dealerUser || req.dealerUser.role === "admin";
        if (!isCurrentUserAdmin) {
          return res.status(403).json({ error: "Only administrators can create admin users" });
        }
      }
      const existing = await db.select().from(dealerUsers).where(sql2`${dealerUsers.username} = ${username} OR ${dealerUsers.email} = ${email}`);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      const passwordHash = await hashPassword(password);
      const [newUser] = await db.insert(dealerUsers).values({
        dealerId: req.dealer.id,
        username,
        email,
        firstName,
        lastName,
        title,
        passwordHash,
        role,
        isActive: true
      }).returning();
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating dealer user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.patch("/api/dealer/users/:id", requireDealerAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      const [existingUser] = await db.select().from(dealerUsers).where(eq2(dealerUsers.id, userId));
      if (!existingUser || existingUser.dealerId !== req.dealer.id) {
        return res.status(404).json({ error: "User not found" });
      }
      if (updates.role === "admin") {
        const isCurrentUserAdmin = !req.dealerUser || req.dealerUser.role === "admin";
        if (!isCurrentUserAdmin) {
          return res.status(403).json({ error: "Only administrators can assign admin role" });
        }
      }
      delete updates.id;
      delete updates.dealerId;
      delete updates.passwordHash;
      if (updates.password) {
        updates.passwordHash = await hashPassword(updates.password);
        delete updates.password;
      }
      const [updatedUser] = await db.update(dealerUsers).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(dealerUsers.id, userId)).returning();
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating dealer user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/dealer/users/:id", requireDealerAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const [existingUser] = await db.select().from(dealerUsers).where(eq2(dealerUsers.id, userId));
      if (!existingUser || existingUser.dealerId !== req.dealer.id) {
        return res.status(404).json({ error: "User not found" });
      }
      await db.delete(dealerUserSessions).where(eq2(dealerUserSessions.userId, userId));
      await db.delete(dealerUsers).where(eq2(dealerUsers.id, userId));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting dealer user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.post("/api/dealer/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const [user] = await db.select().from(dealerUsers).where(eq2(dealerUsers.username, username));
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const validPassword = await bcrypt2.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      await db.update(dealerUsers).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq2(dealerUsers.id, user.id));
      const sessionId = crypto3.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await db.insert(dealerUserSessions).values({
        id: sessionId,
        userId: user.id,
        dealerId: user.dealerId,
        expiresAt
      });
      const [dealer] = await db.select().from(dealers).where(eq2(dealers.id, user.dealerId));
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          title: user.title,
          role: user.role
        },
        dealer: {
          id: dealer.id,
          dealerId: dealer.dealerId,
          companyName: dealer.companyName || dealer.dealerName
        },
        sessionId,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("Dealer user login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/dealer/user/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("\u{1F510} Password reset requested for dealer user email:", email);
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const [user] = await db.select().from(dealerUsers).where(eq2(dealerUsers.email, email));
      if (!user || !user.isActive) {
        console.log("\u26A0\uFE0F Password reset requested for non-existent/inactive user:", email);
        return res.json({ message: "If an account with that email exists, a reset link has been sent to that email address." });
      }
      const emailService = EmailService.getInstance();
      const resetToken = emailService.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await db.update(dealerUsers).set({
        resetToken,
        resetTokenExpiry: expiresAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(dealerUsers.id, user.id));
      const userName = `${user.firstName} ${user.lastName}`;
      const emailSent = await emailService.sendDealerUserPasswordResetEmail(
        user.email,
        userName,
        resetToken
      );
      if (emailSent) {
        console.log("\u2705 Password reset email sent to:", user.email);
      } else {
        console.log("\u26A0\uFE0F Password reset email failed, but token created for:", user.email);
      }
      res.json({ message: "If an account with that email exists, a reset link has been sent to that email address." });
    } catch (error) {
      console.error("Dealer user forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });
  app2.get("/api/dealer/user/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      const [user] = await db.select().from(dealerUsers).where(eq2(dealerUsers.resetToken, token));
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      res.json({ valid: true, email: user.email });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ error: "Failed to validate reset token" });
    }
  });
  app2.post("/api/dealer/user/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }
      const [user] = await db.select().from(dealerUsers).where(eq2(dealerUsers.resetToken, token));
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await db.update(dealerUsers).set({
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(dealerUsers.id, user.id));
      console.log("\u2705 Password reset successful for dealer user:", user.email);
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/dealer/logout", requireDealerAuth, async (req, res) => {
    try {
      await db.delete(dealerSessions).where(eq2(dealerSessions.id, req.sessionId));
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Dealer logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
  app2.get("/api/models/all", requireAuth, async (req, res) => {
    try {
      const models = await storage.getAllModels();
      console.log("Found models:", models.length);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.json(models);
    } catch (error) {
      console.error("Error fetching all models:", error);
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });
  app2.get("/api/series/all", requireAuth, async (req, res) => {
    try {
      const series = await storage.getAllSeries();
      console.log("Found series:", series.length);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.json(series);
    } catch (error) {
      console.error("Error fetching all series:", error);
      res.status(500).json({ message: "Failed to fetch series" });
    }
  });
  app2.get("/api/models/:modelId", async (req, res) => {
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
  app2.get("/api/models/:modelId/options", async (req, res) => {
    try {
      const { modelId } = req.params;
      const options = await storage.getOptionsForModel(modelId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch options" });
    }
  });
  app2.post("/api/configurations", async (req, res) => {
    try {
      const config = req.body;
      const savedConfig = await storage.saveUserConfiguration(config);
      res.json(savedConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });
  app2.get("/api/configurations/:sessionId", async (req, res) => {
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
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const authResult = await authenticateUser(username, password);
      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }
      const sessionResult = await createSession(authResult.user.id);
      if (!sessionResult.success) {
        return res.status(500).json({ error: sessionResult.error });
      }
      res.json({
        user: {
          id: authResult.user.id,
          username: authResult.user.username,
          email: authResult.user.email,
          firstName: authResult.user.firstName,
          lastName: authResult.user.lastName,
          role: authResult.user.role
        },
        sessionId: sessionResult.sessionId,
        expiresAt: sessionResult.expiresAt
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/admin/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const user = await storage.getAdminUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }
      const { EmailService: EmailService2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
      const emailService = EmailService2.getInstance();
      const resetToken = emailService.generateResetToken();
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        email: user.email,
        expiresAt,
        isUsed: false
      });
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
  app2.post("/api/admin/reset-password", async (req, res) => {
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
      if (/* @__PURE__ */ new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Reset token has expired" });
      }
      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateAdminUser(resetToken.userId, {
        passwordHash: newPasswordHash
      });
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
  app2.get("/api/admin/email-config", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { EmailConfigManager: EmailConfigManager2 } = await Promise.resolve().then(() => (init_email_config(), email_config_exports));
      const configManager = EmailConfigManager2.getInstance();
      res.json({
        config: configManager.getPublicSettings(),
        validation: configManager.validateSettings()
      });
    } catch (error) {
      console.error("Get email config error:", error);
      res.status(500).json({ error: "Failed to get email configuration" });
    }
  });
  app2.post("/api/admin/email-config", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { EmailConfigManager: EmailConfigManager2 } = await Promise.resolve().then(() => (init_email_config(), email_config_exports));
      const { EmailService: EmailService2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
      const configManager = EmailConfigManager2.getInstance();
      const emailService = EmailService2.getInstance();
      configManager.updateSettings(req.body);
      const validation = configManager.validateSettings();
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Invalid configuration",
          details: validation.errors
        });
      }
      const settings = configManager.getSettings();
      await emailService.configure({
        provider: settings.provider,
        from: settings.fromAddress,
        smtp: settings.provider === "smtp" ? {
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure,
          user: settings.smtpUser,
          pass: settings.smtpPass
        } : void 0,
        gmail: settings.provider === "gmail" ? {
          user: settings.gmailUser,
          pass: settings.gmailAppPassword
        } : void 0,
        outlook: settings.provider === "outlook" ? {
          user: settings.outlookUser,
          pass: settings.outlookPass
        } : void 0
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
  app2.post("/api/admin/test-email", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { testEmail } = z.object({
        testEmail: z.string().email()
      }).parse(req.body);
      const { EmailService: EmailService2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
      const emailService = EmailService2.getInstance();
      const success = await emailService.sendEmail({
        to: testEmail,
        subject: "Test Email - Walton Trailers Admin",
        text: "This is a test email from your Walton Trailers admin system. If you received this, your email configuration is working correctly!",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">Test Email</h2>
          <p>This is a test email from your Walton Trailers admin system.</p>
          <p style="color: #059669; font-weight: bold;">\u2705 Your email configuration is working correctly!</p>
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
  app2.post("/api/admin/logout", requireAuth, async (req, res) => {
    try {
      await logout(req.sessionId);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
  app2.get("/api/admin/profile", requireAuth, async (req, res) => {
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    });
  });
  app2.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers();
      const sanitizedUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      if (userData.role === "admin") {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== "admin") {
          return res.status(403).json({ error: "Only administrators can create admin users" });
        }
      }
      const existingByUsername = await storage.getAdminUserByUsername(userData.username);
      if (existingByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const existingByEmail = await storage.getAdminUserByEmail(userData.email);
      if (existingByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      const passwordHash = await hashPassword(userData.password);
      const newUser = await storage.createAdminUser({
        ...userData,
        passwordHash
      });
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      if (updates.role === "admin") {
        const currentUser = req.user;
        if (!currentUser || currentUser.role !== "admin") {
          return res.status(403).json({ error: "Only administrators can assign admin role" });
        }
      }
      if (updates.password && updates.password.length > 0) {
        const passwordHash = await hashPassword(updates.password);
        updates.passwordHash = passwordHash;
      }
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
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot deactivate your own account" });
      }
      await storage.deactivateAdminUser(userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  });
  app2.get("/api/admin/dealers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allDealers = await db.select().from(dealers).orderBy(dealers.dealerName);
      res.json(allDealers);
    } catch (error) {
      console.error("Error fetching dealers:", error);
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });
  app2.get("/api/admin/dealers/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await db.select({
        dealerId: dealerOrders.dealerId,
        orderCount: sql2`count(*)::int`,
        totalRevenue: sql2`sum(${dealerOrders.totalPrice})::int`
      }).from(dealerOrders).groupBy(dealerOrders.dealerId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dealer stats:", error);
      res.status(500).json({ error: "Failed to fetch dealer stats" });
    }
  });
  app2.post("/api/admin/dealers", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { dealerId, dealerName, contactName, email, phone, territory, address, city, state, zipCode, password } = req.body;
      const existing = await db.select().from(dealers).where(sql2`${dealers.dealerId} = ${dealerId} OR ${dealers.email} = ${email}`);
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
  app2.patch("/api/admin/dealers/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const updates = req.body;
      if (updates.password && updates.password.length > 0) {
        updates.passwordHash = await hashPassword(updates.password);
      }
      delete updates.password;
      const [updatedDealer] = await db.update(dealers).set(updates).where(eq2(dealers.id, dealerId)).returning();
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer:", error);
      res.status(500).json({ error: "Failed to update dealer" });
    }
  });
  app2.patch("/api/admin/dealers/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const dealerId = parseInt(req.params.id);
      const { isActive } = req.body;
      const [updatedDealer] = await db.update(dealers).set({ isActive }).where(eq2(dealers.id, dealerId)).returning();
      if (!updatedDealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(updatedDealer);
    } catch (error) {
      console.error("Error updating dealer status:", error);
      res.status(500).json({ error: "Failed to update dealer status" });
    }
  });
  app2.get("/api/admin/configurations", requireAuth, requireAdmin, async (req, res) => {
    try {
      const publicConfigs = await db.select({
        id: userConfigurations.id,
        type: sql2`'public'`,
        source: sql2`'Public'`,
        dealerId: sql2`NULL`,
        dealerName: sql2`NULL`,
        customerName: sql2`NULL`,
        customerEmail: sql2`NULL`,
        customerPhone: sql2`NULL`,
        categorySlug: userConfigurations.categorySlug,
        categoryName: sql2`NULL`,
        modelId: userConfigurations.modelId,
        modelName: sql2`NULL`,
        variantId: sql2`NULL`,
        selectedOptions: userConfigurations.selectedOptions,
        totalPrice: userConfigurations.totalPrice,
        status: sql2`'saved'`,
        notes: sql2`NULL`,
        createdAt: userConfigurations.createdAt,
        sessionId: userConfigurations.sessionId
      }).from(userConfigurations).orderBy(sql2`${userConfigurations.createdAt} DESC`);
      const dealerConfigs = await db.select({
        id: dealerOrders.id,
        type: sql2`'dealer'`,
        source: sql2`'Dealer'`,
        dealerId: sql2`cast(${dealerOrders.dealerId} as text)`,
        dealerName: dealers.dealerName,
        customerName: dealerOrders.customerName,
        customerEmail: dealerOrders.customerEmail,
        customerPhone: dealerOrders.customerPhone,
        categorySlug: dealerOrders.categorySlug,
        categoryName: dealerOrders.categoryName,
        modelId: dealerOrders.modelId,
        modelName: dealerOrders.modelName,
        variantId: sql2`NULL`,
        selectedOptions: dealerOrders.selectedOptions,
        totalPrice: dealerOrders.totalPrice,
        status: dealerOrders.status,
        notes: dealerOrders.notes,
        createdAt: dealerOrders.createdAt,
        orderNumber: dealerOrders.orderNumber
      }).from(dealerOrders).leftJoin(dealers, eq2(dealerOrders.dealerId, dealers.id)).orderBy(sql2`${dealerOrders.createdAt} DESC`);
      const allConfigs = [...publicConfigs, ...dealerConfigs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json(allConfigs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });
  app2.get("/api/categories/options/positions", async (req, res) => {
    try {
      const result = await db.execute(sql2`
        SELECT "Name", position FROM trailer_option_categories ORDER BY position NULLS LAST, "Name"
      `);
      const positions = result.rows.map((row) => ({ name: row.Name, position: row.position }));
      res.json(positions);
    } catch (error) {
      console.error("Error fetching option category positions:", error);
      res.status(500).json({ message: "Failed to fetch category positions" });
    }
  });
  app2.get("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql2`
        SELECT "Name" FROM trailer_option_categories WHERE is_system IS NOT TRUE ORDER BY position NULLS LAST, "Name"
      `);
      const categories = result.rows.map((row) => row.Name).filter((name) => name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.post("/api/categories/options", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const categoryName = name.trim().toLowerCase();
      const existing = await db.execute(sql2`
        SELECT id FROM trailer_option_categories WHERE LOWER("Name") = ${categoryName}
      `);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "Category already exists" });
      }
      const maxPos = await db.execute(sql2`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM trailer_option_categories
      `);
      const nextPos = maxPos.rows[0].next_pos;
      await db.execute(sql2`
        INSERT INTO trailer_option_categories ("Name", position) VALUES (${categoryName}, ${nextPos})
      `);
      res.json({ success: true, name: categoryName });
    } catch (error) {
      console.error("Error creating option category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });
  app2.get("/api/categories/options/details", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql2`
        SELECT id, "Name", position, is_system FROM trailer_option_categories ORDER BY position NULLS LAST, "Name"
      `);
      const categories = result.rows.map((row) => ({ id: row.id, name: row.Name, position: row.position, isSystem: row.is_system }));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching option category details:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.patch("/api/categories/options/:id/position", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      const catResult = await db.execute(sql2`
        SELECT id, position FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (catResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      const currentPos = catResult.rows[0].position;
      let adjacentResult;
      if (direction === "up") {
        adjacentResult = await db.execute(sql2`
          SELECT id, position FROM trailer_option_categories
          WHERE position < ${currentPos}
          ORDER BY position DESC NULLS LAST
          LIMIT 1
        `);
      } else {
        adjacentResult = await db.execute(sql2`
          SELECT id, position FROM trailer_option_categories
          WHERE position > ${currentPos}
          ORDER BY position ASC NULLS LAST
          LIMIT 1
        `);
      }
      if (adjacentResult.rows.length === 0) {
        return res.json({ success: true, message: "Already at boundary" });
      }
      const adjacentId = adjacentResult.rows[0].id;
      const adjacentPos = adjacentResult.rows[0].position;
      await db.execute(sql2`
        UPDATE trailer_option_categories SET position = ${adjacentPos} WHERE id = ${parseInt(id)}
      `);
      await db.execute(sql2`
        UPDATE trailer_option_categories SET position = ${currentPos} WHERE id = ${adjacentId}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering option category:", error);
      res.status(500).json({ message: "Failed to reorder category" });
    }
  });
  app2.patch("/api/categories/options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const newName = name.trim().toLowerCase();
      const existing = await db.execute(sql2`
        SELECT id FROM trailer_option_categories WHERE LOWER("Name") = ${newName} AND id != ${parseInt(id)}
      `);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: "A category with that name already exists" });
      }
      const oldResult = await db.execute(sql2`
        SELECT "Name", is_system FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (oldResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      if (oldResult.rows[0].is_system) {
        return res.status(403).json({ message: "System categories cannot be renamed" });
      }
      const oldName = oldResult.rows[0].Name;
      await db.execute(sql2`
        UPDATE trailer_option_categories SET "Name" = ${newName} WHERE id = ${parseInt(id)}
      `);
      await db.execute(sql2`
        UPDATE trailer_options SET category = ${newName} WHERE LOWER(category) = LOWER(${oldName})
      `);
      res.json({ success: true, name: newName });
    } catch (error) {
      console.error("Error updating option category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });
  app2.delete("/api/categories/options/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const catResult = await db.execute(sql2`
        SELECT "Name", is_system FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      if (catResult.rows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      if (catResult.rows[0].is_system) {
        return res.status(403).json({ message: "System categories cannot be deleted" });
      }
      const catName = catResult.rows[0].Name;
      const activeCount = await db.execute(sql2`
        SELECT COUNT(*) as count FROM trailer_options WHERE LOWER(category) = LOWER(${catName}) AND (is_archived IS NULL OR is_archived = false)
      `);
      const count = parseInt(activeCount.rows[0].count);
      if (count > 0) {
        return res.status(400).json({ message: `Cannot delete: ${count} active option(s) still use this category. Archive them first.` });
      }
      await db.execute(sql2`
        DELETE FROM trailer_option_categories WHERE id = ${parseInt(id)}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting option category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
  app2.get("/api/options/all", async (req, res) => {
    try {
      const authHeader = req.get("authorization");
      const sessionId = authHeader?.replace("Bearer ", "");
      if (!sessionId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const adminSession = await db.select().from(adminSessions).where(eq2(adminSessions.id, sessionId)).limit(1);
      const dealerSession = await db.select().from(dealerSessions).where(eq2(dealerSessions.id, sessionId)).limit(1);
      const dealerUserSession = await db.select().from(dealerUserSessions).where(eq2(dealerUserSessions.id, sessionId)).limit(1);
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
  app2.get("/api/options/model/:modelId", async (req, res) => {
    try {
      const { modelId } = req.params;
      const options = await storage.getOptionsForModel(modelId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching options for model:", error);
      res.status(500).json({ message: "Failed to fetch options for model" });
    }
  });
  app2.patch("/api/models/:id/category-order", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const { categoryOrder } = req.body;
      if (!categoryOrder || typeof categoryOrder !== "object") {
        return res.status(400).json({ message: "categoryOrder must be an object mapping category names to positions" });
      }
      const updatedModel = await storage.updateModel(modelId, { categoryOrder });
      res.json({ success: true, categoryOrder: updatedModel.categoryOrder });
    } catch (error) {
      console.error("Error updating model category order:", error);
      res.status(500).json({ message: "Failed to update category order" });
    }
  });
  app2.patch("/api/models/:id", requireAuth, async (req, res) => {
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
        categoryOrder
      });
      console.log("Updated model result:", updatedModel);
      res.json(updatedModel);
    } catch (error) {
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Failed to update model" });
    }
  });
  app2.post("/api/options", requireAuth, async (req, res) => {
    try {
      const { name, price, category, modelId, applicableModels, hexColor, primerPrice, isPerFt, imageUrl, isMultiSelect } = req.body;
      console.log("Creating new option:", req.body);
      let normalizedImageUrl = imageUrl || "";
      if (normalizedImageUrl && normalizedImageUrl.includes("storage.googleapis.com")) {
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
        imageUrl: normalizedImageUrl || void 0,
        isMultiSelect
      });
      console.log("Created option:", newOption);
      res.json(newOption);
    } catch (error) {
      console.error("Error creating option:", error);
      res.status(500).json({ message: "Failed to create option" });
    }
  });
  app2.patch("/api/options/:id", requireAuth, async (req, res) => {
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
        primerPrice
      });
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating option:", error);
      res.status(500).json({ message: "Failed to update option" });
    }
  });
  app2.delete("/api/options/:id", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.deleteOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting option:", error);
      res.status(500).json({ error: "Failed to delete option" });
    }
  });
  app2.patch("/api/options/:id/archive", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.archiveOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving option:", error);
      res.status(500).json({ error: "Failed to archive option" });
    }
  });
  app2.patch("/api/options/:id/restore", requireAuth, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.restoreOption(optionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error restoring option:", error);
      res.status(500).json({ error: "Failed to restore option" });
    }
  });
  app2.patch("/api/models/:id/archive", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      await storage.archiveModel(modelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving model:", error);
      res.status(500).json({ error: "Failed to archive model" });
    }
  });
  app2.patch("/api/models/:id/restore", requireAuth, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);
      const restoredModel = await storage.restoreModel(modelId);
      res.json(restoredModel);
    } catch (error) {
      console.error("Error restoring model:", error);
      res.status(500).json({ error: "Failed to restore model" });
    }
  });
  app2.patch("/api/categories/:id/archive", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      await storage.archiveCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving category:", error);
      res.status(500).json({ error: "Failed to archive category" });
    }
  });
  app2.patch("/api/categories/:id/restore", requireAuth, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const restoredCategory = await storage.restoreCategory(categoryId);
      res.json(restoredCategory);
    } catch (error) {
      console.error("Error restoring category:", error);
      res.status(500).json({ error: "Failed to restore category" });
    }
  });
  app2.get("/api/admin/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllTrailerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error in /api/admin/categories:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to fetch categories",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.post("/api/categories/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  app2.patch("/api/categories/:id/image", requireAuth, async (req, res) => {
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
          visibility: "public"
          // Category images should be public for customers to see
        }
      );
      console.log(`Object path after ACL policy: ${objectPath}`);
      const result = await db.update(trailerCategories).set({ imageUrl: objectPath }).where(eq2(trailerCategories.id, categoryId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      try {
        const category = result[0];
        const filename = objectPath.split("/").pop() || "unknown";
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${category.name}_category_image`,
          objectPath,
          mimeType: "image/jpeg",
          // Default, could be improved to detect actual type
          fileSize: 0,
          // Could be improved to get actual file size
          altText: `${category.name} category image`,
          description: `Category image for ${category.name}`,
          tags: ["category", category.slug],
          uploadedBy: req.user?.id,
          usageCount: 1
        });
        console.log(`Saved category image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving to media library:", mediaError);
      }
      console.log(`Updated category result:`, result[0]);
      res.json({
        success: true,
        imageUrl: objectPath,
        category: result[0]
      });
    } catch (error) {
      console.error("Error updating category image:", error);
      res.status(500).json({ error: "Failed to update category image" });
    }
  });
  app2.post("/api/models/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  app2.patch("/api/models/:id/image", requireAuth, async (req, res) => {
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
          visibility: "public"
          // Model images should be public for customers to see
        }
      );
      console.log(`Object path after ACL policy: ${objectPath}`);
      const updatedModel = await storage.updateModel(modelId, {
        imageUrl: objectPath
      });
      try {
        const filename = objectPath.split("/").pop() || "unknown";
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${updatedModel.name}_model_image`,
          objectPath,
          mimeType: "image/jpeg",
          fileSize: 0,
          altText: `${updatedModel.name} model image`,
          description: `Model image for ${updatedModel.name}`,
          tags: ["model", updatedModel.modelId || "unknown"],
          uploadedBy: req.user?.id,
          usageCount: 1
        });
        console.log(`Saved model image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving model image to media library:", mediaError);
      }
      console.log(`Updated model result:`, updatedModel);
      res.json({
        success: true,
        imageUrl: objectPath,
        model: updatedModel
      });
    } catch (error) {
      console.error("Error updating model image:", error);
      res.status(500).json({ error: "Failed to update model image" });
    }
  });
  app2.patch("/api/models/:id/model3d", requireAuth, async (req, res) => {
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
          visibility: "public"
        }
      );
      console.log(`3D model object path after ACL policy: ${objectPath}`);
      const updatedModel = await storage.updateModel(modelId, {
        model3dUrl: objectPath
      });
      console.log(`Updated model with 3D URL:`, updatedModel);
      res.json({
        success: true,
        model3dUrl: objectPath,
        model: updatedModel
      });
    } catch (error) {
      console.error("Error updating 3D model:", error);
      res.status(500).json({ error: "Failed to update 3D model" });
    }
  });
  app2.post("/api/models/:id/images", requireAuth, async (req, res) => {
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
  app2.delete("/api/models/:id/images", requireAuth, async (req, res) => {
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
  app2.patch("/api/models/:id/images/reorder", requireAuth, async (req, res) => {
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
  app2.post("/api/options/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for option:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  app2.patch("/api/options/:id/image", requireAuth, async (req, res) => {
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
          visibility: "public"
          // Option images should be public for customers to see
        }
      );
      console.log(`Object path after ACL policy: ${objectPath}`);
      const updatedOption = await storage.updateOption(optionId, {
        imageUrl: objectPath
      });
      try {
        const filename = objectPath.split("/").pop() || "unknown";
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${updatedOption.name}_option_image`,
          objectPath,
          mimeType: "image/jpeg",
          fileSize: 0,
          altText: `${updatedOption.name} option image`,
          description: `Option image for ${updatedOption.name}`,
          tags: ["option", updatedOption.category || "unknown"],
          uploadedBy: req.user?.id,
          usageCount: 1
        });
        console.log(`Saved option image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving option image to media library:", mediaError);
      }
      console.log(`Updated option result:`, updatedOption);
      res.json({
        success: true,
        imageUrl: objectPath,
        option: updatedOption
      });
    } catch (error) {
      console.error("Error updating option image:", error);
      res.status(500).json({ error: "Failed to update option image" });
    }
  });
  app2.post("/api/series/upload-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL for series:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  app2.patch("/api/series/:id/image", requireAuth, async (req, res) => {
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
          visibility: "public"
          // Series images should be public for customers to see
        }
      );
      console.log(`Object path after ACL policy: ${objectPath}`);
      const result = await db.update(trailerSeries).set({ imageUrl: objectPath }).where(eq2(trailerSeries.id, seriesId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Series not found" });
      }
      try {
        const series = result[0];
        const filename = objectPath.split("/").pop() || "unknown";
        await db.insert(mediaFiles).values({
          filename,
          originalName: `${series.name}_series_image`,
          objectPath,
          mimeType: "image/jpeg",
          // Default, could be improved to detect actual type
          fileSize: 0,
          // Could be improved to get actual file size
          altText: `${series.name} series image`,
          description: `Series image for ${series.name}`,
          tags: ["series", series.name?.toLowerCase() || "unknown"],
          uploadedBy: req.user?.id,
          usageCount: 1
        });
        console.log(`Saved series image to media library: ${objectPath}`);
      } catch (mediaError) {
        console.error("Error saving series image to media library:", mediaError);
      }
      console.log(`Updated series result:`, result[0]);
      res.json({
        success: true,
        imageUrl: objectPath,
        series: result[0]
      });
    } catch (error) {
      console.error("Error updating series image:", error);
      res.status(500).json({ error: "Failed to update series image" });
    }
  });
  app2.post("/api/admin/backfill-media", requireAuth, requireAdmin, async (req, res) => {
    try {
      let insertedCount = 0;
      let skippedCount = 0;
      console.log("Starting media library backfill...");
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const categories = await db.execute(sql2`SELECT id, name, slug, image_url FROM trailer_categories WHERE image_url IS NOT NULL AND image_url != ''`);
      for (const row of categories.rows) {
        const category = row;
        try {
          if (!category.image_url || !category.name) {
            console.log(`Skipping category with missing data: ${JSON.stringify(category)}`);
            skippedCount++;
            continue;
          }
          const existing = await db.execute(sql2`SELECT id FROM media_files WHERE object_path = ${category.image_url} LIMIT 1`);
          if (existing.rows.length === 0) {
            const filename = category.image_url.includes("/") ? category.image_url.split("/").pop() || "unknown" : "unknown";
            const safeName = category.name || "Unknown Category";
            const safeSlug = category.slug || "unknown";
            const tags = JSON.stringify(["category", safeSlug]);
            await db.execute(sql2`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + "_category_image"}, 
                ${category.image_url}, 
                ${"image/jpeg"}, 
                ${0}, 
                ${safeName + " category image"}, 
                ${"Category image for " + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            insertedCount++;
            console.log(`\u2713 Category: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${category.name}`);
          }
        } catch (err) {
          console.error(`Error processing category ${category.name || "unknown"}:`, err);
          skippedCount++;
        }
      }
      const models = await db.execute(sql2`SELECT id, name, model_id, image_url FROM trailer_models WHERE image_url IS NOT NULL AND image_url != ''`);
      for (const row of models.rows) {
        const model = row;
        try {
          if (!model.image_url || !model.name) {
            console.log(`Skipping model with missing data: ${JSON.stringify(model)}`);
            skippedCount++;
            continue;
          }
          const existing = await db.execute(sql2`SELECT id FROM media_files WHERE object_path = ${model.image_url} LIMIT 1`);
          if (existing.rows.length === 0) {
            const filename = model.image_url.includes("/") ? model.image_url.split("/").pop() || "unknown" : "unknown";
            const safeName = model.name || "Unknown Model";
            const safeModelId = model.model_id || "unknown";
            const tags = JSON.stringify(["model", safeModelId]);
            await db.execute(sql2`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + "_model_image"}, 
                ${model.image_url}, 
                ${"image/jpeg"}, 
                ${0}, 
                ${safeName + " model image"}, 
                ${"Model image for " + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            insertedCount++;
            console.log(`\u2713 Model: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${model.name}`);
          }
        } catch (err) {
          console.error(`Error processing model ${model.name || "unknown"}:`, err);
          skippedCount++;
        }
      }
      const options = await db.execute(sql2`SELECT id, name, model_id, category, image_url FROM trailer_options WHERE image_url IS NOT NULL AND image_url != ''`);
      for (const row of options.rows) {
        const option = row;
        try {
          if (!option.image_url || !option.name) {
            console.log(`Skipping option with missing data: ${JSON.stringify(option)}`);
            skippedCount++;
            continue;
          }
          const existing = await db.execute(sql2`SELECT id FROM media_files WHERE object_path = ${option.image_url} LIMIT 1`);
          if (existing.rows.length === 0) {
            const filename = option.image_url.includes("/") ? option.image_url.split("/").pop() || "unknown" : "unknown";
            const safeName = option.name || "Unknown Option";
            const safeCategory = option.category || "unknown";
            const tags = JSON.stringify(["option", safeCategory]);
            await db.execute(sql2`
              INSERT INTO media_files (
                filename, original_name, object_path, mime_type, file_size, 
                alt_text, description, tags, uploaded_by, usage_count, is_active
              ) VALUES (
                ${filename}, 
                ${safeName + "_option_image"}, 
                ${option.image_url}, 
                ${"image/jpeg"}, 
                ${0}, 
                ${safeName + " option image"}, 
                ${"Option image for " + safeName}, 
                ${tags}, 
                ${userId}, 
                ${1}, 
                ${true}
              )
            `);
            insertedCount++;
            console.log(`\u2713 Option: ${safeName}`);
          } else {
            skippedCount++;
            console.log(`- Skipped existing: ${option.name}`);
          }
        } catch (err) {
          console.error(`Error processing option ${option.name || "unknown"}:`, err);
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
  app2.get("/objects/:objectPath(*)", async (req, res) => {
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
  app2.put("/api/blob-upload/:pathname(*)", async (req, res) => {
    try {
      const pathname = decodeURIComponent(req.params.pathname);
      if (!pathname || pathname.includes("..")) {
        return res.status(400).json({ error: "Invalid pathname" });
      }
      const contentType = req.get("content-type") || "application/octet-stream";
      const result = await uploadBlob(pathname, req, contentType);
      return res.status(200).json({
        pathname: result.pathname,
        url: result.url,
        objectPath: `/objects/${result.pathname}`
      });
    } catch (error) {
      console.error("Error uploading blob:", error);
      return res.status(500).json({ error: "Upload failed", message: error?.message });
    }
  });
  app2.post("/api/integrations/airtable/test", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { accessToken, baseId } = req.body;
    if (!accessToken || !baseId) {
      return res.status(400).json({ error: "Access token and base ID are required" });
    }
    try {
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
      const response = await fetch(metaUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const tables = data.tables || [];
        return res.json({
          success: true,
          tableCount: tables.length,
          tables: tables.map((t) => ({ id: t.id, name: t.name, description: t.description })),
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
  app2.post("/api/integrations/airtable/save", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { accessToken, baseId } = req.body;
    if (!accessToken || !baseId) {
      return res.status(400).json({ error: "Access token and base ID are required" });
    }
    try {
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
  app2.get("/api/integrations/airtable/status", async (req, res) => {
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
  app2.post("/api/integrations/airtable/import", async (req, res) => {
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
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${config.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch from Airtable: ${response.statusText}`);
      }
      const data = await response.json();
      const records = data.records || [];
      let importedCount = 0;
      if (tableName.toLowerCase().includes("model") || tableName.toLowerCase().includes("trailer")) {
        for (const record of records) {
          const fields = record.fields;
          if (fields.Name && fields.Price) {
            const modelData = {
              name: fields.Name,
              basePrice: parseFloat(fields.Price) || 0,
              gvwr: fields.GVWR || "",
              payload: fields.Payload || "",
              deckSize: fields.DeckSize || fields["Deck Size"] || "",
              axles: fields.Axles || "",
              features: fields.Features ? fields.Features.split(",").map((f) => f.trim()) : []
            };
            console.log("Importing model:", modelData);
            importedCount++;
          }
        }
      } else if (tableName.toLowerCase().includes("option")) {
        for (const record of records) {
          const fields = record.fields;
          if (fields.Name && fields.Price) {
            const optionData = {
              name: fields.Name,
              price: parseFloat(fields.Price) || 0,
              category: fields.Category || "Uncategorized",
              modelId: fields.ModelID || "universal"
            };
            console.log("Importing option:", optionData);
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
  app2.post("/api/integrations/airtable/export", async (req, res) => {
    const { sessionId } = req.cookies;
    if (!sessionId || !storage.isAdminSession(sessionId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { dataType } = req.body;
    const config = await storage.getAirtableConfig();
    if (!config) {
      return res.status(400).json({ error: "Airtable not configured" });
    }
    try {
      let exportData = [];
      if (dataType === "models") {
        const models = await storage.getAllModels();
        exportData = models.map((model) => ({
          fields: {
            Name: model.name,
            Price: model.basePrice,
            GVWR: model.gvwr,
            Payload: model.payload,
            "Deck Size": model.deckSize,
            Axles: model.axles,
            Features: model.features.join(", "),
            "Model ID": model.modelId
          }
        }));
      } else if (dataType === "options") {
        const options = await storage.getAllOptions();
        exportData = options.map((option) => ({
          fields: {
            Name: option.name,
            Price: option.price,
            Category: option.category,
            "Model ID": option.modelId
          }
        }));
      }
      const tableName = dataType === "models" ? "Trailer Models" : "Trailer Options";
      const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(tableName)}`;
      let createdCount = 0;
      for (let i = 0; i < exportData.length; i += 10) {
        const batch = exportData.slice(i, i + 10);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
            "Content-Type": "application/json"
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
  app2.get("/api/media", requireAuth, async (req, res) => {
    try {
      const { tags, search, sortBy = "created_at", order = "desc" } = req.query;
      let query = db.select().from(mediaFiles).where(eq2(mediaFiles.isActive, true));
      if (search && typeof search === "string") {
        query = query.where(
          sql2`(${mediaFiles.filename} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.originalName} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.altText} ILIKE ${`%${search}%`} OR 
               ${mediaFiles.description} ILIKE ${`%${search}%`})`
        );
      }
      if (tags && typeof tags === "string") {
        const tagArray = tags.split(",").map((tag) => tag.trim());
        query = query.where(
          sql2`${mediaFiles.tags} ?| ${tagArray}`
        );
      }
      const orderDirection = order === "asc" ? sql2`ASC` : sql2`DESC`;
      if (sortBy === "filename") {
        query = query.orderBy(sql2`${mediaFiles.filename} ${orderDirection}`);
      } else if (sortBy === "file_size") {
        query = query.orderBy(sql2`${mediaFiles.fileSize} ${orderDirection}`);
      } else if (sortBy === "updated_at") {
        query = query.orderBy(sql2`${mediaFiles.updatedAt} ${orderDirection}`);
      } else {
        query = query.orderBy(sql2`${mediaFiles.createdAt} ${orderDirection}`);
      }
      const files = await query;
      const filesWithUrls = files.map((file) => ({
        ...file,
        accessUrl: file.objectPath.startsWith("/objects/") ? file.objectPath : `/public-objects${file.objectPath.replace(/^\/[^/]+/, "")}`,
        tags: Array.isArray(file.tags) ? file.tags : []
      }));
      res.json(filesWithUrls);
    } catch (error) {
      console.error("Error fetching media files:", error);
      res.status(500).json({ message: "Failed to fetch media files" });
    }
  });
  app2.patch("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { altText, description, tags } = req.body;
      const updateData = {
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (altText !== void 0) updateData.altText = altText;
      if (description !== void 0) updateData.description = description;
      if (tags !== void 0) updateData.tags = Array.isArray(tags) ? tags : [];
      const result = await db.update(mediaFiles).set(updateData).where(eq2(mediaFiles.id, fileId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Media file not found" });
      }
      const updatedFile = {
        ...result[0],
        accessUrl: result[0].objectPath.startsWith("/objects/") ? result[0].objectPath : `/public-objects${result[0].objectPath.replace(/^\/[^/]+/, "")}`,
        tags: Array.isArray(result[0].tags) ? result[0].tags : []
      };
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating media file:", error);
      res.status(500).json({ message: "Failed to update media file" });
    }
  });
  app2.delete("/api/media/:id", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const result = await db.update(mediaFiles).set({
        isActive: false,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(mediaFiles.id, fileId)).returning();
      if (result.length === 0) {
        return res.status(404).json({ message: "Media file not found" });
      }
      res.json({ message: "Media file deleted successfully" });
    } catch (error) {
      console.error("Error deleting media file:", error);
      res.status(500).json({ message: "Failed to delete media file" });
    }
  });
  app2.get("/api/media/tags", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql2`
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM media_files 
        WHERE is_active = true AND tags IS NOT NULL
        ORDER BY tag
      `);
      const tags = result.rows.map((row) => row.tag).filter(Boolean);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });
  app2.post("/api/media/register", requireAuth, async (req, res) => {
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
        accessUrl: result[0].objectPath.startsWith("/objects/") ? result[0].objectPath : `/public-objects${result[0].objectPath.replace(/^\/[^/]+/, "")}`,
        tags: []
      };
      res.json(newFile);
    } catch (error) {
      console.error("Error registering media file:", error);
      res.status(500).json({ message: "Failed to register media file" });
    }
  });
  app2.get("/api/media/stats", requireAuth, async (req, res) => {
    try {
      const stats = await db.execute(sql2`
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          COUNT(CASE WHEN width IS NOT NULL THEN 1 END) as images_count,
          AVG(file_size) as avg_file_size
        FROM media_files 
        WHERE is_active = true
      `);
      const result = stats.rows[0];
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
  app2.post("/api/clear-cache", async (req, res) => {
    try {
      storage.clear();
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cache", error: error.message });
    }
  });
  app2.get("/api/debug/model/:modelId", async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await db.execute(sql2`
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
  return app2;
}

// server/admin-seed.ts
async function createInitialAdminUser() {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
      console.log("No database configured - skipping admin user creation.");
      return;
    }
    if (process.env.NODE_ENV === "production") {
      console.log("Skipping admin user check in production mode");
      return;
    }
    let existingUsers = [];
    try {
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 5e3)
      );
      existingUsers = await Promise.race([
        storage.getAllAdminUsers(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Error checking existing users:", error);
      return;
    }
    if (existingUsers.length > 0) {
      console.log("Admin users already exist. Skipping seed.");
      return;
    }
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
    const passwordHash = await hashPassword(adminPassword);
    const adminUser = await storage.createAdminUser({
      username: "admin",
      email: "admin@waltontrailers.com",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      isActive: true,
      passwordHash
    });
    console.log("\u2705 Initial admin user created:");
    console.log("   Username: admin");
    console.log("   Password: [Check ADMIN_SEED_PASSWORD env var or use default]");
    console.log("   Email: admin@waltontrailers.com");
    console.log("   \u26A0\uFE0F  Please change this password on first login!");
    const standardPassword = process.env.STANDARD_SEED_PASSWORD || "user123";
    const standardPasswordHash = await hashPassword(standardPassword);
    const standardUser = await storage.createAdminUser({
      username: "employee",
      email: "employee@waltontrailers.com",
      firstName: "Standard",
      lastName: "Employee",
      role: "standard",
      isActive: true,
      passwordHash: standardPasswordHash
    });
    console.log("\u2705 Standard user created:");
    console.log("   Username: employee");
    console.log("   Password: [Check STANDARD_SEED_PASSWORD env var or use default]");
    console.log("   Email: employee@waltontrailers.com");
  } catch (error) {
    console.error("\u274C Error creating initial admin user:", error);
  }
}
if (process.env.NODE_ENV !== "production" && import.meta.url === `file://${process.argv[1]}`) {
  createInitialAdminUser().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

// server/environment-check.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";
  const requiredEnvVars = isProduction ? [] : ["DATABASE_URL"];
  const warnings = [];
  const errors = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  if (isProduction && !process.env.DATABASE_URL) {
    warnings.push("DATABASE_URL not set in production - database features will be disabled");
  }
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    warnings.push("NODE_ENV not set, defaulting to development mode");
  } else if (!["development", "production", "test"].includes(nodeEnv)) {
    warnings.push(`Invalid NODE_ENV: ${nodeEnv}. Should be 'development', 'production', or 'test'`);
  }
  const port2 = process.env.PORT;
  if (!port2) {
    warnings.push("PORT not set, defaulting to 5000");
  } else {
    const portNum = parseInt(port2, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Invalid PORT: ${port2}. Must be a number between 1 and 65535`);
    }
  }
  if (errors.length > 0) {
    console.error("Environment validation failed:");
    errors.forEach((error) => console.error(`  \u274C ${error}`));
    throw new Error("Environment validation failed");
  }
  if (warnings.length > 0) {
    log("Environment validation warnings:");
    warnings.forEach((warning) => log(`  \u26A0\uFE0F  ${warning}`));
  }
  log("\u2705 Environment validation passed");
  log(`Environment: ${nodeEnv || "development"}`);
  log(`Port: ${port2 || "5000"}`);
  log(`Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`);
}

// server/main.ts
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var app = express();
var isDevelopment = process.env.NODE_ENV !== "production";
var port = parseInt(process.env.PORT || "5000", 10);
if (!isDevelopment) {
  app.use((req, res, next) => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}
app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/healthz", (req, res) => res.status(200).send("OK"));
app.get("/ping", (req, res) => res.status(200).send("pong"));
app.get("/status", (req, res) => res.status(200).json({ status: "ok", env: process.env.NODE_ENV }));
app.get("/", (req, res, next) => {
  const acceptHeader = req.get("Accept") || "";
  if (acceptHeader.includes("application/json")) {
    return res.status(200).json({ status: "ok" });
  }
  if (!isDevelopment) {
    next();
  } else {
    next();
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
async function initializeServer() {
  try {
    validateEnvironment();
    console.log("Starting admin user setup...");
    try {
      if (process.env.NODE_ENV === "production") {
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Admin user setup timeout")), 1e4)
        );
        await Promise.race([
          createInitialAdminUser(),
          timeoutPromise
        ]);
      } else {
        await createInitialAdminUser();
      }
      console.log("Admin user setup complete");
    } catch (error) {
      console.error("Error in admin user setup:", error);
      if (process.env.NODE_ENV === "production") {
        console.log("Continuing without admin user setup due to error");
      } else {
        throw error;
      }
    }
    console.log("About to register API routes...");
    try {
      await registerRoutes(app);
      console.log("API routes registered");
    } catch (error) {
      console.error("Error registering routes:", error);
      throw error;
    }
    const server = createServer(app);
    if (isDevelopment) {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
      console.log("Vite development server configured");
    } else if (process.env.VERCEL) {
      console.log("Vercel runtime \u2014 static serving delegated to platform rewrites");
    } else {
      const possiblePaths = [
        path.join(__dirname, "public"),
        path.join(process.cwd(), "dist", "public"),
        path.join(process.cwd(), "public"),
        path.resolve("dist/public"),
        path.resolve("public")
      ];
      let staticPath = "";
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          staticPath = testPath;
          break;
        }
      }
      console.log("Production mode - Static file configuration:");
      console.log(`  __dirname: ${__dirname}`);
      console.log(`  process.cwd(): ${process.cwd()}`);
      console.log(`  Selected staticPath: ${staticPath}`);
      if (!staticPath || !fs.existsSync(staticPath)) {
        console.error("Static files not found in any of these paths:");
        possiblePaths.forEach((p) => console.log(`  - ${p}: ${fs.existsSync(p) ? "EXISTS" : "NOT FOUND"}`));
        throw new Error(`Static files not found. Run 'npm run build' first.`);
      } else {
        console.log(`  Static files found at: ${staticPath}`);
        console.log(`  Contents: ${fs.readdirSync(staticPath).join(", ")}`);
      }
      app.use(express.static(staticPath, {
        maxAge: "1d",
        etag: true,
        lastModified: true,
        index: "index.html"
        // Explicitly set index file
      }));
      app.get("*", (req, res) => {
        const indexPath = path.join(staticPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Page not found");
        }
      });
      console.log(`Serving static files from ${staticPath}`);
    }
    app.use((err, req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", {
        method: req.method,
        path: req.path,
        status,
        message: err.message,
        stack: isDevelopment ? err.stack : void 0
      });
      if (isDevelopment) {
        res.status(status).json({
          message,
          stack: err.stack
        });
      } else {
        res.status(status).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error ${status}</title>
            <style>
              body { 
                font-family: system-ui; 
                text-align: center; 
                padding: 50px;
                background: #f5f5f5;
              }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>${status === 500 ? "Server Error" : message}</h1>
            <p>${status === 500 ? "Something went wrong. Please try again later." : "The requested resource could not be found."}</p>
          </body>
          </html>
        `);
      }
    });
    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    throw error;
  }
}
async function startServer() {
  try {
    const server = await initializeServer();
    server.listen(port, "0.0.0.0", () => {
      console.log(`
========================================
Server started successfully!
Environment: ${process.env.NODE_ENV}
Port: ${port}
URL: http://localhost:${port}
Health check: http://localhost:${port}/health
========================================
      `);
    });
    const shutdown = () => {
      console.log("\nShutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    if (!isDevelopment) {
      console.log("Starting fallback health check server...");
      const fallbackApp = express();
      fallbackApp.get("/health", (req, res) => res.status(200).send("OK"));
      fallbackApp.get("/healthz", (req, res) => res.status(200).send("OK"));
      fallbackApp.get("*", (req, res) => res.status(503).send("Service Unavailable"));
      fallbackApp.listen(port, "0.0.0.0", () => {
        console.log(`Fallback server listening on port ${port}`);
      });
    } else {
      process.exit(1);
    }
  }
}
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (isDevelopment) {
    process.exit(1);
  }
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  if (isDevelopment) {
    process.exit(1);
  }
});
if (!process.env.VERCEL) {
  startServer();
}
var initPromise = null;
async function getApp() {
  if (!initPromise) {
    initPromise = initializeServer();
  }
  await initPromise;
  return app;
}

// server/lambda.ts
async function handler(req, res) {
  const app2 = await getApp();
  return app2(req, res);
}
export {
  handler as default
};
