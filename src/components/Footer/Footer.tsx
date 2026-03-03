import React from 'react'
import { useBudget } from '../../context/useBudget'
import styles from './Footer.module.scss'

export const Footer: React.FC = () => {
  const { exchangeRates } = useBudget()

  return (
    <footer className={styles.footer}>
      <p>MoneyManager © 2026 • Умное управление финансами</p>
      <p className={styles.exchangeRate}>
        Курсы: 1 USD = {exchangeRates.BYN.toFixed(2)} BYN | {exchangeRates.RUB.toFixed(2)} ₽
      </p>
    </footer>
  )
}

