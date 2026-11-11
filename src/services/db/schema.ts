/**
 * DDL SQL et Seed Initial pour SQLite Embarqué — GERETOU
 * 12 tables relationnelles avec contraintes d'intégrité strictes.
 */

export const SCHEMA_SQL = `
-- Table 1: users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    pin_hash TEXT NOT NULL,
    biometric_enabled INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('WAVE', 'MOMO', 'ORANGE', 'CASH', 'BANK', 'VAULT')),
    sub_type TEXT NOT NULL DEFAULT 'MAIN' CHECK (sub_type IN ('MAIN', 'VAULT', 'SAVINGS')),
    balance REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'FCFA',
    is_archived INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Table 3: categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'BOTH')),
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    account_id TEXT NOT NULL,
    destination_account_id TEXT,
    category_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    nature TEXT NOT NULL DEFAULT 'REGULAR' CHECK (nature IN ('REGULAR', 'UNEXPECTED', 'REIMBURSABLE')),
    urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    provenance TEXT,
    date TIMESTAMP NOT NULL,
    notes TEXT,
    receipt_uri TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);

-- Table 5: budgets
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('DAY', 'MONTH', 'YEAR')),
    category_id TEXT,
    limit_amount REAL NOT NULL,
    alert_threshold REAL NOT NULL DEFAULT 0.80,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Table 6: stocks
CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_qty REAL NOT NULL DEFAULT 0.0,
    unit TEXT NOT NULL,
    min_threshold REAL NOT NULL DEFAULT 1.0,
    estimated_unit_price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_stocks_user ON stocks(user_id);

-- Table 7: grocery_items
CREATE TABLE IF NOT EXISTS grocery_items (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL,
    needed_qty REAL NOT NULL,
    estimated_total_price REAL,
    is_purchased INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Table 8: debts_credits
CREATE TABLE IF NOT EXISTS debts_credits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DEBT', 'CREDIT')),
    person_name TEXT NOT NULL,
    phone_number TEXT,
    initial_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'SETTLED', 'DEFAULTED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts_credits(status);

-- Table 9: projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL,
    locked_amount REAL NOT NULL DEFAULT 0.0,
    account_vault_id TEXT,
    target_date DATE,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('IDEA', 'ACTIVE', 'COMPLETED', 'ABANDONED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_vault_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- Table 10: sync_queue
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mutation_id TEXT UNIQUE NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status, timestamp);

-- Table 11: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    old_data TEXT,
    new_data TEXT,
    reason TEXT,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_tx ON audit_log(transaction_id);

-- Table 12: attachments
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    file_uri TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
`;

export const INITIAL_CATEGORIES = [
  { id: 'cat_alim', name: 'Alimentation & Marché', icon: 'shopping-cart', color: '#10B981', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_transp', name: 'Transport & Carburant', icon: 'navigation', color: '#3B82F6', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_factures', name: 'Factures (CIE / SODECI)', icon: 'zap', color: '#F59E0B', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_loyer', name: 'Logement & Loyer', icon: 'home', color: '#8B5CF6', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_sante', name: 'Santé & Pharmacie', icon: 'activity', color: '#EF4444', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_loisirs', name: 'Loisirs & Sorties', icon: 'coffee', color: '#EC4899', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_imprevus', name: 'Imprévus & Urgences', icon: 'alert-triangle', color: '#DC2626', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_frais', name: 'Frais & commissions', icon: 'tag', color: '#64748B', type: 'EXPENSE', is_default: 1 },
  { id: 'cat_salaire', name: 'Salaire Principal', icon: 'briefcase', color: '#0B4F3A', type: 'INCOME', is_default: 1 },
  { id: 'cat_freelance', name: 'Freelance & Business', icon: 'trending-up', color: '#059669', type: 'INCOME', is_default: 1 },
  { id: 'cat_dons', name: 'Cadeaux & Dons reçus', icon: 'gift', color: '#6366F1', type: 'INCOME', is_default: 1 },
];
