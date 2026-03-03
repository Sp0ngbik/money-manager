import { createContext } from 'react'
import type {
  Category,
  BudgetData,
  MonthlyExpense,
  MonthlyStats,
  ExchangeRates,
  CategoryConfig,
  CustomCategory,
} from '../types'

export interface BudgetContextType {
  salary: string
  setSalary: (value: string) => void
  savingsGoal: string
  setSavingsGoal: (value: string) => void
  percentages: Category
  setPercentages: (value: Category) => void
  budget: BudgetData | null
  
  selectedCurrency: 'BYN' | 'RUB'
  setSelectedCurrency: (currency: 'BYN' | 'RUB') => void
  exchangeRates: ExchangeRates
  isLoadingRates: boolean
  refreshRates: () => void
  
  expenses: MonthlyExpense[]
  addExpense: (expense: Omit<MonthlyExpense, 'id'>) => void
  removeExpense: (id: string) => void
  getMonthlyStats: (month: string) => MonthlyStats
  getAllMonthlyStats: () => MonthlyStats[]
  
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  
  categoryConfigs: Record<string, CategoryConfig>
  addCategory: (key: string, config: CategoryConfig) => void
  removeCategory: (key: string) => void
  
  // Custom categories support
  customCategories: CustomCategory[]
  addCustomCategory: (category: Omit<CustomCategory, 'id'>) => void
  updateCustomCategory: (id: string, updates: Partial<CustomCategory>) => void
  deleteCustomCategory: (id: string) => void
  totalCustomPercentage: number
  
  calculateBudget: () => void
  totalPercentage: number
  defaultTotalPercentage: number
  customTotalPercentage: number
  monthsToGoal: number | null
  effectiveSavings: { value: number; bonus?: number; penalty?: number; note: string } | null
  
  // Auto-budgeting functionality
  generateMonthlyBudget: (month: string) => void
  lastBudgetedMonth: string | null
  hasBudgetForMonth: (month: string) => boolean
}

export const BudgetContext = createContext<BudgetContextType | undefined>(undefined)
