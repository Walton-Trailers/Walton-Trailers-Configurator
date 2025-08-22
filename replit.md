# Walton Trailers Configurator

## Overview

This is a Tesla-style trailer configurator application for Walton Trailers, designed to provide a premium user experience for configuring and purchasing commercial trailers. The application features a modern, clean UI that directly mirrors Tesla's Model 3 configurator layout with a left image panel and right configuration panel. The design uses Tesla's signature minimalist aesthetic with clean typography, subtle borders, and precise spacing.

## Project Milestones

### First Successful Deployment (August 3, 2025)
- Successfully deployed to Replit platform after resolving critical deployment issues
- Key fixes that enabled deployment:
  - Flexible static file path resolution supporting multiple deployment environments
  - Proper handling of root path requests without JavaScript redirects
  - Robust error handling for database initialization in production
  - All health check endpoints returning 200 status codes

### Image Management System (August 15, 2025)
- Implemented comprehensive image upload system for model management
- Added visual thumbnail previews (48x48px) in dedicated Image column in admin tables
- Integrated object storage with Replit's storage service for file uploads
- Enhanced ObjectUploader component with replacement flow for existing images
- When clicking existing image thumbnails, shows modal with clear replacement indication

### Airtable Integration (August 16, 2025)
- Added new Integrations tab in admin dashboard for managing third-party services
- Implemented Airtable API integration using Personal Access Tokens (recommended authentication method)
- Created secure configuration dialog with token and base ID input fields
- Added connection testing functionality with real-time validation
- Included helpful links to Airtable Developer Hub for token generation
- Prepared foundation for data sync operations between Airtable and database

### Category Image Upload Fix (August 22, 2025)
- Fixed critical image upload issue where images weren't being saved correctly
- Created dedicated `/api/categories/:id/image` endpoint for proper image handling
- Backend now properly normalizes upload URLs and sets public ACL policies
- Removed problematic orderIndex field from schema that was causing database errors
- Image uploads now work consistently across both pricing management and fast pricing pages

### UI Updates (August 22, 2025)
- Changed "Order Now" button text to "Proceed" in the configurator for clearer user flow
- Button appears when moving from model configuration to the summary step

### Configurations Overview Tab (August 18, 2025)
- Added new Configurations tab to admin dashboard for viewing all saved trailer configurations
- Displays comprehensive feed of configurations from both dealers and public users
- Includes source identification badges (blue for dealer, grey for public)
- Shows dealer name and ID for dealer configurations, session ID for public configurations
- Displays customer information, category, model details, pricing, and status
- Provides at-a-glance overview of all configuration activity across the platform
- Enables admin oversight of both dealer and public configurator usage

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo structure with a simplified, deployment-first architecture. The frontend is built with React and TypeScript, utilizing Vite for development. The backend uses a unified Express.js server (main.ts) that handles both development and production environments seamlessly. Data persistence is managed with PostgreSQL and Drizzle ORM. UI components are built with Shadcn/ui and styled using Tailwind CSS. State management leverages TanStack Query for server state and custom hooks for local state.

### Deployment Architecture (Updated: August 3, 2025)
- **Single Server Entry Point**: `server/main.ts` handles both development and production
- **No Symlinks**: Direct static file serving from `dist/public` in production
- **Simple Build Process**: Frontend builds to `dist/public`, server builds to `dist/index.js`
- **Environment-Based Configuration**: Clear separation between dev (Vite) and prod (static) modes
- **Health Check Endpoints**: `/health`, `/healthz`, `/ping`, `/status` for deployment verification
- **Flexible Path Resolution**: Server searches multiple paths for static files to handle different deployment environments
- **Production Logging**: All requests logged in production for debugging
- **Successfully Deployed**: Application successfully deployed on Replit platform with all health checks passing

### Frontend Architecture
- **UI Framework**: Shadcn/ui components for consistent, accessible UI elements.
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes.
- **State Management**: Custom `useConfigurator` hook manages multi-step configuration state.
- **Navigation**: Wouter for lightweight client-side routing.
- **Forms**: React Hook Form with Zod validation for type-safe form handling.
- **UI/UX Decisions**: Tesla's Model 3 configurator layout (left image panel, right configuration panel), clean typography, subtle borders, precise spacing, and a clean white aesthetic.

### Backend Architecture
- **API Layer**: RESTful Express.js server with structured route handlers.
- **Data Layer**: Storage abstraction with in-memory implementation for development, and Drizzle ORM with PostgreSQL for production.
- **Middleware**: Request logging, JSON parsing, and error handling.

### Database Schema
The application uses four main database tables: `trailer_categories`, `trailer_models`, `trailer_options`, and `user_configurations`.

### Data Flow
The configuration process involves category selection, model selection, customization of options, summary review, and persistence of the configuration. TanStack Query is used for efficient data fetching and caching with dedicated API endpoints for categories, models by category, specific model details, and customization options.

## External Dependencies

### UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Framer Motion**: Animation library.
- **Lucide React**: Icon library.

### Data and State
- **TanStack Query**: Server state management and caching.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL.
- **Zod**: Schema validation.

### Development Tools
- **Vite**: Fast development server and build tool.
- **TypeScript**: Type safety.
- **ESBuild**: Fast JavaScript bundler.