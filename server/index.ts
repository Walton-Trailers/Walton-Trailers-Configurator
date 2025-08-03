import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createInitialAdminUser } from "./admin-seed";
import { validateEnvironment } from "./environment-check";

const app = express();

// Simple health check endpoints that respond immediately
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/status', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
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

    // Setup vite/static serving
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
      console.error('Error occurred:', err);
      res.status(status).json({ message });
    });

    // Serve the React app on any unmatched routes (moved from root)
    app.get('/app/*', (req, res, next) => {
      // React app routes - let Vite/static serving handle these
      next();
    });

    // Start server
    const port = parseInt(process.env.PORT || '5000', 10);
    log(`Starting server on port ${port}...`);
    
    server.listen(port, "0.0.0.0", () => {
      log(`Server listening on port ${port}`);
      log('Health check endpoints: /health, /healthz, /ping, /status');
      log('Server ready to handle requests');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Start the server
(async () => {
  try {
    validateEnvironment();
    await startServer();
    log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
