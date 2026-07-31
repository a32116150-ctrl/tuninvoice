# Factarlou Web App — Complete AI Agent Build Guide

**Target:** Build `app.factarlou.online` — an online version of the Factarlou desktop invoicing app for Tunisian businesses.

**Agent Instructions:** Read this entire document before writing a single line of code. Follow every section in order. All decisions have already been made — your job is to execute them exactly.

---

## 0. CONTEXT — What Already Exists

### The Desktop App (DO NOT TOUCH)
- GitHub: `https://github.com/a32116150-ctrl/tuninvoice`
- Technology: Electron + SQLite (`better-sqlite3`) + plain HTML/CSS/JS
- ~16,500 lines of code across `src/renderer/app-features.js`, `src/main.js`, `src/database/db.js`
- **Deployed as a native desktop app** for macOS and Windows
- **Offline-First** — no server, no internet required for the desktop version

### The Marketing Website (MINIMAL TOUCH — one button only)
- GitHub: `https://github.com/a32116150-ctrl/factarlou`
- Technology: **Plain HTML + Tailwind CSS v4 + Vite** (NOT a framework)
- Deployed at: `https://factarlou.online` via Vercel
- **Only change to this repo:** Add one CTA button on `index.html` that points to `https://app.factarlou.online`

### The Web App (BUILD THIS)
- New GitHub repo: `factarlou-app` (create it under `a32116150-ctrl`)
- Technology: Next.js 15 (App Router) + Tailwind CSS + Supabase
- Deploy at: `https://app.factarlou.online` (new Vercel project)

---

## 1. REPOSITORIES & SETUP

### Step 1.1 — Create the GitHub Repository

```bash
# Create new repo via GitHub CLI or manually at github.com
gh repo create a32116150-ctrl/factarlou-app --public --description "Factarlou Web App — Online Invoice Management"
```

### Step 1.2 — Scaffold Next.js Project

```bash
npx create-next-app@latest factarlou-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

cd factarlou-app
```

### Step 1.3 — Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install jspdf html2canvas
npm install nodemailer
npm install uuid
npm install lucide-react
npm install zustand
npm install @types/nodemailer @types/uuid --save-dev
```

### Step 1.4 — Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY...
SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_SERVICE_ROLE_KEY...

# App
NEXT_PUBLIC_APP_URL=https://app.factarlou.online
```

Add the same variables to Vercel dashboard → Project Settings → Environment Variables.

---

## 2. SUPABASE SETUP

### Step 2.1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `factarlou`
3. Region: **EU West** (closest to Tunisia)
4. Database password: save it securely

### Step 2.2 — Run Full SQL Schema

Run this entire script in Supabase → SQL Editor → New Query:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (managed by Supabase Auth)
-- We create a matching profile table
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  company TEXT,
  mf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMPANIES
-- =============================================
CREATE TABLE IF NOT EXISTS public.companies (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  mf TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  rc TEXT,
  website TEXT,
  bank TEXT,
  rib TEXT,
  logo_image TEXT,         -- Supabase Storage public URL
  stamp_image TEXT,        -- Supabase Storage public URL
  signature_image TEXT,    -- Supabase Storage public URL
  show_logo BOOLEAN DEFAULT true,
  show_stamp BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  show_qr BOOLEAN DEFAULT false,
  show_accent BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  prefix_facture TEXT DEFAULT 'FAC',
  prefix_devis TEXT DEFAULT 'DEV',
  prefix_bon TEXT DEFAULT 'BC',
  prefix_retenue TEXT DEFAULT 'RS',
  prefix_avoir TEXT DEFAULT 'AV',
  prefix_contract TEXT DEFAULT 'CTR',
  prefix_bl TEXT DEFAULT 'BL',
  prefix_ba TEXT DEFAULT 'BA',
  prefix_bs TEXT DEFAULT 'BS',
  prefix_be TEXT DEFAULT 'BE',
  prefix_ticket TEXT DEFAULT 'TIC',
  decimal_places INTEGER DEFAULT 3,
  rounding_method TEXT DEFAULT 'half_up',  -- 'half_up' | 'ceil' | 'floor'
  document_theme TEXT,
  currency_default TEXT DEFAULT 'TND',
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,                          -- Store encrypted or hashed
  smtp_secure BOOLEAN DEFAULT false
);

