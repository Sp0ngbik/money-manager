import React from 'react'
import { useBudget } from '../../context/useBudget'
import styles from './CurrencySelector.module.scss'

export const CurrencySelector: React.FC = () => {
  const { selectedCurrency, setSelectedCurrency } = useBudget()

  return (
    <div className={styles.selector}>
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
  )
}

