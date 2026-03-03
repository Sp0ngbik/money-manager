import React from 'react'
import { useBudget } from '../../context/useBudget'
import { formatBYN, formatRUB } from '../../services/exchangeRate'
import styles from './ExchangeRateDisplay.module.scss'

export const ExchangeRateDisplay: React.FC = () => {
  const { exchangeRates, isLoadingRates, refreshRates } = useBudget()

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.rates}>
        <div className={styles.rate}>
          <span className={styles.flag}>🇧🇾</span>
          <span className={styles.currency}>1 USD =</span>
          <span className={styles.value}>{formatBYN(exchangeRates.BYN)}</span>
        </div>
        <div className={styles.rate}>
          <span className={styles.flag}>🇷🇺</span>
          <span className={styles.currency}>1 USD =</span>
          <span className={styles.value}>{formatRUB(exchangeRates.RUB)}</span>
        </div>
      </div>
      <div className={styles.update}>
        <span>Обновлено: {formatDate(exchangeRates.lastUpdated)}</span>
        <button 
          className={styles.refreshButton}
          onClick={refreshRates}
          disabled={isLoadingRates}
        >
          {isLoadingRates ? <span className={styles.spinner}>🔄</span> : '🔄 Обновить'}
        </button>
      </div>
    </div>
  )
}

