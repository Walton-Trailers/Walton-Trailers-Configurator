import express from "express";
import { createServer } from "http";
import { registerFastRoutes } from "./fast-routes";

const app = express();

// Minimal middleware for maximum performance
app.use(express.json({ limit: '1mb' }));
app.use(express.static('dist/public', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Register optimized routes
registerFastRoutes(app);

// Single catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist/public' });
});

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fast server running on port ${PORT}`);
});

export { httpServer };