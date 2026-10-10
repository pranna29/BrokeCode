import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DEFAULT_CATEGORIES } from './src/data/defaultCategories.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026';
const IS_PROD = process.env.NODE_ENV === 'production';

// Ensure data directory exists for persistent local database storage
const DATA_DIR = path.join(__dirname, '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'spendwise_db.json');

// Memory/File-backed store structure
interface StoredData {
  users: any[];
  categories: any[];
  accounts: any[];
  transactions: any[];
  budgets: any[];
  friendBalances: any[];
}

let dbData: StoredData = {
  users: [],
  categories: [],
  accounts: [],
  transactions: [],
  budgets: [],
  friendBalances: []
};

// Load or initialize DB
function loadDb(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
    } else {
      seedDemoData();
      saveDb();
    }
  } catch (err) {
    console.error('Error reading db file, reinitializing:', err);
    seedDemoData();
    saveDb();
  }
}

function saveDb(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

// Seed demo user with realistic transactions
function seedDemoData(): void {
  const salt = bcrypt.genSaltSync(10);
  const demoUserId = 'user-demo-001';
  const hashedPassword = bcrypt.hashSync('spendwise123', salt);

  const demoUser = {
    id: demoUserId,
    email: 'demo@spendwise.com',
    password: hashedPassword,
    name: 'Alex Johnson',
    preferences: {
      currency: 'USD',
      currencySymbol: '$',
      sensitivity: 'medium',
      theme: 'light',
      monthlyBudget: 1500,
      lastSelectedAccountId: 'acc-debit-1'
    },
    createdAt: new Date().toISOString()
  };

  dbData.users = [demoUser];

  // User accounts
  dbData.accounts = [
    { id: 'acc-cash-1', userId: demoUserId, name: 'Cash', type: 'cash', balance: 120, currency: 'USD', isDefault: false },
    { id: 'acc-bank-1', userId: demoUserId, name: 'Chase Checking', type: 'bank', balance: 3450, currency: 'USD', isDefault: false },
    { id: 'acc-debit-1', userId: demoUserId, name: 'Debit Card', type: 'debit', balance: 850, currency: 'USD', isDefault: true },
    { id: 'acc-credit-1', userId: demoUserId, name: 'Credit Card', type: 'credit', balance: 2100, currency: 'USD', isDefault: false }
  ];

  // User categories from defaults
  dbData.categories = DEFAULT_CATEGORIES.map(c => ({
    ...c,
    userId: demoUserId
  }));

  // Create initial demo transactions across the current month and past weeks
  const today = new Date();
  const getPastDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const sampleTransactions = [
    {
      id: 'tx-1',
      userId: demoUserId,
      amount: 14.50,
      currency: 'USD',
      date: getPastDate(0),
      accountId: 'acc-debit-1',
      accountName: 'Debit Card',
      categoryId: 'cat-food',
      categoryName: 'Food & Dining',
      categoryEmoji: '🍔',
      categoryColor: '#f97316',
      description: 'Chipotle Burrito Bowl',
      merchant: 'Chipotle',
      customOrder: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-2',
      userId: demoUserId,
      amount: 68.20,
      currency: 'USD',
      date: getPastDate(1),
      accountId: 'acc-debit-1',
      accountName: 'Debit Card',
      categoryId: 'cat-groceries',
      categoryName: 'Groceries',
      categoryEmoji: '🛒',
      categoryColor: '#16a34a',
      description: 'Trader Joe\'s weekly haul',
      merchant: 'Trader Joe\'s',
      customOrder: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-3',
      userId: demoUserId,
      amount: 4.75,
      currency: 'USD',
      date: getPastDate(1),
      accountId: 'acc-cash-1',
      accountName: 'Cash',
      categoryId: 'cat-food',
      categoryName: 'Food & Dining',
      categoryEmoji: '🍔',
      categoryColor: '#f97316',
      description: 'Morning Oat Latte',
      merchant: 'Blue Bottle Coffee',
      customOrder: 2,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-4',
      userId: demoUserId,
      amount: 22.40,
      currency: 'USD',
      date: getPastDate(2),
      accountId: 'acc-credit-1',
      accountName: 'Credit Card',
      categoryId: 'cat-transport',
      categoryName: 'Transport',
      categoryEmoji: '🚗',
      categoryColor: '#2563eb',
      description: 'Uber ride downtown',
      merchant: 'Uber',
      customOrder: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-5',
      userId: demoUserId,
      amount: 15.99,
      currency: 'USD',
      date: getPastDate(3),
      accountId: 'acc-credit-1',
      accountName: 'Credit Card',
      categoryId: 'cat-subs',
      categoryName: 'Subscriptions',
      categoryEmoji: '📱',
      categoryColor: '#6366f1',
      description: 'Netflix Monthly',
      merchant: 'Netflix',
      customOrder: 4,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-6',
      userId: demoUserId,
      amount: 285.00,
      currency: 'USD',
      date: getPastDate(4),
      accountId: 'acc-credit-1',
      accountName: 'Credit Card',
      categoryId: 'cat-shopping',
      categoryName: 'Shopping',
      categoryEmoji: '🛍️',
      categoryColor: '#ec4899',
      description: 'Winter Jacket & Boots',
      merchant: 'Patagonia',
      customOrder: 5,
      anomaly: {
        isAnomaly: true,
        score: 88,
        severity: 'high',
        reason: 'Spend is 3.8x above your typical Shopping median of $75.00',
        baselineMedian: 75.0,
        baselineIQR: 45.0,
        reviewStatus: 'unreviewed'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-7',
      userId: demoUserId,
      amount: 45.00,
      currency: 'USD',
      date: getPastDate(5),
      accountId: 'acc-bank-1',
      accountName: 'Chase Checking',
      categoryId: 'cat-bills',
      categoryName: 'Bills & Utilities',
      categoryEmoji: '💡',
      categoryColor: '#06b6d4',
      description: 'Fiber Home Internet',
      merchant: 'Sonic Internet',
      customOrder: 6,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-8',
      userId: demoUserId,
      amount: 18.00,
      currency: 'USD',
      date: getPastDate(6),
      accountId: 'acc-debit-1',
      accountName: 'Debit Card',
      categoryId: 'cat-entertainment',
      categoryName: 'Entertainment',
      categoryEmoji: '🎬',
      categoryColor: '#a855f7',
      description: 'Cinema ticket',
      merchant: 'AMC Theatres',
      customOrder: 7,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx-9',
      userId: demoUserId,
      amount: 850.00,
      currency: 'USD',
      date: getPastDate(8),
      accountId: 'acc-bank-1',
      accountName: 'Chase Checking',
      categoryId: 'cat-housing',
      categoryName: 'Rent & Housing',
      categoryEmoji: '🏠',
      categoryColor: '#d97706',
      description: 'Monthly apartment share',
      merchant: 'Landlord Property Mgmt',
      customOrder: 8,
      createdAt: new Date().toISOString()
    }
  ];

  dbData.transactions = sampleTransactions;

  dbData.budgets = [
    { id: 'b-total', userId: demoUserId, amount: 1500, period: 'monthly' },
    { id: 'b-food', userId: demoUserId, categoryId: 'cat-food', amount: 350, period: 'monthly' },
    { id: 'b-groceries', userId: demoUserId, categoryId: 'cat-groceries', amount: 300, period: 'monthly' },
    { id: 'b-transport', userId: demoUserId, categoryId: 'cat-transport', amount: 150, period: 'monthly' }
  ];

  dbData.friendBalances = [
    { id: 'fb-1', userId: demoUserId, friendName: 'Samira Chen', amount: 32.50, notes: 'Dinner at Ramen Nagi split', lastUpdated: getPastDate(2) },
    { id: 'fb-2', userId: demoUserId, friendName: 'Marcus Cole', amount: -15.00, notes: 'Owe for concert parking', lastUpdated: getPastDate(5) }
  ];
}

loadDb();

// Attempt optional MongoDB connection if MONGODB_URI is provided
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.warn('MongoDB Atlas connection skipped / error:', err.message));
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper: Authentication Middleware
function authenticate(req: any, res: any, next: any) {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = dbData.users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or session expired.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// Generate Auth Cookie Helper
function setAuthCookie(res: any, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/'
  });
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, currency = 'USD' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = dbData.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id: userId,
    email: normalizedEmail,
    password: hashedPassword,
    name: name.trim(),
    preferences: {
      currency,
      currencySymbol: currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$',
      sensitivity: 'medium',
      theme: 'light',
      monthlyBudget: 1500,
      lastSelectedAccountId: 'acc-' + userId + '-debit'
    },
    createdAt: new Date().toISOString()
  };

  dbData.users.push(newUser);

  // Initialize default categories for new user
  const userCats = DEFAULT_CATEGORIES.map(c => ({
    ...c,
    id: 'cat-' + userId + '-' + c.id,
    userId
  }));
  dbData.categories.push(...userCats);

  // Initialize default accounts
  const userAccounts = [
    { id: 'acc-' + userId + '-cash', userId, name: 'Cash', type: 'cash', balance: 0, currency, isDefault: false },
    { id: 'acc-' + userId + '-bank', userId, name: 'Bank Account', type: 'bank', balance: 0, currency, isDefault: false },
    { id: 'acc-' + userId + '-debit', userId, name: 'Debit Card', type: 'debit', balance: 0, currency, isDefault: true },
    { id: 'acc-' + userId + '-credit', userId, name: 'Credit Card', type: 'credit', balance: 0, currency, isDefault: false }
  ];
  dbData.accounts.push(...userAccounts);

  saveDb();

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  setAuthCookie(res, token);

  const { password: _, ...safeUser } = newUser;
  return res.status(201).json({ user: safeUser, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = dbData.users.find(u => 
    u.email.toLowerCase() === normalizedEmail ||
    (normalizedEmail === 'demo@brokecode.com' && u.email.toLowerCase() === 'demo@spendwise.com')
  );
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  setAuthCookie(res, token);

  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser, token });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const { password: _, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.put('/api/auth/profile', authenticate, (req: any, res) => {
  const { name, preferences } = req.body;
  const user = dbData.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (name) user.name = name.trim();
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }
  saveDb();

  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// ==================== CATEGORIES API ====================

app.get('/api/categories', authenticate, (req: any, res) => {
  let userCats = dbData.categories.filter(c => c.userId === req.user.id);
  if (userCats.length === 0) {
    // initialize defaults if empty
    userCats = DEFAULT_CATEGORIES.map(c => ({
      ...c,
      id: 'cat-' + req.user.id + '-' + c.id,
      userId: req.user.id
    }));
    dbData.categories.push(...userCats);
    saveDb();
  }
  userCats.sort((a, b) => a.order - b.order);
  return res.json({ categories: userCats });
});

app.post('/api/categories', authenticate, (req: any, res) => {
  const { name, emoji, color } = req.body;
  if (!name || !emoji) {
    return res.status(400).json({ error: 'Category name and emoji are required.' });
  }

  const userCats = dbData.categories.filter(c => c.userId === req.user.id);
  const newCat = {
    id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: req.user.id,
    name: name.trim(),
    emoji: emoji.trim(),
    color: color || '#10b981',
    order: userCats.length,
    isCustom: true
  };

  dbData.categories.push(newCat);
  saveDb();
  return res.status(201).json({ category: newCat });
});

app.put('/api/categories/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const { name, emoji, color, order } = req.body;

  const cat = dbData.categories.find(c => c.id === id && c.userId === req.user.id);
  if (!cat) return res.status(404).json({ error: 'Category not found.' });

  const oldName = cat.name;
  const oldEmoji = cat.emoji;

  if (name !== undefined) cat.name = name.trim();
  if (emoji !== undefined) cat.emoji = emoji.trim();
  if (color !== undefined) cat.color = color;
  if (order !== undefined) cat.order = order;

  // Propagate name and emoji changes to existing transactions linked to this category ID
  if (name !== undefined || emoji !== undefined || color !== undefined) {
    dbData.transactions.forEach(t => {
      if (t.userId === req.user.id && t.categoryId === cat.id) {
        if (cat.name) t.categoryName = cat.name;
        if (cat.emoji) t.categoryEmoji = cat.emoji;
        if (cat.color) t.categoryColor = cat.color;
      }
    });
  }

  saveDb();
  return res.json({ category: cat });
});

app.delete('/api/categories/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const idx = dbData.categories.findIndex(c => c.id === id && c.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found.' });

  dbData.categories.splice(idx, 1);
  saveDb();
  return res.json({ success: true, message: 'Category removed. Historical transactions preserved.' });
});

