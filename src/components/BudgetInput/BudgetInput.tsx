import React from 'react'
import { useBudget } from '../../context/useBudget'
import { CurrencySelector } from '../CurrencySelector/CurrencySelector'
import { ExchangeRateDisplay } from '../ExchangeRateDisplay/ExchangeRateDisplay'
import { convertAmount, getFormatter } from '../../services/exchangeRate'
import styles from './BudgetInput.module.scss'

export const BudgetInput: React.FC = () => {
  const {
    salary,
    setSalary,
    savingsGoal,
    setSavingsGoal,
    selectedCurrency,
    exchangeRates,
    calculateBudget,
    monthsToGoal,
    budget,
  } = useBudget()

  const formatSecondary = getFormatter(selectedCurrency)

  const getHintClass = () => {
    if (!budget) return ''
    if (budget.remainingPercent < 0) return styles['hint--error']
    if (budget.remainingPercent > 0) return styles['hint--success']
    return styles['hint--success']
  }

  const getMonthsText = (months: number): string => {
    if (months === 1) return 'месяц'
    if (months < 5) return 'месяца'
    return 'месяцев'
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <CurrencySelector />
        <ExchangeRateDisplay />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="salary">
          Ежемесячный доход
          <span className={styles.currencyBadge}>USD</span>
        </label>
        <input
          type="number"
          id="salary"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="Например: 3000"
          min="0"
        />
        {salary && parseFloat(salary) > 0 && (
          <span className={styles.currencySecondary}>
            ≈ {formatSecondary(convertAmount(parseFloat(salary), selectedCurrency, exchangeRates))}
          </span>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="savingsGoal">
          Цель сбережений
          <span className={styles.currencyBadge}>USD</span>
        </label>
        <input
          type="number"
          id="savingsGoal"
          value={savingsGoal}
          onChange={(e) => setSavingsGoal(e.target.value)}
          placeholder="Например: 15000"
          min="0"
        />
        {savingsGoal && parseFloat(savingsGoal) > 0 && (
          <span className={styles.currencySecondary}>
            ≈ {formatSecondary(convertAmount(parseFloat(savingsGoal), selectedCurrency, exchangeRates))}
          </span>
        )}
        {monthsToGoal !== null && monthsToGoal !== Infinity && (
          <span className={`${styles.hint} ${getHintClass()}`}>
            💡 Цель будет достигнута за {monthsToGoal} {getMonthsText(monthsToGoal)}
            {budget && budget.remainingPercent > 0 && ' (ускорено за счёт остатка!)'}
            {budget && budget.remainingPercent < 0 && ' (замедлено из-за перерасхода)'}
          </span>
        )}
        {monthsToGoal === Infinity && (
          <span className={`${styles.hint} ${styles['hint--error']}`}>
            ⚠️ При перерасходе сбережения невозможны! Уменьшите расходы.
          </span>
        )}
      </div>

      <button
        className={styles.button}
        onClick={calculateBudget}
        disabled={!salary || parseFloat(salary) <= 0}
      >
        📈 Рассчитать бюджет
      </button>
    </section>
  )
}

