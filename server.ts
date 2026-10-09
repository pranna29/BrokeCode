import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, getConnectionStatus } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import expenseRoutes from './server/routes/expenses.js';
import anomalyRoutes from './server/routes/anomalies.js';
import analyticsRoutes from './server/routes/analytics.js';
import { errorHandler } from './server/middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Global Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check and DB status
app.get('/api/health', (_req, res) => {
  const dbStatus = getConnectionStatus();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    database: dbStatus,
    version: '1.0.0',
    service: 'BrokeCode API Engine',
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/analytics', analyticsRoutes);

// Centralized Error Handling for API routes
app.use('/api', errorHandler);

async function startServer() {
  try {
    // Connect to MongoDB Atlas (or in-memory MongoDB fallback)
    await connectDB();

    if (!isProduction) {
      // Development mode: Mount Vite dev server middleware
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite development server middleware mounted.');
    } else {
      // Production mode: Serve pre-built static assets
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('Production static files configured.');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`BrokeCode Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start BrokeCode server:', error);
    process.exit(1);
  }
}

startServer();