-- =============================================
-- DOCUMENT THEMES
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_themes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  font_family TEXT DEFAULT '''Segoe UI'', sans-serif',
  font_size TEXT DEFAULT '14px',
  title_facture_text TEXT DEFAULT 'FACTURE',
  title_facture_color TEXT DEFAULT '#1e3a8a',
  title_devis_text TEXT DEFAULT 'DEVIS',
  title_devis_color TEXT DEFAULT '#92400e',
  title_bon_text TEXT DEFAULT 'BON DE COMMANDE',
  title_bon_color TEXT DEFAULT '#065f46'
);

-- =============================================
-- CLIENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mf TEXT,                     -- Tunisian MF format: 1234567/A/M/000
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT,                   -- JSON array string
  credit_limit REAL DEFAULT 0,
  category TEXT DEFAULT 'standard',
  rib TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FOURNISSEURS (Suppliers)
-- =============================================
CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mf TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  category TEXT DEFAULT 'standard',
  rib TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENTS (Invoices, Devis, BL, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,          -- 'facture' | 'devis' | 'bon' | 'bl' | 'ba' | 'bs' | 'be' | 'avoir' | 'ticket' | 'proforma' | 'forfaitaire'
  number TEXT NOT NULL,
  date TEXT NOT NULL,          -- YYYY-MM-DD
  due_date TEXT,               -- YYYY-MM-DD
  expiry_date TEXT,            -- YYYY-MM-DD (for devis — 30 days from date)
  currency TEXT DEFAULT 'TND', -- 'TND' | 'EUR' | 'USD'
  payment_mode TEXT,
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid' | 'paid' | 'partial'
  paid_amount REAL DEFAULT 0,
  paid_date TEXT,
  -- Snapshot of company info at invoice time
  company_name TEXT,
  company_mf TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_rc TEXT,
  -- Client info (client_id may be NULL if client deleted)
  client_id UUID,
  client_name TEXT NOT NULL,
  client_mf TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  -- Items stored as JSON
  items_json JSONB NOT NULL DEFAULT '[]',
  -- Fiscal fields
  apply_timbre BOOLEAN DEFAULT false,
  timbre_amount REAL DEFAULT 0,         -- Always 0.600 TND per Tunisian law when applied
  fodec_rate REAL DEFAULT 0,
  rounding_adjustment REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,      -- 0-100. If >0, discountAmount must be 0
  discount_amount REAL DEFAULT 0,       -- Fixed TND. If >0, discountPercent must be 0
  total_ht REAL NOT NULL DEFAULT 0,
  total_tva REAL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  -- Images (Supabase Storage URLs)
  logo_image TEXT,
  stamp_image TEXT,
  signature_image TEXT,
  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  reference_doc UUID,                   -- Source document (e.g. devis that became facture)
  is_pos BOOLEAN DEFAULT false,
  pos_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENT ITEMS (denormalized in items_json, but also normalized for queries)
-- NOTE: items_json on document is the source of truth for PDF.
-- This table is for analytics only.
-- =============================================

-- =============================================
-- DOC COUNTERS (auto-numbering per type per year)
-- =============================================
CREATE TABLE IF NOT EXISTS public.doc_counters (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, type, year)
);

-- =============================================
-- DOCUMENT TEMPLATES (saved forms)
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICES / PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL DEFAULT 0,
  tva REAL DEFAULT 19,         -- 0, 7, 13, or 19
  category TEXT,
  unit TEXT DEFAULT 'unité',
  barcode TEXT,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICE CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  reference TEXT,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RETENUES À LA SOURCE
-- =============================================
CREATE TABLE IF NOT EXISTS public.retenues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date TEXT NOT NULL,
  -- Payeur (the one withholding)
  retenuer_name TEXT NOT NULL,
  retenuer_mf TEXT,
  retenuer_address TEXT,
  retenuer_rc TEXT,
  retenuer_rep TEXT,
  retenuer_code_tva TEXT,
  retenuer_code_cat TEXT,
  retenuer_n_etab TEXT,
  -- Bénéficiaire (the one receiving payment after deduction)
  beneficiaire_name TEXT NOT NULL,
  beneficiaire_mf TEXT,
  beneficiaire_address TEXT,
  beneficiaire_rib TEXT,
  beneficiaire_cin TEXT,       -- 8-digit Tunisian CIN
  beneficiaire_code_tva TEXT,
  beneficiaire_code_cat TEXT,
  beneficiaire_n_etab TEXT,
  -- Invoice reference
  facture_id UUID,
  facture_number TEXT,
  facture_date TEXT,
  -- Amounts
  montant_brut REAL NOT NULL,
  taux_retenue REAL NOT NULL DEFAULT 1.5,  -- 0.5, 1, 1.5, 5, 10, 15, 20
  montant_retenue REAL NOT NULL,
  nature_revenu TEXT DEFAULT 'Honoraires et commissions',
  base_legale TEXT DEFAULT 'Art. 52 du Code de l''IRPP et de l''IS',
  -- Images
  logo_image TEXT,
  stamp_image TEXT,
  signature_image TEXT,
  notes TEXT,
  status TEXT DEFAULT 'emis',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXPENSES (Dépenses)
-- =============================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  vendor TEXT,
  category TEXT,
  description TEXT,
  amount_ht REAL DEFAULT 0,
  tva_rate REAL DEFAULT 0,
  amount_ttc REAL NOT NULL DEFAULT 0,
  retenue_source REAL DEFAULT 0,
  payment_method TEXT,
  reference TEXT,
  doc_type TEXT DEFAULT 'facture',
  attachment_path TEXT,        -- Supabase Storage path
  attachment_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONTRACTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  number TEXT NOT NULL,
  title TEXT,
  employer_name TEXT,
  employer_mf TEXT,
  employer_address TEXT,
  employer_rep TEXT,
  employer_rep_role TEXT,
  employee_name TEXT,
  employee_cin TEXT,
  employee_address TEXT,
  employee_role TEXT,
  employee_department TEXT,
  start_date TEXT,
  end_date TEXT,
  salary REAL,
  salary_type TEXT DEFAULT 'mensuel',
  work_hours REAL DEFAULT 40,
  work_location TEXT,
  trial_period BOOLEAN DEFAULT false,
  trial_duration TEXT,
  notice_period TEXT,
  extra_clauses TEXT,
  status TEXT DEFAULT 'brouillon',
  notes TEXT,
  signed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMPLOYEES
-- =============================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cin TEXT,
  cnss TEXT,
  role TEXT,
  department TEXT,
  hire_date TEXT,
  base_salary REAL DEFAULT 0,
  transport_allowance REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYSLIPS
-- =============================================
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  period_month INTEGER NOT NULL,  -- 1-12
  period_year INTEGER NOT NULL,
  date TEXT NOT NULL,
  base_salary REAL DEFAULT 0,
  transport_allowance REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  gross_salary REAL DEFAULT 0,
  cnss_deduction REAL DEFAULT 0,  -- 9.18% of gross
  irpp_deduction REAL DEFAULT 0,  -- Progressive IRPP brackets
  net_salary REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTES
-- =============================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  color TEXT DEFAULT '#fef9c3',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REMINDERS
-- =============================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  due_time TEXT DEFAULT '09:00',
  entity_type TEXT,
  entity_id UUID,
  done BOOLEAN DEFAULT false,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RELANCES (Payment reminders sent)
-- =============================================
CREATE TABLE IF NOT EXISTS public.relances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  attempt INTEGER DEFAULT 1,
  method TEXT DEFAULT 'pdf',
  recipient_email TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- =============================================
-- EXCHANGE RATES
-- =============================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL,
  rate REAL DEFAULT 1.0,       -- TND per 1 unit of currency
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACTIVITY LOG
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RECURRING INVOICES
-- =============================================
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID,
  client_id UUID,
  doc_type TEXT,
  day_of_month INTEGER DEFAULT 15,
  items_template JSONB,
  currency TEXT DEFAULT 'TND',
  payment_mode TEXT DEFAULT 'Virement bancaire',
  frequency TEXT NOT NULL,     -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  last_run TEXT,
  next_run TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENT TAGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_tags (
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (document_id, tag)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_docs_user_type ON public.documents(user_id, type);
CREATE INDEX IF NOT EXISTS idx_docs_client ON public.documents(user_id, client_name);
CREATE INDEX IF NOT EXISTS idx_docs_date ON public.documents(date);
CREATE INDEX IF NOT EXISTS idx_docs_status ON public.documents(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_doc ON public.payments(document_id);
CREATE INDEX IF NOT EXISTS idx_retenues_user ON public.retenues(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_services_user_cat ON public.services(user_id, category);
CREATE INDEX IF NOT EXISTS idx_services_barcode ON public.services(barcode);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);
```

### Step 2.3 — Row Level Security (RLS)

Run this in Supabase SQL Editor to ensure users only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for every table (pattern: user can only see their own rows)
-- profiles
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- companies
CREATE POLICY "Users can manage own company" ON public.companies FOR ALL USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- document_themes
CREATE POLICY "Users can manage own themes" ON public.document_themes FOR ALL USING (auth.uid() = user_id);

-- clients
CREATE POLICY "Users can manage own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);

-- fournisseurs
CREATE POLICY "Users can manage own fournisseurs" ON public.fournisseurs FOR ALL USING (auth.uid() = user_id);

-- documents
CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);

-- doc_counters
CREATE POLICY "Users can manage own counters" ON public.doc_counters FOR ALL USING (auth.uid() = user_id);

-- document_templates
CREATE POLICY "Users can manage own templates" ON public.document_templates FOR ALL USING (auth.uid() = user_id);

-- services
CREATE POLICY "Users can manage own services" ON public.services FOR ALL USING (auth.uid() = user_id);

-- service_categories
CREATE POLICY "Users can manage own service_categories" ON public.service_categories FOR ALL USING (auth.uid() = user_id);

-- payments
CREATE POLICY "Users can manage own payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- retenues
CREATE POLICY "Users can manage own retenues" ON public.retenues FOR ALL USING (auth.uid() = user_id);

-- expenses
CREATE POLICY "Users can manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);

-- contracts
CREATE POLICY "Users can manage own contracts" ON public.contracts FOR ALL USING (auth.uid() = user_id);

-- employees
CREATE POLICY "Users can manage own employees" ON public.employees FOR ALL USING (auth.uid() = user_id);

-- payslips
CREATE POLICY "Users can manage own payslips" ON public.payslips FOR ALL USING (auth.uid() = user_id);

-- notes
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- reminders
CREATE POLICY "Users can manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);

-- relances
CREATE POLICY "Users can manage own relances" ON public.relances FOR ALL USING (auth.uid() = user_id);

-- exchange_rates
CREATE POLICY "Users can manage own exchange_rates" ON public.exchange_rates FOR ALL USING (auth.uid() = user_id);

-- activity_log
CREATE POLICY "Users can manage own activity_log" ON public.activity_log FOR ALL USING (auth.uid() = user_id);

-- recurring_invoices
CREATE POLICY "Users can manage own recurring" ON public.recurring_invoices FOR ALL USING (auth.uid() = user_id);

-- document_tags (join via documents)
CREATE POLICY "Users can manage own document_tags" ON public.document_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid()));
```

### Step 2.4 — Supabase Storage Setup

Create these buckets in Supabase Storage:

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-attachments', 'expense-attachments', false);
```

```sql
-- Storage RLS policies
CREATE POLICY "Users can upload their own assets" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assets" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own assets" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 2.5 — Auto-Create Profile on Registration

```sql
-- Trigger to create profile when user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. PROJECT FILE STRUCTURE

```
factarlou-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group (no app shell)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (app)/                    # App route group (with sidebar + topbar)
│   │   │   ├── layout.tsx            # App shell layout (sidebar + topbar)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx          # Invoice list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx      # Create invoice
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # View invoice
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx  # Edit invoice
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── services/
│   │   │   │   └── page.tsx
│   │   │   ├── retenues/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx          # General settings
│   │   │       ├── company/page.tsx
│   │   │       └── email/page.tsx
│   │   ├── api/                      # Next.js API Routes (serverless)
│   │   │   ├── auth/
│   │   │   │   └── callback/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts          # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # GET, PUT, DELETE single
│   │   │   ├── clients/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── services/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── retenues/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── expenses/
│   │   │   │   └── route.ts
│   │   │   ├── settings/
│   │   │   │   └── route.ts
│   │   │   ├── email/
│   │   │   │   └── send/route.ts
│   │   │   └── dashboard/
│   │   │       └── stats/route.ts
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Root redirect → /dashboard or /login
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── invoices/
│   │   │   ├── InvoiceForm.tsx       # Main creation/edit form
│   │   │   ├── LineItems.tsx         # Dynamic line items table
│   │   │   ├── TotalsPanel.tsx       # HT/TVA/TTC totals
│   │   │   ├── ClientSelector.tsx    # Autocomplete client picker
│   │   │   └── InvoicePreview.tsx    # PDF-ready HTML preview
│   │   ├── pdf/
│   │   │   ├── InvoicePDF.tsx        # Invoice HTML template for print
│   │   │   ├── RetenuePDF.tsx        # Retenue certificate template
│   │   │   └── pdfExport.ts          # window.print() wrapper / jsPDF helper
│   │   └── dashboard/
│   │       ├── StatCard.tsx
│   │       └── RecentDocuments.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server Supabase client (for API routes)
│   │   │   └── middleware.ts         # Auth middleware helper
│   │   ├── math-utils.ts             # COPIED from desktop src/math-utils.js
│   │   ├── validate.ts               # COPIED from desktop src/validate.js
│   │   └── formatters.ts             # Date/number formatting helpers
│   ├── store/
│   │   ├── authStore.ts              # Zustand: current user state
│   │   └── settingsStore.ts          # Zustand: user settings cache
│   ├── types/
│   │   └── index.ts                  # All TypeScript types/interfaces
│   └── middleware.ts                 # Next.js middleware (auth guard)
├── public/
│   └── logo.png
├── .env.local
├── next.config.ts
└── package.json
```

---

## 4. SUPABASE CLIENT CONFIGURATION

### `src/lib/supabase/client.ts` (Browser)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts` (API Routes & Server Components)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### `src/middleware.ts` (Auth Guard)
```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 5. DESIGN SYSTEM

### Colors & Fonts

The web app must match the desktop app's visual identity exactly:

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --primary: #2563eb;         /* Blue - main actions */
  --primary-dark: #1d4ed8;
  --success: #10b981;         /* Green - paid status */
  --danger: #ef4444;          /* Red - errors, overdue */
  --warning: #f59e0b;         /* Amber - pending */
  --bg-primary: #0f172a;      /* Main background (dark mode) */
  --bg-secondary: #1e293b;    /* Card backgrounds */
  --bg-tertiary: #334155;     /* Input backgrounds */
  --border: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Light mode */
  --bg-primary-light: #ffffff;
  --bg-secondary-light: #f8fafc;
  --text-primary-light: #1e293b;
}

body {
  font-family: 'Outfit', 'Inter', system-ui, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

Google Fonts import in `src/app/layout.tsx`:
```typescript
import { Outfit } from 'next/font/google'
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '800'] })
```

### Status Badge Colors
```typescript
// Used for payment_status on invoices
const statusColors = {
  unpaid:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  paid:    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
}

// Document type badge colors
const typeColors = {
  facture:     'bg-blue-100 text-blue-800',
  devis:       'bg-purple-100 text-purple-800',
  avoir:       'bg-orange-100 text-orange-800',
  bon:         'bg-green-100 text-green-800',
  bl:          'bg-teal-100 text-teal-800',
  forfaitaire: 'bg-gray-100 text-gray-800',
}
```

---

## 6. BUSINESS LOGIC — COPY THESE EXACTLY

### `src/lib/math-utils.ts`

Copy the following logic from the desktop (translated to TypeScript):

```typescript
// CRITICAL: These calculations must be IDENTICAL to the desktop app.
// Source: desktop/src/math-utils.js

const VALID_TVA_RATES = [19, 13, 7, 0] as const;
export type TVARate = 0 | 7 | 13 | 19;

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  tva: TVARate;
  unit?: string;
}

export interface TotalsResult {
  totalHT: number;
  totalTTC: number;
  totalTVA: number;
  tvaByRate: Record<number, { baseHT: number; tvaAmount: number }>;
  tvaLines: Array<{ rate: number; baseHT: number; tvaAmount: number }>;
  timbreAmount: number;          // 0.600 TND or 0
  roundingAdjustment: number;
  discountAmount: number;
}

export interface TotalsOptions {
  applyTimbre?: boolean;         // Loi 2017-66, Art. 44: 0.600 TND per invoice
  discountPercent?: number;      // 0-100. Applied per-line BEFORE TVA
  discountAmount?: number;       // Fixed TND. Cannot use both simultaneously
  decimalPlaces?: number;        // Default 3 (Tunisian millimes)
  roundingMethod?: 'half_up' | 'ceil' | 'floor';
}

export function calculateTotals(items: InvoiceItem[], options: TotalsOptions = {}): TotalsResult {
  const {
    applyTimbre = false,
    discountPercent = 0,
    discountAmount = 0,
    decimalPlaces = 3,
    roundingMethod = 'half_up'
  } = options;

  const round = (value: number): number => {
    const factor = Math.pow(10, decimalPlaces);
    if (roundingMethod === 'ceil') return Math.ceil(value * factor) / factor;
    if (roundingMethod === 'floor') return Math.floor(value * factor) / factor;
    return Math.round(value * factor) / factor;
  };

  // First pass: compute raw HT for discount ratio
  let totalHTRawPreDiscount = 0;
  items.forEach(item => {
    totalHTRawPreDiscount += (item.quantity || 0) * (item.price || 0);
  });

  // Discount priority: percent > amount (CRITICAL: both cannot be applied simultaneously)
  let discountRatio = 0;
  if (discountPercent > 0) {
    discountRatio = discountPercent / 100;
  } else if (discountAmount > 0 && totalHTRawPreDiscount > 0) {
    discountRatio = discountAmount / totalHTRawPreDiscount;
  }

  // Second pass: apply per-line discount BEFORE TVA (Tunisian fiscal law requirement)
  let totalHTAfterDiscount = 0;
  let totalTVA = 0;
  const tvaByRate: Record<number, { baseHT: number; tvaAmount: number }> = {};

  items.forEach(item => {
    const qty = item.quantity || 0;
    const price = item.price || 0;
    const tva = VALID_TVA_RATES.includes(item.tva as any) ? item.tva : 0;
    let lineHT = qty * price;

    if (discountRatio > 0) lineHT *= (1 - discountRatio);

    totalHTAfterDiscount += lineHT;
    if (!tvaByRate[tva]) tvaByRate[tva] = { baseHT: 0, tvaAmount: 0 };
    tvaByRate[tva].baseHT += lineHT;
    tvaByRate[tva].tvaAmount += (lineHT * tva) / 100;
  });

  Object.keys(tvaByRate).forEach(rate => {
    tvaByRate[Number(rate)].baseHT = round(tvaByRate[Number(rate)].baseHT);
    tvaByRate[Number(rate)].tvaAmount = round(tvaByRate[Number(rate)].tvaAmount);
    totalTVA += tvaByRate[Number(rate)].tvaAmount;
  });

  const totalHT = round(totalHTAfterDiscount);
  totalTVA = round(totalTVA);
  const timbreAmount = applyTimbre ? 0.600 : 0;   // FIXED by Tunisian law
  const totalTTCRaw = totalHT + totalTVA + timbreAmount;
  const totalTTC = round(totalTTCRaw);
  const roundingAdj = round(totalTTC - totalTTCRaw);

  const tvaLines = Object.entries(tvaByRate)
    .filter(([_, v]) => Math.abs(v.baseHT) > 0.0001)
    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
    .sort((a, b) => b.rate - a.rate);

  return {
    totalHT,
    totalTTC,
    totalTVA,
    tvaByRate,
    tvaLines,
    timbreAmount,
    roundingAdjustment: roundingAdj,
    discountAmount: round(totalHTRawPreDiscount - totalHTAfterDiscount),
  };
}

export function calculatePayroll(grossBase: number, options: {
  transportAllowance?: number;
  otherAllowances?: number;
} = {}) {
  const { transportAllowance = 0, otherAllowances = 0 } = options;
  const totalGross = grossBase + transportAllowance + otherAllowances;

  // CNSS: 9.18% employee, 16.57% employer
  const cnssDeduction = Math.round(totalGross * 0.0918 * 1000) / 1000;
  const employerCNSS = Math.round(totalGross * 0.1657 * 1000) / 1000;

  const taxableMonthly = totalGross - cnssDeduction;
  const taxableAnnual = taxableMonthly * 12;

  // IRPP progressive brackets (Tunisian tax code)
  let irppAnnual = 0;
  if (taxableAnnual > 50000) irppAnnual += (taxableAnnual - 50000) * 0.35;
  if (taxableAnnual > 30000) irppAnnual += (Math.min(taxableAnnual, 50000) - 30000) * 0.32;
  if (taxableAnnual > 20000) irppAnnual += (Math.min(taxableAnnual, 30000) - 20000) * 0.28;
  if (taxableAnnual > 5000)  irppAnnual += (Math.min(taxableAnnual, 20000) - 5000) * 0.26;

  const irppMonthly = Math.round((irppAnnual / 12) * 1000) / 1000;
  const netSalary = Math.round((totalGross - cnssDeduction - irppMonthly) * 1000) / 1000;

  return { grossSalary: totalGross, cnssDeduction, irppDeduction: irppMonthly, netSalary, employerCNSS };
}
```

---

## 7. API ROUTES (Next.js Serverless)

### Pattern for All API Routes

```typescript
// Every API route follows this pattern:
// 1. Get Supabase server client
// 2. Get authenticated user (never trust client-side user ID)
// 3. Validate input
// 4. Execute query (RLS ensures data isolation)
// 5. Return response

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query — RLS automatically scopes to user.id
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

### `GET /api/dashboard/stats`

Returns the 6 KPIs shown on the dashboard:

```typescript
// Response shape:
{
  revenue: number,          // Total TTC of all paid factures this month
  totalInvoices: number,    // Count of all factures
  totalClients: number,     // Count of all clients
  pendingAmount: number,    // Sum of unpaid TTC
  totalExpenses: number,    // Sum of expense amount_ttc this month
  netProfit: number,        // revenue - totalExpenses
  recentDocs: Document[],   // Last 10 documents
  overdueCount: number,     // Invoices past due date and unpaid
}
```

### `GET /api/documents`

Query params:
- `type` — filter by document type
- `status` — filter by payment_status
- `q` — search in number, client_name
- `from` — date from (YYYY-MM-DD)
- `to` — date to (YYYY-MM-DD)
- `page` — pagination (default 1)
- `limit` — per page (default 20)

### `POST /api/documents`

Request body:
```json
{
  "type": "facture",
  "date": "2026-07-31",
  "clientId": "uuid",
  "clientName": "Client SARL",
  "clientMF": "1234567/A/M/000",
  "clientAddress": "Tunis, Tunisie",
  "items": [
    { "description": "Service conseil", "quantity": 10, "price": 150.000, "tva": 19, "unit": "heure" }
  ],
  "applyTimbre": true,
  "discountPercent": 0,
  "discountAmount": 0,
  "currency": "TND",
  "paymentMode": "Virement bancaire",
  "notes": "",
  "internalNotes": ""
}
```

The API route must:
1. Validate with `validateDocSave()` from `validate.ts`
2. Calculate totals with `calculateTotals()` from `math-utils.ts`
3. Auto-generate document number using `doc_counters` table
4. Snapshot company info from `companies` table into the document
5. Insert document with computed `total_ht`, `total_ttc`, `total_tva`

#### Document Number Generation Logic

```typescript
// Auto-generate sequential number per type per year
async function generateDocNumber(supabase: any, userId: string, type: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();

  // Atomic increment using Supabase RPC or upsert
  const { data } = await supabase
    .from('doc_counters')
    .upsert({ user_id: userId, type, year, last_number: 1 }, {
      onConflict: 'user_id,type,year',
      ignoreDuplicates: false,
    })
    .select();

  // Alternative: use a Postgres function for atomic increment
  // The number is formatted as: FAC-2026-0042
  const paddedNum = String(data[0].last_number).padStart(4, '0');
  return `${prefix}-${year}-${paddedNum}`;
}
```

---

## 8. INVOICE FORM — KEY BEHAVIORS

### Line Items Component

The invoice form has a dynamic line items table with these columns:
- Description (text input)
- Qty (number, min 0.001)
- Unit (dropdown: unité, heure, kg, m, m², m³, forfait)
- Prix HT (number, min 0)
- TVA % (dropdown: 19, 13, 7, 0)
- Total HT (calculated, read-only)
- Delete button

**Real-time calculation:** Every time quantity, price, or TVA changes, call `calculateTotals()` and update the totals panel instantly. No debounce for tax calculations.

### Forfaitaire Regime

When `type === 'forfaitaire'`:
- Lock ALL TVA rates to 0% (per Tunisian law)
- Show a banner: "Régime Forfaitaire — TVA non applicable"
- Disable timbre fiscal toggle
- Hide TVA column in PDF

### Discount Rules

- Only ONE of discountPercent or discountAmount can be active at a time
- If user enters discountPercent > 0, zero out discountAmount
- If user enters discountAmount > 0, zero out discountPercent
- Show error if both are non-zero

### Timbre Fiscal

- Amount is ALWAYS 0.600 TND (fixed by Tunisian law, Loi 2017-66, Art. 44)
- Show as a toggle checkbox "Appliquer le Droit de Timbre (0.600 TND)"
- Applies to: facture, bon
- Does NOT apply to: devis, avoir, bl, ba, bs, be

---

## 9. PDF GENERATION

### Approach: Print-Optimized HTML

The cleanest approach for invoices is `window.print()` with a dedicated print stylesheet. This produces pixel-perfect PDFs with no library overhead.

```typescript
// src/components/pdf/pdfExport.ts
export function printDocument(elementId: string) {
  const content = document.getElementById(elementId)?.innerHTML;
  if (!content) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Document</title>
        <style>
          /* Print styles */
          @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 12px; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          /* ... */
        </style>
      </head>
      <body>${content}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
```

### Invoice PDF Template

The PDF must include all legally required fields per Tunisian law:
- Company name, MF, address, RC, phone, email
- Client name, MF, address
- Document type label (FACTURE / DEVIS / etc.) in prominent header
- Sequential number (FAC-2026-0042)
- Date and due date
- Line items table with unit, qty, unit price HT, TVA rate, total HT
- TVA breakdown table (per rate)
- Subtotal HT, total TVA, timbre fiscal (if applicable), total TTC
- Payment mode and notes
- Legal footer text
- Company logo, signature, stamp images (if set)

### Retenue Certificate PDF

Port the HTML from `src/renderer/retenue-builder.js` exactly. The certificate has three sections:
- **Section A — Payeur** (the business withholding tax)
- **Section B — Bénéficiaire** (the recipient)
- **Section C — Montants** (amounts table with: nature du revenu, montant brut, taux, montant retenu, montant net versé)

Available withholding rates and their labels:
```typescript
const RETENUE_RATES = [
  { value: 0.5,  label: '0.5% — Importateurs (Art. 52)' },
  { value: 1,    label: '1% — Achats auprès fabricants/grossistes' },
  { value: 1.5,  label: '1.5% — Honoraires et commissions' },
  { value: 5,    label: '5% — Loyers locaux' },
  { value: 10,   label: '10% — Revenus de capitaux mobiliers' },
  { value: 15,   label: '15% — Revenus distribués non-résidents' },
  { value: 20,   label: '20% — Redevances / brevets non-résidents' },
]
```

---

## 10. AUTHENTICATION PAGES

### `/login` Page Requirements

- Full page centered layout
- Factarlou logo at top
- Email + Password inputs
- "Se connecter" button (primary, full width)
- "Mot de passe oublié?" link
- "Pas encore de compte? S'inscrire" link → `/register`
- Error state: show toast or red banner for failed login
- Loading state: disable button + spinner during request

```typescript
// Auth logic using Supabase Auth
const handleLogin = async (email: string, password: string) => {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Show error message
    return
  }
  router.push('/dashboard')
}
```

### `/register` Page Requirements

Fields:
- Full name (required)
- Email (required)
- Password (min 8 chars, required)
- Confirm password (must match)
- Company name (optional)
- Matricule Fiscal (optional, validate format `NNNNNNN/L/L/NNN`)

```typescript
const handleRegister = async (formData: RegisterData) => {
  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        company: formData.company,
        mf: formData.mf,
      }
    }
  })
  if (error) { /* show error */ return }
  // Profile is auto-created by the DB trigger
  router.push('/dashboard')
}
```

---

## 11. SIDEBAR NAVIGATION

The app shell sidebar contains these links:

```typescript
const navItems = [
  { href: '/dashboard',  icon: 'LayoutDashboard', label: 'Tableau de bord' },
  { href: '/invoices',   icon: 'FileText',        label: 'Documents',
    sub: [
      { href: '/invoices?type=facture', label: 'Factures' },
      { href: '/invoices?type=devis',   label: 'Devis' },
      { href: '/invoices?type=avoir',   label: 'Avoirs' },
      { href: '/invoices?type=bon',     label: 'Bons de commande' },
    ]
  },
  { href: '/clients',    icon: 'Users',           label: 'Clients' },
  { href: '/services',   icon: 'Package',         label: 'Produits/Services' },
  { href: '/retenues',   icon: 'Receipt',         label: 'Retenues à la source' },
  { href: '/expenses',   icon: 'TrendingDown',    label: 'Dépenses' },
  { href: '/settings',   icon: 'Settings',        label: 'Paramètres' },
]
```

Use Lucide React for all icons.

---

## 12. DASHBOARD PAGE

The dashboard shows:

### KPI Cards (6 total, in a grid)

```typescript
// Computed from /api/dashboard/stats
const cards = [
  { title: "Chiffre d'affaires (mois)", value: revenue, suffix: 'TND', icon: 'TrendingUp', color: 'blue' },
  { title: 'Factures émises', value: totalInvoices, icon: 'FileText', color: 'purple' },
  { title: 'Clients actifs', value: totalClients, icon: 'Users', color: 'green' },
  { title: 'Impayés en cours', value: pendingAmount, suffix: 'TND', icon: 'AlertCircle', color: 'red' },
  { title: 'Dépenses (mois)', value: totalExpenses, suffix: 'TND', icon: 'ShoppingCart', color: 'orange' },
  { title: 'Bénéfice net', value: netProfit, suffix: 'TND', icon: 'Wallet', color: 'teal' },
]
```

### Recent Documents Table

Last 10 documents with columns: N°, Type (badge), Client, Date, Montant TTC, Statut (badge), Actions.

### Quick Actions

- Button: "+ Nouvelle Facture" → `/invoices/new?type=facture`
- Button: "+ Nouveau Devis" → `/invoices/new?type=devis`
- Button: "+ Nouvelle Retenue" → `/retenues/new`

---

## 13. CLIENTS PAGE

### List View (`/clients`)

Table columns:
- Nom / Raison Sociale
- Matricule Fiscal
- Email
- Téléphone
- Catégorie badge (standard / premium / vip)
- Actions: View, Edit, Delete

Features:
- Search by name, MF, email
- Filter by category
- "Ajouter un client" button opens a modal (not a new page)

### Client Form Fields

```typescript
interface ClientFormData {
  name: string;         // Required
  mf?: string;          // Optional — validate format NNNNNNN/L/L/NNN
  address?: string;
  phone?: string;
  email?: string;
  rib?: string;
  category: 'standard' | 'premium' | 'vip';
  creditLimit: number;  // Default 0
  notes?: string;
  tags?: string[];
}
```

MF Validation (from `validate.ts`):
```typescript
// Valid formats: 1234567/A/M/000 OR 1234567AM000
function isMF(v: string): boolean {
  if (!v) return true; // optional
  const cleaned = v.trim().toUpperCase();
  return /^\d{7}\/[A-Z]\/[A-Z]\/\d{3}$/.test(cleaned)
      || /^\d{7}[A-Z][A-Z]\d{3}$/.test(cleaned);
}
```

---

## 14. SETTINGS PAGES

### Company Settings (`/settings/company`)

Fields:
- Nom (company name)
- Matricule Fiscal (validated)
- Adresse
- Téléphone
- Email
- Registre de Commerce
- Site web
- IBAN / RIB
- **Logo upload** → Supabase Storage bucket `company-assets/{userId}/logo.png`
- **Cachet (Stamp) upload** → Supabase Storage `company-assets/{userId}/stamp.png`
- **Signature upload** → Supabase Storage `company-assets/{userId}/signature.png`

### Document Settings (`/settings`)

Fields:
- Préfixes de numérotation per document type (FAC, DEV, BC, RS, AV, CTR, BL, BA, BS, BE)
- Décimales (0-5, default 3)
- Méthode d'arrondi (half_up / ceil / floor)
- Devise par défaut (TND / EUR / USD)

### Email Settings (`/settings/email`)

Fields:
- SMTP Host
- SMTP Port (default 587)
- SMTP User
- SMTP Password (never log this)
- SSL/TLS toggle
- "Tester la connexion" button → calls `/api/email/test`

---

## 15. EMAIL API ROUTE

### `POST /api/email/send`

```typescript
// Request body:
{
  to: string,
  subject: string,
  body: string,          // HTML or plain text
  documentId?: string,   // Will attach PDF if provided
}

// Implementation using Nodemailer:
import nodemailer from 'nodemailer'

// Get SMTP settings from user_settings table
const settings = await supabase.from('user_settings').select('smtp_*').eq('user_id', user.id).single()

const transporter = nodemailer.createTransport({
  host: settings.smtp_host,
  port: settings.smtp_port,
  secure: settings.smtp_secure,
  auth: { user: settings.smtp_user, pass: settings.smtp_pass },
})

await transporter.sendMail({ from: settings.smtp_user, to, subject, html: body })
```

---

## 16. MARKETING SITE CTA BUTTON

Only ONE change to the marketing site (`a32116150-ctrl/factarlou` repo).

Find the primary hero CTA section in `index.html` and add a secondary button:

```html
<!-- Add this button next to the existing download buttons -->
<a href="https://app.factarlou.online"
   class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-blue-500/25"
   target="_blank">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
  Essayer en ligne — Gratuit
  <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full">Nouveau</span>
</a>
```

---

## 17. VERCEL DEPLOYMENT

### Deploy the Web App

1. Push `factarlou-app` to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import `a32116150-ctrl/factarlou-app`
3. Framework Preset: **Next.js** (auto-detected)
4. Add environment variables (all from `.env.local`)
5. Deploy

### Add `app.factarlou.online` Subdomain

1. In Vercel project → Settings → Domains → Add `app.factarlou.online`
2. In your DNS provider, add a CNAME record:
   - Name: `app`
   - Value: `cname.vercel-dns.com`
3. Wait for SSL certificate (automatic, ~2 minutes)

---

## 18. VALIDATION CONSTANTS (Do Not Change)

These values are fixed by Tunisian law and must never be changed:

```typescript
// Timbre fiscal: EXACTLY 0.600 TND (Loi 2017-66, Art. 44)
export const TIMBRE_FISCAL = 0.600;

// Valid TVA rates in Tunisia
export const VALID_TVA_RATES = [19, 13, 7, 0];

// CNSS contribution rates (Tunisian social law, régime général)
export const CNSS_EMPLOYEE_RATE = 0.0918;   // 9.18%
export const CNSS_EMPLOYER_RATE = 0.1657;   // 16.57%

// IRPP progressive brackets (Tunisian tax code)
export const IRPP_BRACKETS = [
  { min: 0,     max: 5000,  rate: 0.00 },
  { min: 5000,  max: 20000, rate: 0.26 },
  { min: 20000, max: 30000, rate: 0.28 },
  { min: 30000, max: 50000, rate: 0.32 },
  { min: 50000, max: Infinity, rate: 0.35 },
];

// Tunisian MF format
export const MF_REGEX = /^\d{7}\/[A-Z]\/[A-Z]\/\d{3}$/;

// Tunisian CIN: exactly 8 digits
export const CIN_REGEX = /^\d{8}$/;

// Valid document types
export const DOC_TYPES = ['facture', 'devis', 'bon', 'bl', 'ba', 'bs', 'be', 'avoir', 'ticket', 'proforma', 'forfaitaire'];
```

---

## 19. PHASE EXECUTION ORDER

Execute in this strict order:

1. **Create GitHub repo** `factarlou-app`
2. **Scaffold Next.js project** with the exact commands in Section 1
3. **Run Supabase SQL** (schema + RLS + storage + trigger) from Section 2
4. **Create Supabase client files** (`client.ts`, `server.ts`, middleware)
5. **Build auth pages** (`/login`, `/register`) with Supabase Auth
6. **Build app shell** (sidebar + topbar layout)
7. **Build `/dashboard`** with KPI cards (mock data first, then API)
8. **Build `/api/documents`** route (CRUD)
9. **Build `/invoices`** list page
10. **Build `/invoices/new`** form with real-time tax calculations
11. **Build invoice PDF** template (print-optimized HTML)
12. **Build `/clients`** CRUD
13. **Build `/retenues`** + certificate PDF
14. **Build `/settings`** pages
15. **Add CTA button** to `factarlou.online/index.html`
16. **Deploy to Vercel** + configure `app.factarlou.online`

---

## 20. DO NOT DO THESE THINGS

- ❌ Do NOT modify any file in the `a32116150-ctrl/tuninvoice` (desktop) repo
- ❌ Do NOT change the Timbre Fiscal amount (always 0.600 TND)
- ❌ Do NOT use `innerHTML` with user-provided data (XSS risk) — always use `textContent` or escape
- ❌ Do NOT store the SMTP password in localStorage or logs
- ❌ Do NOT trust user-provided `user_id` from the request body — always use `auth.getUser()` from server
- ❌ Do NOT apply both `discountPercent` and `discountAmount` simultaneously
- ❌ Do NOT allow TVA rates other than 0, 7, 13, 19
- ❌ Do NOT skip RLS policies on any new table you create

---

## 21. TESTING CHECKLIST

Before pushing to production, verify:

- [ ] User can register with valid email + password
- [ ] User is redirected to `/dashboard` after login
- [ ] Unauthenticated user hitting `/dashboard` is redirected to `/login`
- [ ] Creating a facture with 2 line items at 19% TVA + timbre computes correct totals
- [ ] Creating a forfaitaire document locks TVA to 0%
- [ ] MF validation rejects `123/A/M` but accepts `1234567/A/M/000`
- [ ] CIN validation rejects `1234567` (7 digits) but accepts `12345678` (8 digits)
- [ ] Discount percent and discount amount cannot both be non-zero
- [ ] PDF generates correctly and shows company logo
- [ ] Email sends successfully with user's SMTP credentials
- [ ] User cannot access another user's documents (RLS test: manually test with two accounts)
- [ ] `app.factarlou.online` loads with SSL
- [ ] CTA button on `factarlou.online` homepage links to `app.factarlou.online`
