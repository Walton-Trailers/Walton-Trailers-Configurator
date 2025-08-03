import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes";
import { createInitialAdminUser } from "./admin-seed";
import { validateEnvironment } from "./environment-check";
import fs from 'fs';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '5000', 10);

// Health check endpoints - always first
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.get('/status', (req, res) => res.status(200).json({ status: 'ok', env: process.env.NODE_ENV }));

// Root path handler - respond immediately for health checks
app.get('/', (req, res, next) => {
  const acceptHeader = req.get('Accept') || '';
  
  // JSON health check response
  if (acceptHeader.includes('application/json')) {
    return res.status(200).json({ status: 'ok' });
  }
  
  // In production, immediately serve a minimal HTML response
  if (!isDevelopment) {
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Walton Trailers</title>
  <script>window.location.href = '/index.html';</script>
</head>
<body>
  <noscript>Loading Walton Trailers...</noscript>
</body>
</html>`);
  }
  
  // In development, pass to Vite
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
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

// Initialize server
async function initializeServer() {
  try {
    // Validate environment
    validateEnvironment();
    
    // Create admin user
    console.log('Starting admin user setup...');
    try {
      // Add timeout for admin user creation in production
      if (process.env.NODE_ENV === 'production') {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Admin user setup timeout')), 10000)
        );
        await Promise.race([
          createInitialAdminUser(),
          timeoutPromise
        ]);
      } else {
        await createInitialAdminUser();
      }
      console.log('Admin user setup complete');
    } catch (error) {
      console.error('Error in admin user setup:', error);
      if (process.env.NODE_ENV === 'production') {
        console.log('Continuing without admin user setup due to error');
      } else {
        throw error;
      }
    }
    
    // Register API routes
    console.log('About to register API routes...');
    try {
      await registerRoutes(app);
      console.log('API routes registered');
    } catch (error) {
      console.error('Error registering routes:', error);
      throw error;
    }
    
    // Create HTTP server
    const server = createServer(app);
    
    // Setup static file serving
    if (isDevelopment) {
      // Development: Use Vite
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
      console.log('Vite development server configured');
    } else {
      // Production: Serve static files directly
      // In production, the server runs from the dist directory
      const staticPath = path.join(__dirname, 'public');
      
      // Verify static files exist
      if (!fs.existsSync(staticPath)) {
        throw new Error(`Static files not found at ${staticPath}. Run 'npm run build' first.`);
      }
      
      // Serve static files with caching
      app.use(express.static(staticPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        index: 'index.html'  // Explicitly set index file
      }));
      

      
      // SPA fallback for all other routes
      app.get('*', (req, res) => {
        res.sendFile('index.html', { root: staticPath });
      });
      
      console.log(`Serving static files from ${staticPath}`);
    }
    
    // Error handling middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Server error:', {
        method: req.method,
        path: req.path,
        status,
        message: err.message,
        stack: isDevelopment ? err.stack : undefined
      });
      
      if (isDevelopment) {
        res.status(status).json({ 
          message, 
          stack: err.stack 
        });
      } else {
        // Production: Send user-friendly error page
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
            <h1>${status === 500 ? 'Server Error' : message}</h1>
            <p>${status === 500 ? 'Something went wrong. Please try again later.' : 'The requested resource could not be found.'}</p>
          </body>
          </html>
        `);
      }
    });
    
    return server;
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

// Start server
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
    
    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    
    if (!isDevelopment) {
      // In production, start a minimal health check server
      console.log('Starting fallback health check server...');
      const fallbackApp = express();
      fallbackApp.get('/health', (req, res) => res.status(200).send('OK'));
      fallbackApp.get('/healthz', (req, res) => res.status(200).send('OK'));
      fallbackApp.get('*', (req, res) => res.status(503).send('Service Unavailable'));
      
      fallbackApp.listen(port, "0.0.0.0", () => {
        console.log(`Fallback server listening on port ${port}`);
      });
    } else {
      process.exit(1);
    }
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (isDevelopment) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (isDevelopment) {
    process.exit(1);
  }
});

// Start the server
startServer();