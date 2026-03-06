import React, { useState, useEffect, useCallback } from 'react'
import type {
  Category,
  BudgetData,
  MonthlyExpense,
  MonthlyStats,
  ExchangeRates,
  CategoryConfig,
  CustomCategory,
} from '../types'
import { defaultCategories, defaultPercentages, STORAGE_KEYS, categoryNames } from '../types'
import { fetchExchangeRates } from '../services/exchangeRate'
import { BudgetContext } from './BudgetContext.types'

// Helper to calculate budget from saved data
const calculateBudgetFromData = (
  salary: string,
  savingsGoal: string,
  percentages: Category,
  categoryConfigs: Record<string, CategoryConfig>,
  customCategories: CustomCategory[]
): BudgetData | null => {
  const salaryNum = parseFloat(salary) || 0
  const savingsGoalNum = parseFloat(savingsGoal) || 0
  
  if (salaryNum <= 0) return null

  const categories: Category = {}
  Object.keys(categoryConfigs).forEach(key => {
    categories[key] = Math.round(salaryNum * ((percentages[key] || 0) / 100))
  })

  const customCategoriesBudget = customCategories.map(cat => ({
    ...cat,
    amount: Math.round(salaryNum * (cat.percentage / 100)),
  }))

  const defaultTotalPercent = Object.values(percentages).reduce((sum, val) => sum + val, 0)
  const customTotalPercent = customCategories.reduce((sum, cat) => sum + cat.percentage, 0)
  const totalPercent = defaultTotalPercent + customTotalPercent
  
  const defaultTotalAmount = Object.values(categories).reduce((sum, val) => sum + val, 0)
  const customTotalAmount = customCategoriesBudget.reduce((sum, cat) => sum + cat.amount, 0)
  const remainingAmount = salaryNum - defaultTotalAmount - customTotalAmount
  const remainingPercent = 100 - totalPercent

  return {
    salary: salaryNum,
    savingsGoal: savingsGoalNum,
    categories,
    remainingAmount,
    remainingPercent,
    customCategories: customCategoriesBudget,
  }
}

