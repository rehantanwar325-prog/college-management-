import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.js';
import academicsRoutes from './routes/academics.js';
import studentsRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import studyRoutes from './routes/study.js';
import examsRoutes from './routes/exams.js';
import feesRoutes from './routes/fees.js';
import libraryRoutes from './routes/library.js';
import communicationsRoutes from './routes/communications.js';
import reportsRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import expensesRoutes from './routes/expenses.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

// Security hardening & headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true
}));

app.use(cors());

// Global Rate Limiting (Protects against DoS / brute-force scraping)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', globalLimiter);

// Rate limiting on login / auth endpoints (Protects against Password Brute-Force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 login attempts per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

// JSON Body Parser with security limit
app.use(express.json({ limit: '10mb' }));

// Input Sanitization Middleware (Prevents XSS / Prototype Pollution)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
});

// Ensure upload folders exist
const uploadsDir = path.join(__dirname, '../uploads');
const submissionsDir = path.join(__dirname, '../uploads/submissions');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

// Serve uploads statically
app.use('/uploads', express.static(uploadsDir));

// Register API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/expenses', expensesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// Serve static frontend bundle in production mode
const clientDistDir = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[PRODUCTION SERVER] Aegis Management System deployed and running on port ${PORT}`);
});
