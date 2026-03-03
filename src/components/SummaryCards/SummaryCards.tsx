import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { BudgetData } from '../../types'
import { convertAmount, getFormatter } from '../../services/exchangeRate'
import styles from './SummaryCards.module.scss'

interface SummaryCardsProps {
  budget: BudgetData
  effectiveSavings: { value: number; bonus?: number; penalty?: number; note: string } | null
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ budget, effectiveSavings }) => {
  const { selectedCurrency, exchangeRates } = useBudget()
  const formatSecondary = getFormatter(selectedCurrency)

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.total}`}>
        <span className={styles.label}>Доход</span>
        <span className={styles.amountUsd}>${budget.salary.toLocaleString()}</span>
        <span className={styles.amountSecondary}>
          {formatSecondary(convertAmount(budget.salary, selectedCurrency, exchangeRates))}
        </span>
      </div>

      <div className={`${styles.card} ${styles.goal}`}>
        <span className={styles.label}>Цель</span>
        <span className={styles.amountUsd}>${budget.savingsGoal.toLocaleString()}</span>
        <span className={styles.amountSecondary}>
          {formatSecondary(convertAmount(budget.savingsGoal, selectedCurrency, exchangeRates))}
        </span>
      </div>

      {effectiveSavings && (
        <div className={`${styles.card} ${effectiveSavings.bonus ? styles.bonus : styles.penalty}`}>
          <span className={styles.label}>{effectiveSavings.bonus ? 'Эффективные сбережения' : 'Фактические сбережения'}</span>
          <span className={styles.amountUsd}>${effectiveSavings.value.toLocaleString()}</span>
          <span className={styles.amountSecondary}>
            {formatSecondary(convertAmount(effectiveSavings.value, selectedCurrency, exchangeRates))}
          </span>
          <span className={styles.sublabel}>{effectiveSavings.note}</span>
        </div>
      )}

      {budget.remainingPercent !== 0 && (
        <div className={`${styles.card} ${budget.remainingPercent > 0 ? styles.surplus : styles.deficit}`}>
          <span className={styles.label}>
            {budget.remainingPercent > 0 ? '💰 Остаток' : '⚠️ Нехватка'}
          </span>
          <span className={styles.amountUsd}>
            {budget.remainingAmount > 0 ? '+' : ''}
            ${Math.abs(budget.remainingAmount).toLocaleString()}
          </span>
          <span className={styles.amountSecondary}>
            {formatSecondary(convertAmount(Math.abs(budget.remainingAmount), selectedCurrency, exchangeRates))}
          </span>
          <span className={styles.sublabel}>
            {budget.remainingPercent > 0
              ? `(${budget.remainingPercent.toFixed(1)}% свободно)`
              : `(${(Math.abs(budget.remainingPercent)).toFixed(1)}% перерасход)`
            }
          </span>
        </div>
      )}
    </div>
  )
}

