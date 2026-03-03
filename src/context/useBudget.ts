import { useContext } from 'react'
import { BudgetContext } from './BudgetContext.types'
import type { BudgetContextType } from './BudgetContext.types'

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error('useBudget must be used within BudgetProvider')
  }
  return context
}
