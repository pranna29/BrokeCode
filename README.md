# BrokeCode — Personal Expense Anomaly Detector

> **Production-minded, full-stack MERN application for college students & young professionals to detect unusual spending spikes, phantom subscriptions, and budget anomalies using explainable statistical models.**

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Features](#core-features)
4. [Anomaly Detection Engine & Mathematics](#anomaly-detection-engine--mathematics)
5. [Database Schema Documentation](#database-schema-documentation)
6. [REST API Documentation](#rest-api-documentation)
7. [Getting Started & Local Setup](#getting-started--local-setup)
8. [Database Setup (MongoDB Atlas & Embedded)](#database-setup-mongodb-atlas--embedded)
9. [Environment Variables](#environment-variables)
10. [Automated Testing Suite](#automated-testing-suite)
11. [Cross-Platform Packaging (PWA, Capacitor, Electron)](#cross-platform-packaging)
12. [Security, Ownership & Privacy Controls](#security-ownership--privacy-controls)
13. [Deployment to Cloud Run / Docker](#deployment-to-cloud-run--docker)
14. [Feature Roadmap](#feature-roadmap)

---

## 1. Project Overview

College students and early-career professionals often suffer from "financial leakage" — small, frequent expenses punctuated by sudden surprise spikes (textbooks, surge pricing, emergency repairs, or accidental recurring SaaS charges). Traditional budgeting apps only offer static monthly buckets and reactive end-of-month charts.

**BrokeCode** implements an **explainable statistical anomaly detection engine** directly into a full-stack **MERN** (MongoDB, Express, React, Node.js) platform. Every transaction is audited in real-time against category-specific historical spending baselines, merchant visit histories, and short-term velocity bursts without relying on costly black-box AI APIs.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BROKECODE FULL-STACK ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLIENT LAYER (React 19 + TypeScript + Vite + Tailwind CSS)                │
│   ├── Responsive Web Dashboard & Anomaly Audit Workbench                    │
│   ├── PWA Service Worker (VitePWA) + Offline Caching + In-App Install       │
│   ├── Lightweight SVG Charting Engine (Trend Areas, Category Bars)          │
│   └── Multi-Device Support (Desktop, Tablet, iOS/Android PWA)               │
│                                      │                                      │
│                                      │ HTTPS / REST (JWT Bearer Token)      │
│                                      ▼                                      │
│   SERVER LAYER (Node.js + Express.js + tsx/TypeScript)                      │
│   ├── Authentication Middleware (bcryptjs password hashing + JWT)          │
│   ├── Tenant Isolation: User ID enforced on all queries                     │
│   ├── CSV Parsing (PapaParse / Streaming) + Duplicate Detection Engine      │
│   └── AnomalyDetectorService:                                               │
│       ├── Robust Median & Interquartile Range (IQR = Q3 - Q1)               │
│       ├── Median Absolute Deviation (MAD) for zero-variance protection      │
│       ├── Frequency Burst Detector (24h merchant velocity)                  │
│       └── Explainable Metrics (Precision, Recall, F1 Benchmarking)          │
│                                      │                                      │
│                                      ▼                                      │
│   DATABASE LAYER (MongoDB Atlas via Mongoose ODM)                           │
│   ├── Compound Indexes: { userId: 1, date: -1 }, { userId: 1, category: 1 }│
│   ├── Collections: users, expenses                                          │
│   └── Resilient Fallback: Embedded MongoMemoryServer for instant zero-config│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Features

1. **Dashboard & Spend Velocity**:
   - Monthly spend vs. monthly budget allowance with dynamic runway calculations.
   - Live spending trend area chart showing historical spend and anomaly markers.
   - Real-time unreviewed anomaly alert banner with one-click audit routing.
2. **Personalized Anomaly Detection Centre**:
   - Explainable statistical cards displaying transaction vs. median, IQR, and upper bounds.
   - Calibratable sensitivity slider (`Low`, `Medium`, `High`) with on-demand recalculation across historical records.
   - User feedback loop: Classify alerts as **Expected Purchase**, **Confirmed Anomaly**, or **Dismiss Alert** without corrupting baseline.
3. **Full Expense Management (CRUD)**:
   - Amounts, currencies, dates, merchants, categories, subcategories, payment methods, recurring indicators, and user tags.
   - Multi-field search, category filters, outlier toggles, date ranges, and sorting.
   - Bulk selection and deletion.
4. **CSV Import & Export Engine**:
   - Smart column auto-mapping (Date, Merchant, Amount, Category).
   - In-flight duplicate detection (flags identical amount + merchant within ±6 hours).
   - Batch anomaly scoring during import.
   - Filtered CSV exports by category and date ranges.
5. **Measurable Evaluation Metrics**:
   - Standardized ground truth synthetic benchmark calculating Precision, Recall, F1-Score, and False Positive Rate.
   - User feedback precision tracking.
6. **Student Demo Dataset Generator**:
   - 1-click synthetic generator injecting 35+ realistic student transactions (dining, campus cafeteria, transit, subscriptions) with labelled anomalies (textbooks, surge rides, unintended SaaS bills).
7. **PWA & Cross-Platform Ready**:
   - Installable PWA with manifest, standalone display mode, maskable and Apple touch icons, in-app install buttons, and offline banners.
8. **Calculator-Style Mobile Transaction Entry**:
   - Ultra-compact calculator popup with prominent currency display and 3-column numeric keypad (`7 8 9`, `4 5 6`, `1 2 3`, `. 0 ⌫`).
   - Four primary fields: Amount, Payment Account, Category Emoji Grid, and optional Description.
   - Decimal-safe monetary calculations with physical keyboard and keypad support.
9. **Persistent Authenticated Sessions**:
   - 30-day persistent sessions using Secure, HttpOnly cookies with `credentials: 'include'`.
   - Automatic session restoration on refresh/reopen without repeated login prompts.
   - Explicit logout option in Settings and navbar.
10. **Bill & Receipt Scanning (OCR)**:
   - Built-in camera capture and JPG, PNG, PDF receipt upload via client-side Tesseract OCR.
   - Extracts amount, merchant, date, currency, and suggests category with duplicate detection.
   - Mandatory approval flow: Opens calculator popup with extracted data prefilled for user confirmation.
11. **Swipe Actions & Drag-and-Drop Reordering**:
   - Mobile touch gestures: Swipe right to Edit, Swipe left to Delete (with confirmation/undo).
   - Desktop and touch drag-and-drop manual transaction reordering with persistent MongoDB order storage (`/api/expenses/reorder`).
   - Accessible Move Up/Down controls and sort presets (`Newest First`, `Oldest First`, `Highest Amount`, `Lowest Amount`, `Custom Order`).
12. **Customizable Emoji Categories**:
   - 14 predefined standard categories with emoji icons and consistent color indicators.
   - Settings category management: Add, rename, custom emoji picker, color palette, safe deletion, and ordering.
   - Historical transactions preserved upon category deletion.
13. **Refined Brand Palette Authentication**:
   - Dedicated authentication design utilizing Light Greige (`#E0DDDA`), Dark Charcoal (`#2B2B2B`), and Forest Green (`#0B6121`) preserving the original custom brand logo.

---

## 4. Anomaly Detection Engine & Mathematics

### Statistical Formulation

1. **Category Median & Interquartile Range (IQR)**:
   For sorted category transaction amounts $X = [x_1, x_2, \dots, x_n]$:
   - Median: $Q_2 = \text{percentile}(X, 50)$
   - First Quartile: $Q_1 = \text{percentile}(X, 25)$
   - Third Quartile: $Q_3 = \text{percentile}(X, 75)$
   - Interquartile Range: $\text{IQR} = Q_3 - Q_1$

2. **Zero-Variance & Scale Protection**:
   If $\text{IQR} = 0$ (e.g. repeated fixed charges like $15 subscriptions), the engine computes the **Median Absolute Deviation (MAD)**:
   $$\text{MAD} = \text{median}(|x_i - Q_2|)$$
   If $\text{MAD} > 0$, $\text{scale} = 1.4826 \times \text{MAD}$; otherwise defaults to $\max(0.25 \times Q_2, 2.0)$.

3. **Dynamic Anomaly Threshold**:
   $$\text{UpperBound} = Q_3 + (k \times \text{IQR})$$
   where multiplier $k$ adapts to user preference:
   - **Low Sensitivity**: $k = 2.50$ (flags only extreme outliers)
   - **Medium Sensitivity**: $k = 1.75$ (standard statistical baseline)
   - **High Sensitivity**: $k = 1.25$ (sensitive to moderate surges)

4. **Velocity / Burst Alert**:
   If 2 or more transactions occur at the exact same merchant within 24 hours, an immediate velocity alert is triggered regardless of category sample size.

5. **Sparse Data Fallback**:
   When category history has fewer than $N$ items (default: 5), the system checks cross-category median before flagging to prevent false positives for new users.

---

## 5. Database Schema Documentation

### Collection: `users`

```typescript
{
  _id: ObjectId,
  email: String (unique, lowercase, indexed),
  password: String (bcrypt hash),
  name: String,
  currency: String (default: 'USD'),
  monthlyBudget: Number (default: 800),
  preferences: {
    sensitivity: 'low' | 'medium' | 'high',
    minHistoryCount: Number (default: 5),
    excludedCategories: [String],
    theme: 'light' | 'dark' | 'system',
    currencySymbol: String,
    notificationsEnabled: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `expenses`

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  amount: Number (positive),
  currency: String,
  date: Date (indexed),
  merchant: String (indexed),
  category: String (indexed),
  subcategory: String,
  description: String,
  paymentMethod: 'card' | 'cash' | 'upi' | 'bank_transfer' | 'crypto' | 'other',
  isRecurring: Boolean,
  tags: [String],
  anomalyStatus: {
    isAnomaly: Boolean (indexed),
    score: Number (0 - 100),
    severity: 'low' | 'medium' | 'high' | 'critical',
    method: String,
    explanation: String,
    baseline: {
      median: Number,
      iqr: Number,
      q1: Number,
      q3: Number,
      lowerBound: Number,
      upperBound: Number,
      historicalCount: Number,
      merchantAvg: Number
    },
    detectedAt: Date,
    reviewStatus: 'unreviewed' | 'confirmed_anomaly' | 'expected_purchase' | 'dismissed',
    userFeedback: String,
    reviewedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1, date: -1 }`
- `{ userId: 1, category: 1 }`
- `{ userId: 1, 'anomalyStatus.isAnomaly': 1, 'anomalyStatus.reviewStatus': 1 }`
- `{ userId: 1, merchant: 1 }`

---

## 6. REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create new user account.
- `POST /api/auth/login` - Authenticate with email & password, receives JWT.
- `GET /api/auth/me` - Fetch authenticated user profile.
- `PUT /api/auth/profile` - Update name, currency, monthly budget, sensitivity.
- `DELETE /api/auth/account` - Permanently wipe account and cascade all transactions.
- `GET /api/auth/export-data` - Export complete user profile and expenses as JSON.

### Expenses (`/api/expenses`)
- `GET /api/expenses` - Paginated expenses with search, category, anomaly, and sort filters.
- `POST /api/expenses` - Record single transaction (real-time anomaly scoring).
- `GET /api/expenses/:id` - Fetch single transaction (strictly isolated to owner).
- `PUT /api/expenses/:id` - Update transaction (re-scores anomaly status).
- `DELETE /api/expenses/:id` - Delete single transaction.
- `POST /api/expenses/bulk-delete` - Bulk delete by array of IDs.
- `POST /api/expenses/import-csv` - Parse and ingest CSV with duplicate suppression.
- `GET /api/expenses/export-csv` - Download filtered CSV file.
- `POST /api/expenses/seed-demo` - Load synthetic demo dataset.

### Anomaly Centre (`/api/anomalies`)
- `GET /api/anomalies` - List flagged outliers with severity and review status filters.
- `POST /api/anomalies/:id/feedback` - Submit user audit classification and notes.
- `POST /api/anomalies/recalculate` - Re-evaluate all transactions against current sensitivity.
- `GET /api/anomalies/metrics` - Precision, recall, and benchmark F1 statistics.

### Analytics (`/api/analytics`)
- `GET /api/analytics/summary` - Total spend, budget runway, and unreviewed count.
- `GET /api/analytics/monthly-trends` - Multi-month spend trajectory.
- `GET /api/analytics/category-breakdown` - Category distributions and outlier frequencies.
- `GET /api/analytics/merchant-insights` - Top merchants, visit counts, and averages.

### Health Check (`/api/health`)
- `GET /api/health` - Health status and active Mongoose connection state.

---

## 7. Getting Started & Local Setup

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/brokecode.git
cd brokecode

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Running Locally

```bash
# Start full-stack development server (Express + Vite)
npm run dev
```

Open your browser to: `http://localhost:3000`

---

## 8. Database Setup (MongoDB Atlas & Embedded)

### Option A: MongoDB Atlas (Production)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Database User with read/write credentials.
3. In Network Access, allow your IP address or `0.0.0.0/0` for cloud deployment.
4. Copy the connection URI and update `.env`:
   ```bash
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/brokecode?retryWrites=true&w=majority"
   ```

### Option B: Automatic Embedded MongoDB (Local / Zero-Config)
If `MONGODB_URI` is omitted from `.env`, BrokeCode automatically launches an embedded **MongoMemoryServer** instance. All Mongoose schemas, queries, indexes, and document methods execute identically without requiring an external database setup!

---

## 9. Environment Variables

| Variable | Description | Default | Required in Prod |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas connection string | Embedded Mongo | Yes |
| `JWT_SECRET` | Secret key for signing authentication tokens | Built-in fallback | Yes |
| `PORT` | HTTP port for server | `3000` | No |
| `NODE_ENV` | Environment (`development` \| `production`) | `development` | Yes |
| `GEMINI_API_KEY` | Optional server-side explanation key | None | No |
| `APP_URL` | Application canonical URL | Autodetected | No |

---

## 10. Automated Testing Suite

BrokeCode includes unit test suites for the statistical anomaly engine and integration evaluation benchmarks.

```bash
# Run tests using Vitest
npm test
```

Test coverage includes:
- Normal transactions within baseline boundaries.
- Severe category-specific IQR outliers.
- Category-specific variance (e.g. rent vs dining).
- Sparse history normalization.
- Zero-variance handling (identical recurring costs).
- Sensitivity adjustments (Low vs High).
- Merchant frequency burst velocity alerts.
- Evaluation metrics calculation (Precision, Recall, F1).

---

## 11. Cross-Platform Packaging

### Progressive Web App (PWA)
BrokeCode is fully PWA-compliant out of the box:
- Service Worker precaches all core scripts and assets via `vite-plugin-pwa`.
- Web App Manifest specifies standalone mode, icons (192px, 512px, maskable), and brand colors.
- In-app install button handles Chrome/Edge/Android native prompts and provides guided iOS Safari instructions.

### Future Mobile Packaging (Capacitor)
To package for iOS & Android with Capacitor:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init BrokeCode com.brokecode.app --web-dir dist
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

### Future Desktop Packaging (Electron)
To package for macOS, Windows, and Linux:
```bash
npm install -D electron electron-builder
# Point main in package.json to electron entry
```

---

## 12. Security, Ownership & Privacy Controls

- **No Plaintext Passwords**: Passwords hashed with `bcryptjs` (salt rounds: 10).
- **Strict Tenant Isolation**: All database queries explicitly filter by `userId: req.userId`. Users cannot inspect or manipulate other accounts.
- **Data Portability**: Instant unencrypted export of all user transactions and account preferences in JSON or CSV.
- **Right to Erasure**: Self-service permanent account deletion cascades and deletes all related expenses from MongoDB.

---

## 13. Deployment to Cloud Run / Docker

### Building for Production
```bash
npm run build
npm start
```

### Dockerfile Example
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

---

## 14. Feature Roadmap

- [x] Full-Stack MERN Architecture with Express and Mongoose
- [x] Robust Statistical IQR & MAD Anomaly Detection
- [x] Merchant Velocity / Frequency Burst Alerts
- [x] User Review & Feedback Loop
- [x] CSV Import with Column Mapping & Duplicate Prevention
- [x] Filtered CSV Export
- [x] Installable PWA with iOS Safari Guided Prompt & Offline Indicator
- [x] 1-Click Synthetic Student Demo Dataset Seeder
- [x] Automated Vitest Unit & Integration Suites
- [ ] Push Notifications for instant anomaly alerts
- [ ] Direct Open Banking / Plaid bank account sync
- [ ] Capacitor native mobile builds on App Store & Google Play
