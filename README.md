# Matanuska Tariff Management System

A streamlined Tariff Management System with Supabase integration that enables automated monthly rate adjustments based on diesel price fluctuations.

## Features

### 🎯 Core Functionality

- **Master Control Panel** - Centralized diesel price management and tariff calculation engine
- **Automated Rate Adjustments** - Calculate and apply rate changes based on diesel price fluctuations
- **Client Management** - Comprehensive client profiles with customized route pricing
- **Document Storage** - Secure repository for SLAs, contracts, and credit applications
- **Tariff History** - Complete historical record of all pricing changes

### 📊 Key Features

- Real-time diesel price tracking with historical trends
- Automatic calculation of rate adjustments using configurable diesel impact percentages
- Month-to-month pricing history maintenance
- Cascading price updates from Master Control Panel to individual client rate cards
- Document expiry tracking and alerts
- Export functionality for reports

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/matanuska-tariffs.git
   cd matanuska-tariffs
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase/schema.sql` in the SQL Editor
   - Run `supabase/fix_rls_policies.sql` to configure Row Level Security policies
   - Optionally run `supabase/seed.sql` to populate sample data
   - Create a storage bucket named `documents` for file uploads

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Supabase credentials:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open the application**
   Navigate to `http://localhost:3000`

## Project Structure

```
matanuska-tariffs/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Layout.tsx           # Main application layout
│   ├── context/
│   │   └── SupabaseContext.tsx  # Authentication context
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   └── utils.ts             # Utility functions
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── MasterControlPanel.tsx # Diesel & tariff control
│   │   ├── Clients.tsx          # Client listing
│   │   ├── ClientDetail.tsx     # Individual client view
│   │   ├── Routes.tsx           # Route management
│   │   ├── TariffHistory.tsx    # Historical records
│   │   ├── Documents.tsx        # Document management
│   │   ├── Settings.tsx         # System settings
│   │   └── Login.tsx            # Authentication
│   ├── types/
│   │   └── database.ts          # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── schema.sql               # Database schema
│   └── seed.sql                 # Sample data
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Database Schema

### Core Tables

- **diesel_prices** - Monthly diesel price records
- **clients** - Client company information
- **routes** - Transportation routes
- **client_routes** - Client-specific route pricing
- **tariff_history** - Historical rate changes
- **documents** - Document metadata
- **master_control_settings** - System configuration

### Key Relationships

```
clients (1) ──< (many) client_routes
routes (1) ──< (many) client_routes
client_routes (1) ──< (many) tariff_history
clients (1) ──< (many) documents
```

## Rate Calculation

The system uses a configurable formula to calculate rate adjustments:

```
New Rate = Base Rate × (1 + Diesel Change % × Diesel Impact %)
```

**Example:**

- Base Rate: R 4,500
- Diesel Price Change: +5%
- Diesel Impact Factor: 35%
- Rate Adjustment: 5% × 35% = 1.75%
- New Rate: R 4,500 × 1.0175 = R 4,578.75

## Configuration

Key settings in the Master Control Panel:

| Setting               | Default | Description                          |
| --------------------- | ------- | ------------------------------------ |
| Base Diesel Price     | R 21.50 | Reference price for calculations     |
| Diesel Impact %       | 35%     | How much diesel affects tariffs      |
| Auto-Adjust Threshold | 2.5%    | Minimum change to trigger adjustment |
| Max Monthly Increase  | 10%     | Rate increase cap                    |
| Rounding Precision    | 2       | Decimal places                       |

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding New Features

1. Create new page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout.tsx`
4. Create any new types in `src/types/database.ts`

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for all data access
- Secure document storage with Supabase Storage
- Session management with automatic token refresh

## License

This project is licensed under the MIT License.

---

Built with ❤️ for Matanuska Transport
