import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { BudgetData } from '../../types'
import { convertAmount, convertToUSD, formatUSD, formatBYN, formatRUB, getFormatter } from '../../services/exchangeRate'
import styles from './SummaryCards.module.scss'

interface SummaryCardsProps {
  budget: BudgetData
  effectiveSavings: { value: number; bonus?: number; penalty?: number; note: string } | null
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ budget, effectiveSavings }) => {
  const { selectedCurrency, exchangeRates } = useBudget()
  const formatCurrency = getFormatter(selectedCurrency)

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.total}`}>
        <span className={styles.label}>Доход</span>
        <span className={styles.amountPrimary}>
          {formatCurrency(convertAmount(budget.salary, selectedCurrency, exchangeRates))}
        </span>
        {selectedCurrency === 'USD' ? (
          <>
            <span className={styles.amountSecondary}>≈ {formatBYN(budget.salary * exchangeRates.BYN)}</span>
            <span className={styles.amountSecondary}>≈ {formatRUB(budget.salary * exchangeRates.RUB)}</span>
          </>
        ) : (
          <span className={styles.amountSecondary}>
            ≈ {formatUSD(convertToUSD(convertAmount(budget.salary, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
          </span>
        )}
      </div>

      <div className={`${styles.card} ${styles.goal}`}>
        <span className={styles.label}>Цель</span>
        <span className={styles.amountPrimary}>
          {formatCurrency(convertAmount(budget.savingsGoal, selectedCurrency, exchangeRates))}
        </span>
        {selectedCurrency === 'USD' ? (
          <>
            <span className={styles.amountSecondary}>≈ {formatBYN(budget.savingsGoal * exchangeRates.BYN)}</span>
            <span className={styles.amountSecondary}>≈ {formatRUB(budget.savingsGoal * exchangeRates.RUB)}</span>
          </>
        ) : (
          <span className={styles.amountSecondary}>
            ≈ {formatUSD(convertToUSD(convertAmount(budget.savingsGoal, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
          </span>
        )}
      </div>

      {effectiveSavings && (
        <div className={`${styles.card} ${effectiveSavings.bonus ? styles.bonus : styles.penalty}`}>
          <span className={styles.label}>{effectiveSavings.bonus ? 'Эффективные сбережения' : 'Фактические сбережения'}</span>
          <span className={styles.amountPrimary}>
            {formatCurrency(convertAmount(effectiveSavings.value, selectedCurrency, exchangeRates))}
          </span>
          {selectedCurrency === 'USD' ? (
            <>
              <span className={styles.amountSecondary}>≈ {formatBYN(effectiveSavings.value * exchangeRates.BYN)}</span>
              <span className={styles.amountSecondary}>≈ {formatRUB(effectiveSavings.value * exchangeRates.RUB)}</span>
            </>
          ) : (
            <span className={styles.amountSecondary}>
              ≈ {formatUSD(convertToUSD(convertAmount(effectiveSavings.value, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
            </span>
          )}
          <span className={styles.sublabel}>{effectiveSavings.note}</span>
        </div>
      )}

      {budget.remainingPercent !== 0 && (
        <div className={`${styles.card} ${budget.remainingPercent > 0 ? styles.surplus : styles.deficit}`}>
          <span className={styles.label}>
            {budget.remainingPercent > 0 ? '💰 Остаток' : '⚠️ Нехватка'}
          </span>
          <span className={styles.amountPrimary}>
            {budget.remainingAmount > 0 ? '+' : ''}
            {formatCurrency(convertAmount(Math.abs(budget.remainingAmount), selectedCurrency, exchangeRates))}
          </span>
          {selectedCurrency === 'USD' ? (
            <>
              <span className={styles.amountSecondary}>≈ {formatBYN(Math.abs(budget.remainingAmount) * exchangeRates.BYN)}</span>
              <span className={styles.amountSecondary}>≈ {formatRUB(Math.abs(budget.remainingAmount) * exchangeRates.RUB)}</span>
            </>
          ) : (
            <span className={styles.amountSecondary}>
              ≈ {formatUSD(convertToUSD(convertAmount(Math.abs(budget.remainingAmount), selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
            </span>
          )}
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

