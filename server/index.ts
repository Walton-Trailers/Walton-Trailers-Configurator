import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createInitialAdminUser } from "./admin-seed";

// Global error handlers to prevent process exit
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process
});

const app = express();

// Dedicated health check endpoints - must be first before any middleware
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Walton Trailers Configurator',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Additional health check at root for deployment systems that expect it
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Walton Trailers Configurator',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Simple root route handler for deployment health checks
app.get('/', (req, res, next) => {
  // Simple health check detection - deployment systems usually send simple requests
  const userAgent = req.get('User-Agent') || '';
  const acceptHeader = req.get('Accept') || '';
  
  // Simplified health check detection for faster response
  const isHealthCheck = 
    acceptHeader.includes('application/json') ||
    userAgent === '' ||
    userAgent.toLowerCase().includes('replit') ||
    userAgent.toLowerCase().includes('healthcheck');
  
  if (isHealthCheck) {
    return res.status(200).json({ status: 'ok' });
  }
  
  // For browser requests, continue to the React app
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Async function to initialize and start the server
async function startServer() {
  try {
    log('Initializing server...');
    
    // Create initial admin user if none exist
    await createInitialAdminUser();
    log('Admin user setup complete');
    
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    // Setup vite/static serving before starting the server
    if (app.get("env") === "development") {
      log('Setting up Vite for development...');
      await setupVite(app, server);
      log('Vite setup complete');
    } else {
      log('Setting up static file serving for production...');
      serveStatic(app);
      log('Static file serving setup complete');
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error but don't throw it to prevent process exit
      console.error('Error occurred:', err);
      res.status(status).json({ message });
    });

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    log(`Starting server on port ${port}...`);
    
    return new Promise<void>((resolve, reject) => {
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, (err?: Error) => {
        if (err) {
          console.error('Failed to start server:', err);
          reject(err);
        } else {
          log(`Server listening on port ${port}`);
          log('Health check endpoints: /health, /healthz, /');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Simplified keep-alive mechanism
let keepAliveInterval: NodeJS.Timeout;

// Handle graceful shutdown signals
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  process.exit(0);
});

// Start the server and keep the process alive
(async () => {
  try {
    await startServer();
    log('Server started successfully');
    log('Process will remain alive for health checks');
    
    // Simple keep-alive mechanism
    keepAliveInterval = setInterval(() => {
      // Keep process alive for health checks
    }, 30000); // Check every 30 seconds
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit with error code if server fails to start
  }
})();