app.post('/api/categories/reset', authenticate, (req: any, res) => {
  // Remove user categories and restore standard set
  dbData.categories = dbData.categories.filter(c => c.userId !== req.user.id);
  const resetCats = DEFAULT_CATEGORIES.map((c, i) => ({
    ...c,
    id: 'cat-' + req.user.id + '-' + c.id,
    userId: req.user.id,
    order: i
  }));
  dbData.categories.push(...resetCats);
  saveDb();
  return res.json({ categories: resetCats });
});

app.post('/api/categories/reorder', authenticate, (req: any, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required.' });
  }

  orderedIds.forEach((id, index) => {
    const cat = dbData.categories.find(c => c.id === id && c.userId === req.user.id);
    if (cat) cat.order = index;
  });

  saveDb();
  const userCats = dbData.categories.filter(c => c.userId === req.user.id).sort((a, b) => a.order - b.order);
  return res.json({ categories: userCats });
});

// ==================== ACCOUNTS API ====================

app.get('/api/accounts', authenticate, (req: any, res) => {
  let userAccounts = dbData.accounts.filter(a => a.userId === req.user.id);
  if (userAccounts.length === 0) {
    userAccounts = [
      { id: 'acc-' + req.user.id + '-cash', userId: req.user.id, name: 'Cash', type: 'cash', balance: 0, isDefault: false },
      { id: 'acc-' + req.user.id + '-bank', userId: req.user.id, name: 'Bank Account', type: 'bank', balance: 0, isDefault: false },
      { id: 'acc-' + req.user.id + '-debit', userId: req.user.id, name: 'Debit Card', type: 'debit', balance: 0, isDefault: true },
      { id: 'acc-' + req.user.id + '-credit', userId: req.user.id, name: 'Credit Card', type: 'credit', balance: 0, isDefault: false }
    ];
    dbData.accounts.push(...userAccounts);
    saveDb();
  }
  return res.json({ accounts: userAccounts });
});

