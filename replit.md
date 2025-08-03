# Walton Trailers Configurator

## Overview

This is a Tesla-style trailer configurator application for Walton Trailers, designed to provide a premium user experience for configuring and purchasing commercial trailers. The application features a modern, clean UI that directly mirrors Tesla's Model 3 configurator layout with a left image panel and right configuration panel. The design uses Tesla's signature minimalist aesthetic with clean typography, subtle borders, and precise spacing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo structure with a simplified, deployment-first architecture. The frontend is built with React and TypeScript, utilizing Vite for development. The backend uses a unified Express.js server (main.ts) that handles both development and production environments seamlessly. Data persistence is managed with PostgreSQL and Drizzle ORM. UI components are built with Shadcn/ui and styled using Tailwind CSS. State management leverages TanStack Query for server state and custom hooks for local state.

### Deployment Architecture (Updated: January 3, 2025)
- **Single Server Entry Point**: `server/main.ts` handles both development and production
- **No Symlinks**: Direct static file serving from `dist/public` in production
- **Simple Build Process**: Frontend builds to `dist/public`, server builds to `dist/server.js`
- **Environment-Based Configuration**: Clear separation between dev (Vite) and prod (static) modes
- **Health Check Endpoints**: `/health`, `/healthz`, `/ping`, `/status` for deployment verification

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