# Walton Trailers Configurator

## Overview

This is a Tesla-style trailer configurator application for Walton Trailers, designed to provide a premium user experience for configuring and purchasing commercial trailers. The application features a modern, clean UI that directly mirrors Tesla's Model 3 configurator layout with a left image panel and right configuration panel. The design uses Tesla's signature minimalist aesthetic with clean typography, subtle borders, and precise spacing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo structure with clear separation of concerns:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **UI Framework**: Shadcn/ui components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state and custom hooks for local state

## Key Components

### Frontend Architecture
- **Component Structure**: Uses shadcn/ui components for consistent, accessible UI elements
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes
- **State Management**: Custom `useConfigurator` hook manages the multi-step configuration state
- **Navigation**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **API Layer**: RESTful Express.js server with structured route handlers
- **Data Layer**: Storage abstraction with in-memory implementation for development
- **Database**: Drizzle ORM with PostgreSQL for production data persistence
- **Middleware**: Request logging, JSON parsing, and error handling

### Database Schema
The application uses four main database tables:
- `trailer_categories`: Product categories (gooseneck, dump, tilt, etc.)
- `trailer_models`: Specific trailer models with specifications and pricing
- `trailer_options`: Configurable options for each model (tires, ramps, colors, etc.)
- `user_configurations`: Saved user configurations for quotes and persistence

## Data Flow

1. **Category Selection**: User selects from available trailer categories
2. **Model Selection**: System fetches and displays models for the selected category
3. **Customization**: User configures options specific to the chosen model
4. **Summary**: Final configuration review with pricing and quote generation
5. **Persistence**: Configuration saved to database and local storage

The application uses TanStack Query for efficient data fetching and caching, with API endpoints for:
- `/api/categories` - Fetch all trailer categories
- `/api/categories/:slug/models` - Get models by category
- `/api/models/:id` - Get specific model details
- `/api/models/:id/options` - Get customization options

## External Dependencies

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom theme variables
- **Framer Motion**: Animation library for smooth transitions (indicated by usage)
- **Lucide React**: Modern icon library

### Data and State
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Zod**: Schema validation for forms and API data

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR (Hot Module Replacement)
- Express server with `tsx` for TypeScript execution
- Database migrations managed through Drizzle Kit

### Production
- Frontend built with Vite and served as static assets
- Backend bundled with ESBuild for optimized Node.js execution
- PostgreSQL database with Neon serverless for scalability
- Environment variables for database connections and configuration

### Build Process
1. `npm run build` - Builds frontend and bundles backend
2. Frontend assets output to `dist/public`
3. Backend bundle output to `dist/index.js`
4. Database schema pushed via `npm run db:push`

The application is designed to be deployed on platforms like Replit, with specific configurations for development tooling and runtime error handling in the Replit environment.

## Recent Changes

### July 24, 2025 - Tesla-Style Layout Redesign
- **Complete UI Overhaul**: Redesigned the entire configurator to match Tesla's Model 3 configurator layout exactly
- **Split-Screen Layout**: Implemented left image panel (50% width) with right configuration panel (50% width) 
- **Tesla Design Language**: Updated colors, typography, and spacing to match Tesla's clean aesthetic
- **Single Page Flow**: Consolidated all configurator steps into one page with step-by-step content switching
- **Modern Header**: Implemented Tesla-style fixed header with progress indicators and pricing display
- **Clean Cards**: Redesigned all selection cards with Tesla's signature minimal border and hover effects
- **Light Mode Default**: Changed from dark industrial theme to Tesla's clean white aesthetic
- **Streamlined Code**: Simplified the configurator to use a single component instead of multiple separate components
- **Real-time Updates**: Enhanced image switching and price calculations with smooth transitions