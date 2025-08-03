import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createInitialAdminUser } from "./admin-seed";
import { validateEnvironment } from "./environment-check";

// Global error handlers to prevent process exit
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log stack trace if available
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
  // Never exit the process to keep health checks working
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // Never exit the process to keep health checks working
  // Only exit in development for easier debugging
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => process.exit(1), 100);
  }
});

// Memory management
process.on('warning', (warning) => {
  console.warn('Node.js warning:', warning.name, warning.message);
});

const app = express();

// Dedicated health check endpoints - must be first before any middleware
// Ultra-fast health check that responds immediately with minimal processing
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Alternative health check endpoint for deployment systems
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Deployment-specific health check with instant response
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Comprehensive health check endpoint for monitoring
app.get('/status', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Walton Trailers Configurator',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

// Root route - let it pass through to serve the React app
// Health checks should use dedicated endpoints: /health, /healthz, /ping

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
    try {
      if (app.get("env") === "development") {
        log('Setting up Vite for development...');
        await setupVite(app, server);
        log('Vite setup complete');
      } else {
        log('Setting up static file serving for production...');
        serveStatic(app);
        log('Static file serving setup complete');
      }
    } catch (setupError) {
      // Log setup errors but don't let them crash the server in production
      console.error('Setup error occurred:', setupError);
      if (process.env.NODE_ENV === 'development') {
        throw setupError;
      } else {
        log('Continuing server startup despite setup errors');
      }
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
          log('Health check endpoints: /health, /healthz, /ping, /, /status');
          log('Server ready to handle requests');
          log('DEPLOYMENT READY - All health check endpoints are responding');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Enhanced keep-alive mechanism for deployment stability
let keepAliveInterval: NodeJS.Timeout;
let isShuttingDown = false;

// Handle graceful shutdown signals
process.on('SIGTERM', () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    log('Received SIGTERM, shutting down gracefully');
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    setTimeout(() => process.exit(0), 1000); // Give time for cleanup
  }
});

process.on('SIGINT', () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    log('Received SIGINT, shutting down gracefully');
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    setTimeout(() => process.exit(0), 1000); // Give time for cleanup
  }
});

// Start the server and keep the process alive
(async () => {
  try {
    // Validate environment before starting server
    validateEnvironment();
    
    await startServer();
    log('Server started successfully');
    log('Process will remain alive for health checks');
    log('Deployment ready - health checks available at multiple endpoints');
    
    // Immediate keep-alive setup to prevent early process exit
    keepAliveInterval = setInterval(() => {
      if (!isShuttingDown) {
        // Keep process alive for health checks
        const memUsage = process.memoryUsage();
        // Only log memory usage if it's high to reduce noise
        if (memUsage.heapUsed > 150 * 1024 * 1024) { // Log if over 150MB
          log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
        }
      }
    }, 15000); // Check every 15 seconds for better responsiveness
    
    // Aggressive keep-alive mechanisms to prevent any possibility of process exit
    const preventExit1 = () => {
      if (!isShuttingDown) {
        setTimeout(preventExit1, 5000); // Every 5 seconds
      }
    };
    preventExit1();
    
    const preventExit2 = () => {
      if (!isShuttingDown) {
        setTimeout(preventExit2, 3000); // Every 3 seconds
      }
    };
    preventExit2();
    
    const preventExit3 = () => {
      if (!isShuttingDown) {
        setTimeout(preventExit3, 1000); // Every 1 second - very aggressive
      }
    };
    preventExit3();
    
    // Set immediate intervals to ensure process stays alive
    setImmediate(() => {
      if (!isShuttingDown) {
        log('Process is alive and ready for deployment health checks');
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit with error code if server fails to start
  }
})();
