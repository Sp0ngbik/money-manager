import React from 'react'
import { useBudget } from '../../context/useBudget'
import { formatBYN, formatRUB } from '../../services/exchangeRate'
import styles from './CurrencySelector.module.scss'

export const CurrencySelector: React.FC = () => {
  const { selectedCurrency, setSelectedCurrency, exchangeRates, isLoadingRates, refreshRates } = useBudget()

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.selector}>
      <div className={styles.currencyBlock}>
        <span className={styles.label}>Вторичная валюта:</span>
        <div className={styles.buttons}>
          <button
            className={`${styles.button} ${selectedCurrency === 'BYN' ? styles['button--active'] : ''}`}
            onClick={() => setSelectedCurrency('BYN')}
          >
            BYN (РБ)
          </button>
          <button
            className={`${styles.button} ${selectedCurrency === 'RUB' ? styles['button--active'] : ''}`}
            onClick={() => setSelectedCurrency('RUB')}
          >
            ₽ (РФ)
          </button>
        </div>
      </div>

      <div className={styles.ratesBlock}>
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
    </div>
  )
}