app.post('/api/accounts', authenticate, (req: any, res) => {
  const { name, type = 'custom', balance = 0, currency = 'USD' } = req.body;
  if (!name) return res.status(400).json({ error: 'Account name is required.' });

  const newAcc = {
    id: 'acc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: req.user.id,
    name: name.trim(),
    type,
    balance: Number(balance) || 0,
    currency,
    isDefault: false
  };

  dbData.accounts.push(newAcc);
  saveDb();
  return res.status(201).json({ account: newAcc });
});

app.put('/api/accounts/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const { name, type, balance, isDefault } = req.body;

  const acc = dbData.accounts.find(a => a.id === id && a.userId === req.user.id);
  if (!acc) return res.status(404).json({ error: 'Account not found.' });

  if (name !== undefined) acc.name = name.trim();
  if (type !== undefined) acc.type = type;
  if (balance !== undefined) acc.balance = Number(balance);
  if (isDefault) {
    dbData.accounts.filter(a => a.userId === req.user.id).forEach(a => { a.isDefault = false; });
    acc.isDefault = true;
  }

  saveDb();
  return res.json({ account: acc });
});

app.delete('/api/accounts/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const idx = dbData.accounts.findIndex(a => a.id === id && a.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Account not found.' });

  dbData.accounts.splice(idx, 1);
  saveDb();
  return res.json({ success: true, message: 'Account removed.' });
});

