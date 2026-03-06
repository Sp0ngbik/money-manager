import React, { useState, useMemo } from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, convertToUSD, formatUSD, getFormatter } from '../../services/exchangeRate'
import styles from './MonthlyTracker.module.scss'

export const MonthlyTracker: React.FC = () => {
  const {
    budget,
    expenses,
    addExpense,
    removeExpense,
    customCategories,
    generateMonthlyBudget,
    hasBudgetForMonth,
    selectedCurrency,
    exchangeRates,
  } = useBudget()

  const formatCurrency = getFormatter(selectedCurrency)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [newExpense, setNewExpense] = useState({
    category: 'food' as string,
    amount: '',
    description: '',
  })

  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.month === selectedMonth)
  }, [expenses, selectedMonth])

  // Separate budgeted and actual expenses
  const budgetedExpenses = useMemo(() => {
    return monthExpenses.filter(e => e.isBudgeted)
  }, [monthExpenses])

  const actualExpenses = useMemo(() => {
    return monthExpenses.filter(e => !e.isBudgeted)
  }, [monthExpenses])

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    monthExpenses.forEach(expense => {
      stats[expense.category] = (stats[expense.category] || 0) + expense.amount
    })
    return stats
  }, [monthExpenses])

  // Budgeted stats (planned)
  const budgetedStats = useMemo(() => {
    const stats: Record<string, number> = {}
    budgetedExpenses.forEach(expense => {
      stats[expense.category] = (stats[expense.category] || 0) + expense.amount
    })
    return stats
  }, [budgetedExpenses])

  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [monthExpenses])

  const totalBudgeted = useMemo(() => {
    return budgetedExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [budgetedExpenses])

  const remaining = (budget?.salary || 0) - totalSpent

  const hasBudget = hasBudgetForMonth(selectedMonth)

  const handleAddExpense = () => {
    const amount = parseFloat(newExpense.amount)
    if (!amount || amount <= 0) return

    // Get category name for description
    let categoryName = categoryNames[newExpense.category]
    if (!categoryName) {
      const customCat = customCategories.find(c => c.id === newExpense.category)
      categoryName = customCat ? `${customCat.emoji} ${customCat.name}` : newExpense.category
    }

    addExpense({
      month: selectedMonth,
      category: newExpense.category,
      amount,
      description: newExpense.description || categoryName,
      date: new Date().toISOString().split('T')[0],
    })

    setNewExpense({
      category: 'food',
      amount: '',
      description: '',
    })
  }

  const handleGenerateBudget = () => {
    if (window.confirm(`Создать запланированные расходы для ${selectedMonth} на основе распределения бюджета?`)) {
      generateMonthlyBudget(selectedMonth)
    }
  }

  const getCategoryPercent = (amount: number): number => {
    if (!budget || budget.salary === 0) return 0
    return Math.min((amount / budget.salary) * 100, 100)
  }

  // Helper to get category info (name, color) for any category key
  const getCategoryInfo = (key: string): { name: string; color: string; emoji?: string } => {
    // Check default categories
    if (categoryNames[key]) {
      return {
        name: categoryNames[key],
        color: categoryColors[key],
      }
    }
    // Check custom categories
    const customCat = customCategories.find(c => c.id === key)
    if (customCat) {
      return {
        name: `${customCat.emoji} ${customCat.name}`,
        color: customCat.color,
        emoji: customCat.emoji,
      }
    }
    // Fallback
    return { name: key, color: '#6b7280' }
  }

  // Get budget allocation for a category
  const getBudgetAllocation = (key: string): number => {
    if (budget?.categories[key]) {
      return budget.categories[key]
    }
    const customCat = budget?.customCategories?.find(c => c.id === key)
    if (customCat) {
      return customCat.amount
    }
    return 0
  }

  // Calculate variance (actual vs budgeted)
  const getVariance = (categoryKey: string): { actual: number; budgeted: number; diff: number } => {
    const actual = categoryStats[categoryKey] || 0
    const budgeted = budgetedStats[categoryKey] || 0
    return {
      actual,
      budgeted,
      diff: actual - budgeted,
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>📅 Трекер расходов по месяцам</h2>

      <div className={styles.monthSelector}>
        <div className={styles.selectGroup}>
          <label>Месяц</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className={styles.selectGroup}>
          <label>Категория</label>
          <select
            value={newExpense.category}
            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
          >
            <optgroup label="Основные категории">
              {(Object.keys(categoryNames) as Array<keyof Category>).map((key) => (
                <option key={key} value={key as string}>{categoryNames[key]}</option>
              ))}
            </optgroup>
            {customCategories.length > 0 && (
              <optgroup label="Свои категории">
                {customCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className={styles.selectGroup}>
          <label>Сумма ({selectedCurrency})</label>
          <input
            type="number"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        <div className={styles.selectGroup}>
          <label>Описание</label>
          <input
            type="text"
            value={newExpense.description}
            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            placeholder="Необязательно"
          />
        </div>

        <button
          className={styles.addButton}
          onClick={handleAddExpense}
          disabled={!newExpense.amount || parseFloat(newExpense.amount) <= 0}
        >
          ➕ Добавить
        </button>
      </div>

      {/* Generate Budget Button */}
      {budget && !hasBudget && (
        <div className={styles.budgetAction}>
          <button
            className={styles.generateBudgetButton}
            onClick={handleGenerateBudget}
          >
            📋 Запланировать расходы на {selectedMonth}
          </button>
          <span className={styles.budgetHint}>
            Автоматически создаст расходы на основе вашего распределения бюджета
          </span>
        </div>
      )}

      {hasBudget && (
        <div className={styles.budgetStatus}>
          <span className={styles.budgetStatusBadge}>📋 Есть план бюджета</span>
          <span className={styles.budgetStatusHint}>
            Запланировано: {formatCurrency(convertAmount(totalBudgeted, selectedCurrency, exchangeRates))}
            {selectedCurrency !== 'USD' && (
              <span className={styles.secondaryAmount}> ≈ {formatUSD(convertToUSD(convertAmount(totalBudgeted, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}</span>
            )}
          </span>
        </div>
      )}

      {budget && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Бюджет на месяц</div>
            <div className={styles.statValue}>{formatCurrency(convertAmount(budget.salary, selectedCurrency, exchangeRates))}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Потрачено</div>
            <div className={`${styles.statValue} ${styles['statValue--negative']}`}>
              {formatCurrency(convertAmount(totalSpent, selectedCurrency, exchangeRates))}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Остаток</div>
            <div className={`${styles.statValue} ${remaining >= 0 ? styles['statValue--positive'] : styles['statValue--negative']}`}>
              {formatCurrency(convertAmount(remaining, selectedCurrency, exchangeRates))}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Использовано</div>
            <div className={styles.statValue}>
              {budget.salary > 0 ? ((totalSpent / budget.salary) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Budgeted Expenses Section */}
      {budgetedExpenses.length > 0 && (
        <div className={styles.expensesSection}>
          <h3 className={styles.sectionSubtitle}>📋 Запланированные расходы</h3>
          <div className={styles.expensesList}>
            <div className={styles.listHeader}>
              <span>Категория</span>
              <span>Сумма</span>
              <span>Тип</span>
              <span></span>
            </div>
            {budgetedExpenses.map((expense) => {
              const catInfo = getCategoryInfo(expense.category)
              const variance = getVariance(expense.category)
              const hasActual = variance.actual > 0
              const isOver = variance.actual > variance.budgeted

              return (
                <div 
                  key={expense.id} 
                  className={`${styles.expenseItem} ${styles['expenseItem--budgeted']}`}
                >
                  <div className={styles.expenseCategory}>
                    <span
                      className={styles.categoryDot}
                      style={{ backgroundColor: catInfo.color }}
                    />
                    <span className={styles.expenseDescription}>{expense.description}</span>
                  </div>
                  <span className={styles.expenseAmount}>{formatCurrency(convertAmount(expense.amount, selectedCurrency, exchangeRates))}</span>
                  <span className={`${styles.expenseType} ${hasActual ? (isOver ? styles['expenseType--over'] : styles['expenseType--ontrack']) : ''}`}>
                    {hasActual 
                      ? `Факт: ${formatCurrency(convertAmount(variance.actual, selectedCurrency, exchangeRates))} ${isOver ? '⚠️' : '✓'}`
                      : 'Запланировано'}
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={() => removeExpense(expense.id)}
                  >
                    Удалить
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actual Expenses Section */}
      <div className={styles.expensesSection}>
        <h3 className={styles.sectionSubtitle}>💸 Фактические расходы</h3>
        <div className={styles.expensesList}>
          <div className={styles.listHeader}>
            <span>Категория / Описание</span>
            <span>Сумма</span>
            <span>Дата</span>
            <span></span>
          </div>

          {actualExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              Нет фактических расходов за этот месяц. Добавьте первый расход!
            </div>
          ) : (
            actualExpenses.map((expense) => {
              const catInfo = getCategoryInfo(expense.category)
              return (
                <div key={expense.id} className={styles.expenseItem}>
                  <div className={styles.expenseCategory}>
                    <span
                      className={styles.categoryDot}
                      style={{ backgroundColor: catInfo.color }}
                    />
                    <span className={styles.expenseDescription}>{expense.description}</span>
                  </div>
                  <span className={styles.expenseAmount}>{formatCurrency(convertAmount(expense.amount, selectedCurrency, exchangeRates))}</span>
                  <span className={styles.expenseDate}>{expense.date}</span>
                  <button
                    className={styles.deleteButton}
                    onClick={() => removeExpense(expense.id)}
                  >
                    Удалить
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Category Breakdown with Plan vs Actual */}
      {Object.keys(categoryStats).length > 0 && budget && (
        <div className={styles.categoryBreakdown}>
          <h3 className={styles.breakdownTitle}>📊 План vs Факт по категориям</h3>
          {Object.keys(categoryStats).map((key) => {
            const amount = categoryStats[key] || 0
            const budgetedAmount = budgetedStats[key] || 0
            const percent = getCategoryPercent(amount)
            const budgetAllocation = getBudgetAllocation(key)
            const budgetPercent = budgetAllocation / budget.salary * 100
            const isOverBudget = percent > budgetPercent
            const catInfo = getCategoryInfo(key)
            const hasBudgeted = budgetedAmount > 0
            const variance = amount - budgetedAmount

            return (
              <div key={key} className={styles.categoryBar}>
                <div className={styles.categoryLabel}>
                  <span>{catInfo.emoji || catInfo.name.split(' ')[0]}</span>
                  <span>{catInfo.emoji ? catInfo.name.replace(catInfo.emoji, '').trim() : catInfo.name.split(' ').slice(1).join(' ')}</span>
                </div>
                <div className={styles.progressTrack}>
                  {/* Budgeted amount background */}
                  {hasBudgeted && (
                    <div
                      className={styles.progressFillBudgeted}
                      style={{
                        width: `${Math.min(getCategoryPercent(budgetedAmount), 100)}%`,
                        backgroundColor: catInfo.color + '40',
                      }}
                    />
                  )}
                  {/* Actual amount */}
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${percent}%`,
                      backgroundColor: catInfo.color,
                      opacity: isOverBudget ? 1 : 0.7,
                    }}
                  />
                </div>
                <div className={styles.categoryValue}>
                  <div className={styles.actualValue}>{formatCurrency(convertAmount(amount, selectedCurrency, exchangeRates))}</div>
                  {hasBudgeted && (
                    <div className={`${styles.variance} ${variance > 0 ? styles['variance--over'] : variance < 0 ? styles['variance--under'] : ''}`}>
                      {variance > 0 ? '+' : ''}{formatCurrency(convertAmount(variance, selectedCurrency, exchangeRates))}
                    </div>
                  )}
                  {isOverBudget && <span className={styles.overBudgetBadge}>⚠️</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
