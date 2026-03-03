import React from 'react'
import styles from './Header.module.scss'

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>💎 Money-Manager</h1>
      <p className={styles.subtitle}>Умное распределение финансов</p>
    </header>
  )
}