// ==================== STATISTICAL ANOMALY DETECTION ====================

function detectTransactionAnomaly(
  userId: string,
  amount: number,
  categoryId: string,
  merchant?: string,
  dateStr?: string
): any {
  // Category IQR + MAD calculations
  const history = dbData.transactions
    .filter(t => t.userId === userId && t.categoryId === categoryId && typeof t.amount === 'number' && t.amount > 0)
    .map(t => t.amount)
    .sort((a, b) => a - b);

  let isAnomaly = false;
  let score = 0;
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let reason = '';
  let median = 0;
  let iqr = 0;

  if (history.length >= 3) {
    const mid = Math.floor(history.length / 2);
    median = history.length % 2 !== 0 ? history[mid] : (history[mid - 1] + history[mid]) / 2;

    const q1Idx = Math.floor(history.length * 0.25);
    const q3Idx = Math.floor(history.length * 0.75);
    const q1 = history[q1Idx];
    const q3 = history[q3Idx];
    iqr = Math.max(q3 - q1, median * 0.2, 5);

    const upperBound = q3 + (1.75 * iqr);

    if (amount > upperBound && amount > median * 1.5) {
      isAnomaly = true;
      const ratio = amount / Math.max(median, 1);
      score = Math.min(Math.round((ratio - 1) * 35 + 50), 98);

      if (ratio > 4.0) severity = 'critical';
      else if (ratio > 2.5) severity = 'high';
      else severity = 'medium';

      reason = `Amount of $${amount.toFixed(2)} is ${ratio.toFixed(1)}x above your historical median of $${median.toFixed(2)}`;
    }
  }

  // 24-hour Merchant Burst Check (e.g. duplicate charges or rapid bursts)
  if (merchant && dateStr) {
    const txDate = new Date(dateStr).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sameMerchantRecent = dbData.transactions.filter(t => {
      if (t.userId !== userId) return false;
      if (!t.merchant || t.merchant.toLowerCase() !== merchant.toLowerCase()) return false;
      const diff = Math.abs(new Date(t.date).getTime() - txDate);
      return diff <= oneDayMs;
    });

    if (sameMerchantRecent.length >= 2) {
      isAnomaly = true;
      score = Math.max(score, 75);
      if (severity === 'low') severity = 'medium';
      reason = reason
        ? `${reason} + High frequency burst (${sameMerchantRecent.length + 1} charges at ${merchant} within 24h)`
        : `Frequency alert: ${sameMerchantRecent.length + 1} charges at ${merchant} in 24 hours`;
    }
  }

  if (isAnomaly) {
    return {
      isAnomaly: true,
      score,
      severity,
      reason,
      baselineMedian: median,
      baselineIQR: iqr,
      reviewStatus: 'unreviewed'
    };
  }
  return undefined;
}

