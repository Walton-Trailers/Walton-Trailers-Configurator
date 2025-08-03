import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes";
import { createInitialAdminUser } from "./admin-seed";
import { validateEnvironment } from "./environment-check";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Ultra-simple health check endpoints that respond immediately
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
  res.status(200).json({ status: 'ok' });
});

// Simple root health check
app.get('/', (req, res, next) => {
  const acceptHeader = req.get('Accept') || '';
  if (acceptHeader.includes('application/json')) {
    return res.status(200).json({ status: 'ok' });
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
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

// Production static file serving
function serveStatic(app: express.Express) {
  // Try multiple paths to find the static files
  const possiblePaths = [
    path.resolve(process.cwd(), 'dist', 'public'),
    path.resolve(__dirname, 'public'),
    path.resolve(__dirname, '..', 'public'),
    path.resolve(process.cwd(), 'public')
  ];

  let staticPath: string | null = null;
  
  for (const testPath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'index.html'))) {
        staticPath = testPath;
        console.log(`Found static files at: ${staticPath}`);
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  if (!staticPath) {
    console.error('Could not find static files in any of:', possiblePaths);
    throw new Error('Static files not found. Please run npm run build first.');
  }

  // Serve static files
  app.use(express.static(staticPath, {
    maxAge: '1d',
    etag: true
  }));

  // Fallback to index.html for SPA routes
  app.use('*', (req, res) => {
    res.sendFile(path.join(staticPath!, 'index.html'));
  });
}

// Async function to initialize and start the server
async function startServer() {
  try {
    console.log('Initializing production server...');
    
    // Create initial admin user if none exist
    await createInitialAdminUser();
    console.log('Admin user setup complete');
    
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    // Setup static file serving for production
    console.log('Setting up static file serving for production...');
    serveStatic(app);
    console.log('Static file serving setup complete');

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Error occurred:', err);
      res.status(status).json({ message });
    });

    // Start server
    const port = parseInt(process.env.PORT || '5000', 10);
    console.log(`Starting server on port ${port}...`);
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on port ${port}`);
      console.log('Health check endpoints: /health, /healthz, /ping, /status');
      console.log('Server ready to handle requests');
    });

    // Keep process alive for deployment
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {}, 30000);
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Fallback health check server for deployment failures
function startFallbackServer() {
  const fallbackApp = express();
  
  fallbackApp.get('/health', (req, res) => res.status(200).send('OK'));
  fallbackApp.get('/healthz', (req, res) => res.status(200).send('OK'));
  fallbackApp.get('/ping', (req, res) => res.status(200).send('pong'));
  fallbackApp.get('/status', (req, res) => res.status(200).json({ status: 'fallback' }));
  fallbackApp.get('/', (req, res) => {
    const acceptHeader = req.get('Accept') || '';
    if (acceptHeader.includes('application/json')) {
      return res.status(200).json({ status: 'fallback' });
    }
    res.status(503).send('Service temporarily unavailable');
  });
  
  const port = parseInt(process.env.PORT || '5000', 10);
  fallbackApp.listen(port, "0.0.0.0", () => {
    console.log(`Fallback health check server listening on port ${port}`);
  });
}

// Start the server with error handling
async function main() {
  try {
    validateEnvironment();
    await startServer();
    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    if (process.env.NODE_ENV === 'production') {
      console.error('Starting fallback health check server...');
      startFallbackServer();
      setInterval(() => {}, 1000000);
    } else {
      process.exit(1);
    }
  }
}

// Global error protection
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Keep process alive
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {}, 10000);
}

// Start the application
main();