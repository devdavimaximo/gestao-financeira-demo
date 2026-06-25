export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type CategoryType = 'Income' | 'Expense' | 'Both';
export type AccountType = 'Checking' | 'Savings' | 'CreditCard' | 'Investment' | 'Cash';
export type BudgetStatus = 'Active' | 'Exceeded' | 'Closed';

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes?: string;
  accountId: number;
  accountName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  createdAt: string;
}

export interface CreateTransaction {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes?: string;
  accountId: number;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: CategoryType;
  createdAt: string;
}

export interface CreateCategory {
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: CategoryType;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAccount {
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
  description?: string;
}

export interface Budget {
  id: number;
  name: string;
  limitAmount: number;
  spentAmount: number;
  month: number;
  year: number;
  status: BudgetStatus;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  createdAt: string;
}

export interface CreateBudget {
  name: string;
  limitAmount: number;
  month: number;
  year: number;
  categoryId: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalAssets: number;
  monthlyChart: MonthlyChart[];
  topExpenseCategories: CategoryExpense[];
  recentTransactions: Transaction[];
}

export interface MonthlyChart {
  month: number;
  year: number;
  label: string;
  income: number;
  expenses: number;
}

export interface CategoryExpense {
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
}