// ==================== EXPENSES / TRANSACTIONS API ====================

app.get('/api/expenses', authenticate, (req: any, res) => {
  const { categoryId, accountId, search, sort = 'newest', startDate, endDate, anomalyOnly } = req.query;

  let list = dbData.transactions.filter(t => t.userId === req.user.id);

  if (categoryId) {
    list = list.filter(t => t.categoryId === categoryId);
  }
  if (accountId) {
    list = list.filter(t => t.accountId === accountId);
  }
  if (anomalyOnly === 'true') {
    list = list.filter(t => t.anomaly && t.anomaly.isAnomaly);
  }
  if (startDate) {
    list = list.filter(t => t.date >= startDate);
  }
  if (endDate) {
    list = list.filter(t => t.date <= endDate);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(t =>
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.merchant && t.merchant.toLowerCase().includes(q)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
      (t.accountName && t.accountName.toLowerCase().includes(q)) ||
      String(t.amount).includes(q)
    );
  }

  // Sorting
  switch (sort) {
    case 'oldest':
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case 'highest':
      list.sort((a, b) => b.amount - a.amount);
      break;
    case 'lowest':
      list.sort((a, b) => a.amount - b.amount);
      break;
    case 'custom':
      list.sort((a, b) => (a.customOrder ?? 0) - (b.customOrder ?? 0));
      break;
    case 'newest':
    default:
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  return res.json({ transactions: list });
});

app.post('/api/expenses', authenticate, (req: any, res) => {
  const {
    amount,
    accountId,
    categoryId,
    description = '',
    merchant = '',
    date = new Date().toISOString().split('T')[0],
    receiptUrl
  } = req.body;

  const parsedAmount = Math.round(Number(amount) * 100) / 100;
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Valid amount greater than zero is required.' });
  }
  if (!accountId) {
    return res.status(400).json({ error: 'Payment account is required.' });
  }
  if (!categoryId) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  const account = dbData.accounts.find(a => a.id === accountId && a.userId === req.user.id);
  const category = dbData.categories.find(c => c.id === categoryId && c.userId === req.user.id);

  const accountName = account ? account.name : 'Default Account';
  const categoryName = category ? category.name : 'General';
  const categoryEmoji = category ? category.emoji : '💸';
  const categoryColor = category ? category.color : '#64748b';

  // Remember this account as last selected in user preferences
  const user = dbData.users.find(u => u.id === req.user.id);
  if (user) {
    user.preferences.lastSelectedAccountId = accountId;
  }

  // Check anomaly
  const anomaly = detectTransactionAnomaly(
    req.user.id,
    parsedAmount,
    categoryId,
    merchant || description,
    date
  );

  const userTxCount = dbData.transactions.filter(t => t.userId === req.user.id).length;

  const newTx = {
    id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: req.user.id,
    amount: parsedAmount,
    currency: req.user.preferences?.currency || 'USD',
    date,
    accountId,
    accountName,
    categoryId,
    categoryName,
    categoryEmoji,
    categoryColor,
    description: description ? description.trim() : undefined,
    merchant: merchant ? merchant.trim() : undefined,
    receiptUrl,
    customOrder: userTxCount,
    anomaly,
    createdAt: new Date().toISOString()
  };

  dbData.transactions.push(newTx);
  saveDb();

  return res.status(201).json({ transaction: newTx });
});