const loadInitialState = () => {
  const savedBudget = localStorage.getItem(STORAGE_KEYS.BUDGET)
  const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES)
  const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
  const savedCustomCategories = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES)
  const savedLastBudgetedMonth = localStorage.getItem(STORAGE_KEYS.LAST_BUDGETED_MONTH)

  const savedCategoryConfigs = savedCategories ? JSON.parse(savedCategories) : null
  
  const loadedPercentages = savedBudget && JSON.parse(savedBudget).percentages 
    ? JSON.parse(savedBudget).percentages 
    : { ...defaultPercentages }
  
  const loadedSalary = savedBudget ? JSON.parse(savedBudget).salary.toString() : ''
  const loadedSavingsGoal = savedBudget ? JSON.parse(savedBudget).savingsGoal.toString() : ''
  const loadedCategoryConfigs = savedCategoryConfigs || { ...defaultCategories }
  const loadedCustomCategories = savedCustomCategories ? JSON.parse(savedCustomCategories) : []
  
  // Auto-calculate budget if we have saved data
  const initialBudget = calculateBudgetFromData(
    loadedSalary,
    loadedSavingsGoal,
    loadedPercentages,
    loadedCategoryConfigs,
    loadedCustomCategories
  )

  return {
    salary: loadedSalary,
    savingsGoal: loadedSavingsGoal,
    percentages: loadedPercentages,
    expenses: savedExpenses ? JSON.parse(savedExpenses) : [],
    selectedCurrency: savedSettings && JSON.parse(savedSettings).selectedCurrency 
      ? JSON.parse(savedSettings).selectedCurrency 
      : 'USD' as 'USD' | 'BYN' | 'RUB',
    categoryConfigs: loadedCategoryConfigs,
    customCategories: loadedCustomCategories,
    lastBudgetedMonth: savedLastBudgetedMonth || null,
    initialBudget,
  }
}

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialState = loadInitialState()
  
  const [salary, setSalary] = useState<string>(initialState.salary)
  const [savingsGoal, setSavingsGoal] = useState<string>(initialState.savingsGoal)
  const [percentages, setPercentages] = useState<Category>(initialState.percentages)
  const [budget, setBudget] = useState<BudgetData | null>(initialState.initialBudget)
  
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BYN' | 'RUB'>(initialState.selectedCurrency)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    BYN: 3.25,
    RUB: 92.5,
    lastUpdated: new Date(),
  })
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  
  const [expenses, setExpenses] = useState<MonthlyExpense[]>(initialState.expenses)
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, CategoryConfig>>(initialState.categoryConfigs)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(initialState.customCategories)
  const [lastBudgetedMonth, setLastBudgetedMonth] = useState<string | null>(initialState.lastBudgetedMonth)

  useEffect(() => {
    fetchExchangeRates().then(rates => {
      setExchangeRates(rates)
    })
  }, [])

  useEffect(() => {
    if (budget) {
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify({
        salary: budget.salary,
        savingsGoal: budget.savingsGoal,
        percentages,
      }))
    }
  }, [budget, percentages])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      selectedCurrency,
    }))
  }, [selectedCurrency])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categoryConfigs))
  }, [categoryConfigs])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(customCategories))
  }, [customCategories])

  useEffect(() => {
    if (lastBudgetedMonth) {
      localStorage.setItem(STORAGE_KEYS.LAST_BUDGETED_MONTH, lastBudgetedMonth)
    }
  }, [lastBudgetedMonth])

  const refreshRates = () => {
    setIsLoadingRates(true)
    fetchExchangeRates().then(rates => {
      setExchangeRates(rates)
      setIsLoadingRates(false)
    })
  }

  const addCategory = (key: string, config: CategoryConfig) => {
    setCategoryConfigs(prev => ({
      ...prev,
      [key]: config,
    }))
    setPercentages(prev => ({
      ...prev,
      [key]: 0,
    }))
  }

  const removeCategory = (key: string) => {
    if (categoryConfigs[key]?.isDefault) return
    
    setCategoryConfigs(prev => {
      const newConfigs = { ...prev }
      delete newConfigs[key]
      return newConfigs
    })
    setPercentages(prev => {
      const newPercentages = { ...prev }
      delete newPercentages[key]
      return newPercentages
    })
  }

  // Custom categories functions
  const addCustomCategory = useCallback((category: Omit<CustomCategory, 'id'>) => {
    const newCategory: CustomCategory = {
      ...category,
      id: crypto.randomUUID(),
    }
    setCustomCategories(prev => [...prev, newCategory])
  }, [])

  const updateCustomCategory = useCallback((id: string, updates: Partial<CustomCategory>) => {
    setCustomCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    ))
  }, [])

  const deleteCustomCategory = useCallback((id: string) => {
    setCustomCategories(prev => prev.filter(cat => cat.id !== id))
  }, [])

  // Generate monthly budget expenses based on distribution
  const generateMonthlyBudget = useCallback((month: string) => {
    const salaryNum = parseFloat(salary) || 0
    if (salaryNum <= 0) return

    const firstDayOfMonth = `${month}-01`
    
    const newExpenses: MonthlyExpense[] = []

    // Generate expenses for default categories (excluding savings which is tracked separately)
    Object.entries(percentages).forEach(([categoryKey, percent]) => {
      if (categoryKey === 'savings') return // Skip savings as it's tracked in goal
      
      const amount = Math.round(salaryNum * (percent / 100))
      if (amount > 0) {
        newExpenses.push({
          id: `budget-${month}-${categoryKey}-${Date.now()}`,
          month,
          category: categoryKey,
          amount,
          description: `📋 Запланировано: ${categoryNames[categoryKey]}`,
          date: firstDayOfMonth,
          isBudgeted: true,
          isAutoGenerated: true,
        })
      }
    })

    // Generate expenses for custom categories
    customCategories.forEach(cat => {
      const amount = Math.round(salaryNum * (cat.percentage / 100))
      if (amount > 0) {
        newExpenses.push({
          id: `budget-${month}-custom-${cat.id}-${Date.now()}`,
          month,
          category: cat.id,
          amount,
          description: `📋 Запланировано: ${cat.emoji} ${cat.name}`,
          date: firstDayOfMonth,
          isBudgeted: true,
          isAutoGenerated: true,
        })
      }
    })

    // Add all budgeted expenses
    setExpenses(prev => [...prev, ...newExpenses])
    setLastBudgetedMonth(month)
  }, [salary, percentages, customCategories])

  // Check if month has budgeted expenses
  const hasBudgetForMonth = useCallback((month: string): boolean => {
    return expenses.some(e => e.month === month && e.isBudgeted)
  }, [expenses])

  // Auto-generate budget for new month
  useEffect(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    // If salary is set and we haven't budgeted for current month yet
    if (salary && parseFloat(salary) > 0 && lastBudgetedMonth !== currentMonth) {
      // Check if there's already any expense for this month (manual or auto)
      const hasAnyExpenseForMonth = expenses.some(e => e.month === currentMonth)
      
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        if (!hasAnyExpenseForMonth) {
          generateMonthlyBudget(currentMonth)
        } else {
          // Mark this month as budgeted even if it was manually created
          setLastBudgetedMonth(currentMonth)
        }
      }, 0)
      
      return () => clearTimeout(timer)
    }
  }, [salary, lastBudgetedMonth, expenses, generateMonthlyBudget])

  const calculateBudget = useCallback(() => {
    const salaryNum = parseFloat(salary) || 0
    const savingsGoalNum = parseFloat(savingsGoal) || 0
    
    if (salaryNum <= 0) return

    const categories: Category = {}
    Object.keys(categoryConfigs).forEach(key => {
      categories[key] = Math.round(salaryNum * ((percentages[key] || 0) / 100))
    })

    // Calculate custom categories with amounts
    const customCategoriesBudget = customCategories.map(cat => ({
      ...cat,
      amount: Math.round(salaryNum * (cat.percentage / 100)),
    }))

    const defaultTotalPercent = Object.values(percentages).reduce((sum, val) => sum + val, 0)
    const customTotalPercent = customCategories.reduce((sum, cat) => sum + cat.percentage, 0)
    const totalPercent = defaultTotalPercent + customTotalPercent
    
    const defaultTotalAmount = Object.values(categories).reduce((sum, val) => sum + val, 0)
    const customTotalAmount = customCategoriesBudget.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingAmount = salaryNum - defaultTotalAmount - customTotalAmount
    const remainingPercent = 100 - totalPercent

    const newBudget: BudgetData = {
      salary: salaryNum,
      savingsGoal: savingsGoalNum,
      categories,
      remainingAmount,
      remainingPercent,
      customCategories: customCategoriesBudget,
    }

    setBudget(newBudget)
  }, [salary, savingsGoal, percentages, categoryConfigs, customCategories])

  // Auto-calculate budget when inputs change
  useEffect(() => {
    const salaryNum = parseFloat(salary) || 0
    if (salaryNum > 0) {
      const timer = setTimeout(() => {
        calculateBudget()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [salary, savingsGoal, percentages, customCategories, calculateBudget])

  const addExpense = useCallback((expense: Omit<MonthlyExpense, 'id'>) => {
    const newExpense: MonthlyExpense = {
      ...expense,
      id: Date.now().toString(),
    }
    setExpenses(prev => [...prev, newExpense])
  }, [])

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }, [])

  const getMonthlyStats = useCallback((month: string): MonthlyStats => {
    const monthExpenses = expenses.filter(e => e.month === month)
    const byCategory: Partial<Category> = {}
    let totalSpent = 0

    monthExpenses.forEach(expense => {
      totalSpent += expense.amount
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount
    })

    const budgetForMonth = budget?.salary || 0

    return {
      month,
      totalSpent,
      byCategory,
      remaining: budgetForMonth - totalSpent,
    }
  }, [expenses, budget])

  const getAllMonthlyStats = useCallback((): MonthlyStats[] => {
    const months = [...new Set(expenses.map(e => e.month))].sort()
    return months.map(month => getMonthlyStats(month))
  }, [expenses, getMonthlyStats])

  const defaultTotalPercentage = Object.values(percentages).reduce((sum, val) => sum + val, 0)
  const customTotalPercentage = customCategories.reduce((sum, cat) => sum + cat.percentage, 0)
  const totalPercentage = defaultTotalPercentage + customTotalPercentage

  const monthsToGoal = (() => {
    if (!budget || budget.savingsGoal <= 0 || budget.categories.savings <= 0) return null
    
    const effectiveSavings = budget.remainingPercent > 0 
      ? budget.categories.savings + budget.remainingAmount
      : budget.categories.savings
    
    const overspendPercent = budget.remainingPercent < 0 ? Math.abs(budget.remainingPercent) : 0
    const adjustedSavings = budget.categories.savings * (1 - overspendPercent / 100)
    
    const finalSavings = budget.remainingPercent >= 0 ? effectiveSavings : adjustedSavings
    
    if (finalSavings <= 0) return Infinity
    return Math.ceil(budget.savingsGoal / finalSavings)
  })()

  const effectiveSavings = (() => {
    if (!budget) return null
    
    const baseSavings = budget.categories.savings
    const remainingPercent = budget.remainingPercent
    
    if (remainingPercent > 0) {
      const bonusSavings = budget.remainingAmount
      const totalEffective = baseSavings + bonusSavings
      return {
        value: totalEffective,
        bonus: bonusSavings,
        note: `+$${bonusSavings.toLocaleString('ru-RU')} от остатка`,
      }
    } else if (remainingPercent < 0) {
      const penaltyPercent = Math.abs(remainingPercent)
      const adjustedSavings = Math.round(baseSavings * (1 - penaltyPercent / 100))
      return {
        value: adjustedSavings,
        penalty: baseSavings - adjustedSavings,
        note: `-$${(baseSavings - adjustedSavings).toLocaleString('ru-RU')} из-за перерасхода`,
      }
    }
    return null
  })()

  const value = {
    salary,
    setSalary,
    savingsGoal,
    setSavingsGoal,
    percentages,
    setPercentages,
    budget,
    selectedCurrency,
    setSelectedCurrency,
    exchangeRates,
    isLoadingRates,
    refreshRates,
    expenses,
    addExpense,
    removeExpense,
    getMonthlyStats,
    getAllMonthlyStats,
    selectedCategory,
    setSelectedCategory,
    isEditing,
    setIsEditing,
    categoryConfigs,
    addCategory,
    removeCategory,
    // Custom categories
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    totalCustomPercentage: customTotalPercentage,
    // Auto-budgeting
    generateMonthlyBudget,
    lastBudgetedMonth,
    hasBudgetForMonth,
    calculateBudget,
    totalPercentage,
    defaultTotalPercentage,
    customTotalPercentage,
    monthsToGoal,
    effectiveSavings,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}
