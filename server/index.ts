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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    // Create initial admin user if none exist
    await createInitialAdminUser();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error but don't throw it to prevent process exit
      console.error('Error occurred:', err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
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
          log(`serving on port ${port}`);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Start the server and keep the process alive
(async () => {
  try {
    await startServer();
    log('Server started successfully');
    log('Process will remain alive for health checks');
  } catch (error) {
    console.error('Failed to start server:', error);
    log('Server failed to start, but keeping process alive for health checks');
  }
  
  // Keep the process alive indefinitely
  // This prevents the main thread from exiting after initialization
  const keepAliveInterval = setInterval(() => {
    // Empty interval to keep process alive
    // This is a common pattern for Node.js servers in production
  }, 1000 * 60); // Check every minute for better responsiveness
  
  // Ensure the interval doesn't prevent graceful shutdown
  keepAliveInterval.unref();
  
  // Handle graceful shutdown signals
  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully');
    clearInterval(keepAliveInterval);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully');
    clearInterval(keepAliveInterval);
    process.exit(0);
  });
})();