app.put('/api/expenses/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const {
    amount,
    accountId,
    categoryId,
    description,
    merchant,
    date
  } = req.body;

  const tx = dbData.transactions.find(t => t.id === id && t.userId === req.user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

  if (amount !== undefined) {
    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (parsedAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });
    tx.amount = parsedAmount;
  }

  if (accountId !== undefined) {
    tx.accountId = accountId;
    const acc = dbData.accounts.find(a => a.id === accountId && a.userId === req.user.id);
    if (acc) tx.accountName = acc.name;
  }

  if (categoryId !== undefined) {
    tx.categoryId = categoryId;
    const cat = dbData.categories.find(c => c.id === categoryId && c.userId === req.user.id);
    if (cat) {
      tx.categoryName = cat.name;
      tx.categoryEmoji = cat.emoji;
      tx.categoryColor = cat.color;
    }
  }

  if (description !== undefined) tx.description = description ? description.trim() : undefined;
  if (merchant !== undefined) tx.merchant = merchant ? merchant.trim() : undefined;
  if (date !== undefined) tx.date = date;

  // Re-evaluate anomaly on edit
  tx.anomaly = detectTransactionAnomaly(
    req.user.id,
    tx.amount,
    tx.categoryId,
    tx.merchant || tx.description,
    tx.date
  );

  saveDb();
  return res.json({ transaction: tx });
});

app.delete('/api/expenses/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const idx = dbData.transactions.findIndex(t => t.id === id && t.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found.' });

  const deleted = dbData.transactions.splice(idx, 1)[0];
  saveDb();
  return res.json({ success: true, transaction: deleted });
});

// Reorder endpoint for drag-and-drop
app.post('/api/expenses/reorder', authenticate, (req: any, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required.' });
  }

  orderedIds.forEach((id, index) => {
    const tx = dbData.transactions.find(t => t.id === id && t.userId === req.user.id);
    if (tx) {
      tx.customOrder = index;
    }
  });

  saveDb();
  return res.json({ success: true });
});

// ==================== RECEIPT OCR HEURISTIC & PARSER API ====================

