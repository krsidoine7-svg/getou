/**
 * Types TypeScript pour la Base de Données SQLite et le Métier — GERETOU
 * Respect strict du schéma relationnel DDL défini dans doc/DATABASE_SCHEMA.md
 */

export interface User {
  id: string;
  email: string;
  display_name?: string | null;
  pin_hash: string;
  biometric_enabled: number; // 0 ou 1
  created_at: string;
  updated_at: string;
}

export type AccountType = 'WAVE' | 'MOMO' | 'ORANGE' | 'CASH' | 'BANK' | 'VAULT';
export type AccountSubType = 'MAIN' | 'VAULT' | 'SAVINGS';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  sub_type: AccountSubType;
  balance: number;
  currency: string;
  is_archived: number; // 0 ou 1 (Soft Delete)
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'EXPENSE' | 'INCOME' | 'BOTH';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default: number; // 0 ou 1
  created_at: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type TransactionNature = 'REGULAR' | 'UNEXPECTED' | 'REIMBURSABLE';
export type TransactionUrgency = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type IncomeProvenance = 'SALARY' | 'FREELANCE' | 'GIFT' | 'SALE' | 'LOAN' | 'OTHER';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  account_id: string;
  destination_account_id?: string | null;
  category_id?: string | null;
  type: TransactionType;
  nature: TransactionNature;
  urgency: TransactionUrgency;
  provenance?: IncomeProvenance | null;
  /** Icône de la catégorie (jointure, lecture seule). */
  category_icon?: string | null;
  /** Nom de la catégorie (jointure, lecture seule). */
  category_name?: string | null;
  /** Compte débité / crédité (jointure, lecture seule). */
  account_name?: string | null;
  account_type?: AccountType | null;
  date: string;
  notes?: string | null;
  receipt_uri?: string | null;
  is_deleted: number; // 0 ou 1
  created_at: string;
  updated_at: string;
}

export type BudgetPeriod = 'DAY' | 'MONTH' | 'YEAR';

export interface Budget {
  id: string;
  user_id: string;
  period: BudgetPeriod;
  category_id?: string | null; // NULL pour budget global
  limit_amount: number;
  alert_threshold: number; // ex: 0.80 (80%)
  is_active: number; // 0 ou 1
  created_at: string;
}

export interface Stock {
  id: string;
  user_id: string;
  name: string;
  category: string;
  current_qty: number;
  unit: string; // 'kg', 'L', 'morceau', 'boîte', 'paquet'
  min_threshold: number;
  estimated_unit_price?: number | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  stock_id: string;
  needed_qty: number;
  estimated_total_price?: number | null;
  is_purchased: number; // 0 ou 1
  created_at: string;
}

export type DebtType = 'DEBT' | 'CREDIT'; // DEBT = Vous devez, CREDIT = On vous doit
export type DebtStatus = 'PENDING' | 'PARTIAL' | 'SETTLED' | 'DEFAULTED';

export interface DebtCredit {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  phone_number?: string | null;
  initial_amount: number;
  remaining_amount: number;
  due_date?: string | null;
  status: DebtStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'IDEA' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  target_amount: number;
  locked_amount: number;
  account_vault_id?: string | null;
  target_date?: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'PROCESSING' | 'FAILED';

export interface SyncQueueItem {
  id: number;
  mutation_id: string;
  table_name: string;
  operation: SyncOperation;
  record_id: string;
  payload: string; // JSON sérialisé
  timestamp: number;
  retry_count: number;
  status: SyncStatus;
}

export interface AuditLogItem {
  id: number;
  transaction_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_data?: string | null;
  new_data?: string | null;
  reason?: string | null;
  modified_at: string;
}

export interface Attachment {
  id: string;
  transaction_id: string;
  file_uri: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}
