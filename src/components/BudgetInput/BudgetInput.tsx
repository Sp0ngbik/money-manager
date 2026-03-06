import React from 'react'
import { useBudget } from '../../context/useBudget'
import { CurrencySelector } from '../CurrencySelector/CurrencySelector'
import { formatUSD, formatBYN, formatRUB } from '../../services/exchangeRate'
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
      <CurrencySelector />

      <div className={styles.inputGroup}>
        <label htmlFor="salary">
          Ежемесячный доход
<span className={styles.currencyBadge}>{selectedCurrency}</span>
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
            {selectedCurrency === 'USD' ? (
              <>
                {formatUSD(parseFloat(salary))} ≈ {formatBYN(parseFloat(salary) * exchangeRates.BYN)} ≈ {formatRUB(parseFloat(salary) * exchangeRates.RUB)}
              </>
            ) : selectedCurrency === 'BYN' ? (
              <>
                {formatBYN(parseFloat(salary) * exchangeRates.BYN)} ≈ {formatUSD(parseFloat(salary))} ≈ {formatRUB(parseFloat(salary) * exchangeRates.RUB)}
              </>
            ) : (
              <>
                {formatRUB(parseFloat(salary) * exchangeRates.RUB)} ≈ {formatUSD(parseFloat(salary))} ≈ {formatBYN(parseFloat(salary) * exchangeRates.BYN)}
              </>
            )}
          </span>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="savingsGoal">
          Цель сбережений
<span className={styles.currencyBadge}>{selectedCurrency}</span>
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
            {selectedCurrency === 'USD' ? (
              <>
                {formatUSD(parseFloat(savingsGoal))} ≈ {formatBYN(parseFloat(savingsGoal) * exchangeRates.BYN)} ≈ {formatRUB(parseFloat(savingsGoal) * exchangeRates.RUB)}
              </>
            ) : selectedCurrency === 'BYN' ? (
              <>
                {formatBYN(parseFloat(savingsGoal) * exchangeRates.BYN)} ≈ {formatUSD(parseFloat(savingsGoal))} ≈ {formatRUB(parseFloat(savingsGoal) * exchangeRates.RUB)}
              </>
            ) : (
              <>
                {formatRUB(parseFloat(savingsGoal) * exchangeRates.RUB)} ≈ {formatUSD(parseFloat(savingsGoal))} ≈ {formatBYN(parseFloat(savingsGoal) * exchangeRates.BYN)}
              </>
            )}
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
        className={`${styles.button} ${budget ? styles['button--calculated'] : ''}`}
        onClick={calculateBudget}
        disabled={!salary || parseFloat(salary) <= 0}
      >
        {budget ? '🔄 Обновить бюджет' : '📈 Рассчитать бюджет'}
      </button>
      
      {budget && (
        <div className={styles.calculatedIndicator}>
          <span className={styles.checkmark}>✓</span>
          <span>Бюджет рассчитан</span>
        </div>
      )}
    </section>
  )
}