app.post('/api/receipts/parse-text', authenticate, (req: any, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text content required.' });
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract amount: look for total, subtotal, balance keywords or highest currency match
  let detectedAmount = 0;
  let detectedMerchant = '';
  let detectedDate = '';
  let suggestedCategory = 'cat-food';

  const amountRegex = /(?:total|amount|bal|balance|due|paid|charge|usd|\$|€|£)\s*[:=]?\s*[$€£]?\s*([0-9]+[.,][0-9]{2})/gi;
  const genericAmountRegex = /[$€£]\s*([0-9]+[.,][0-9]{2})|([0-9]+[.,][0-9]{2})/g;

  // Search lines from bottom to top for "Total"
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = amountRegex.exec(line);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        detectedAmount = val;
        break;
      }
    }
  }

  // If no "total" keyword line found, pick candidate amounts
  if (detectedAmount === 0) {
    const candidateAmounts: number[] = [];
    for (const line of lines) {
      let m;
      while ((m = genericAmountRegex.exec(line)) !== null) {
        const valStr = m[1] || m[2];
        const val = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(val) && val > 0 && val < 5000) {
          candidateAmounts.push(val);
        }
      }
    }
    if (candidateAmounts.length > 0) {
      detectedAmount = Math.max(...candidateAmounts);
    }
  }

  // Merchant detection: usually the top 1-3 lines
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
    if (firstLine.length >= 3 && firstLine.length <= 40) {
      detectedMerchant = firstLine;
    } else if (lines.length > 1) {
      detectedMerchant = lines[1].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
    }
  }

  // Date detection: looking for MM/DD/YYYY or YYYY-MM-DD or DD/MM/YYYY
  const dateRegex = /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;
  for (const line of lines) {
    const match = dateRegex.exec(line);
    if (match && match[1]) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        detectedDate = parsed.toISOString().split('T')[0];
        break;
      }
    }
  }

  // Category heuristic
  const fullLower = text.toLowerCase();
  if (fullLower.includes('market') || fullLower.includes('grocery') || fullLower.includes('trader') || fullLower.includes('kroger') || fullLower.includes('whole foods')) {
    suggestedCategory = 'cat-groceries';
  } else if (fullLower.includes('fuel') || fullLower.includes('gas') || fullLower.includes('uber') || fullLower.includes('lyft') || fullLower.includes('transit')) {
    suggestedCategory = 'cat-transport';
  } else if (fullLower.includes('pharmacy') || fullLower.includes('rx') || fullLower.includes('health') || fullLower.includes('cvs') || fullLower.includes('walgreens')) {
    suggestedCategory = 'cat-healthcare';
  } else if (fullLower.includes('target') || fullLower.includes('walmart') || fullLower.includes('amazon') || fullLower.includes('store')) {
    suggestedCategory = 'cat-shopping';
  } else if (fullLower.includes('cafe') || fullLower.includes('coffee') || fullLower.includes('restaurant') || fullLower.includes('bistro') || fullLower.includes('grill') || fullLower.includes('pizza') || fullLower.includes('burger')) {
    suggestedCategory = 'cat-food';
  }

  // Duplicate receipt detection against user's recent transactions
  let duplicateWarning = false;
  if (detectedAmount > 0) {
    const recentDuplicates = dbData.transactions.filter(t => {
      if (t.userId !== req.user.id) return false;
      const sameAmount = Math.abs(t.amount - detectedAmount) < 0.01;
      const sameMerchant = detectedMerchant && t.merchant && t.merchant.toLowerCase() === detectedMerchant.toLowerCase();
      return sameAmount && (sameMerchant || (detectedDate && t.date === detectedDate));
    });
    if (recentDuplicates.length > 0) {
      duplicateWarning = true;
    }
  }

  return res.json({
    amount: detectedAmount > 0 ? detectedAmount : undefined,
    merchant: detectedMerchant || undefined,
    date: detectedDate || new Date().toISOString().split('T')[0],
    suggestedCategory,
    duplicateWarning
  });
});

// ==================== BUDGETS API ====================

app.get('/api/budgets', authenticate, (req: any, res) => {
  const budgets = dbData.budgets.filter(b => b.userId === req.user.id);
  return res.json({ budgets });
});

app.post('/api/budgets', authenticate, (req: any, res) => {
  const { categoryId, amount, period = 'monthly' } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid budget amount required.' });

  const existingIdx = dbData.budgets.findIndex(b => b.userId === req.user.id && b.categoryId === categoryId);
  const budgetObj = {
    id: existingIdx !== -1 ? dbData.budgets[existingIdx].id : 'b-' + Date.now(),
    userId: req.user.id,
    categoryId: categoryId || undefined,
    amount: Number(amount),
    period
  };

  if (existingIdx !== -1) {
    dbData.budgets[existingIdx] = budgetObj;
  } else {
    dbData.budgets.push(budgetObj);
  }

  saveDb();
  return res.json({ budget: budgetObj });
});

// ==================== ANOMALIES & AUDIT API ====================

app.get('/api/anomalies', authenticate, (req: any, res) => {
  const anomalies = dbData.transactions
    .filter(t => t.userId === req.user.id && t.anomaly && t.anomaly.isAnomaly)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return res.json({ anomalies });
});

app.post('/api/anomalies/:id/feedback', authenticate, (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'confirmed', 'expected', 'dismissed'

  const tx = dbData.transactions.find(t => t.id === id && t.userId === req.user.id);
  if (!tx || !tx.anomaly) return res.status(404).json({ error: 'Anomaly not found.' });

  tx.anomaly.reviewStatus = status;
  saveDb();
  return res.json({ success: true, transaction: tx });
});

// ==================== GROUPS & SPLIT EXPENSES API ====================

app.get('/api/groups', authenticate, (req: any, res) => {
  const balances = dbData.friendBalances.filter(fb => fb.userId === req.user.id);
  return res.json({ friendBalances: balances });
});

app.post('/api/groups/split', authenticate, (req: any, res) => {
  const { friendName, amount, isOwed, notes } = req.body;
  if (!friendName || !amount) return res.status(400).json({ error: 'Friend name and amount required.' });

  const numAmount = (isOwed ? 1 : -1) * Math.abs(Number(amount));
  const existing = dbData.friendBalances.find(fb => fb.userId === req.user.id && fb.friendName.toLowerCase() === friendName.toLowerCase().trim());

  if (existing) {
    existing.amount += numAmount;
    existing.lastUpdated = new Date().toISOString().split('T')[0];
    if (notes) existing.notes = notes;
  } else {
    dbData.friendBalances.push({
      id: 'fb-' + Date.now(),
      userId: req.user.id,
      friendName: friendName.trim(),
      amount: numAmount,
      notes,
      lastUpdated: new Date().toISOString().split('T')[0]
    });
  }

  saveDb();
  const balances = dbData.friendBalances.filter(fb => fb.userId === req.user.id);
  return res.json({ friendBalances: balances });
});

app.post('/api/groups/settle/:id', authenticate, (req: any, res) => {
  const { id } = req.params;
  const fb = dbData.friendBalances.find(f => f.id === id && f.userId === req.user.id);
  if (!fb) return res.status(404).json({ error: 'Balance record not found.' });

  fb.amount = 0;
  fb.notes = 'Settled';
  fb.lastUpdated = new Date().toISOString().split('T')[0];
  saveDb();
  return res.json({ success: true, friendBalance: fb });
});

// ==================== ANALYTICS SUMMARY API ====================

app.get('/api/analytics/summary', authenticate, (req: any, res) => {
  const userTxs = dbData.transactions.filter(t => t.userId === req.user.id);
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTxs = userTxs.filter(t => t.date.startsWith(currentYearMonth));
  const currentMonthTotal = currentMonthTxs.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryTotals: Record<string, { name: string; emoji: string; color: string; total: number; count: number }> = {};
  currentMonthTxs.forEach(t => {
    if (!categoryTotals[t.categoryId]) {
      categoryTotals[t.categoryId] = {
        name: t.categoryName,
        emoji: t.categoryEmoji,
        color: t.categoryColor,
        total: 0,
        count: 0
      };
    }
    categoryTotals[t.categoryId].total += t.amount;
    categoryTotals[t.categoryId].count += 1;
  });

  // Daily totals for calendar
  const dailyTotals: Record<string, number> = {};
  userTxs.forEach(t => {
    dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
  });

  // Highest spending day in current month
  let highestDay = '';
  let highestAmount = 0;
  Object.entries(dailyTotals).forEach(([day, total]) => {
    if (day.startsWith(currentYearMonth) && total > highestAmount) {
      highestAmount = total;
      highestDay = day;
    }
  });

  const unreviewedAnomaliesCount = userTxs.filter(t => t.anomaly?.isAnomaly && t.anomaly.reviewStatus === 'unreviewed').length;

  return res.json({
    currentMonthTotal,
    transactionCount: currentMonthTxs.length,
    categoryBreakdown: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
    dailyTotals,
    highestDay,
    highestAmount,
    unreviewedAnomaliesCount
  });
});

// ==================== STATIC / VITE INTEGRATION ====================

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpendWise server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
