import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { CustomCategoryBudget } from '../../types'
import { convertAmount, getFormatter } from '../../services/exchangeRate'
import styles from './CustomCategoryCard.module.scss'

interface CustomCategoryCardProps {
  category: CustomCategoryBudget
  salary: number
}

export const CustomCategoryCard: React.FC<CustomCategoryCardProps> = ({
  category,
  salary,
}) => {
  const { selectedCategory, setSelectedCategory, selectedCurrency, exchangeRates } = useBudget()
  const isSelected = selectedCategory === category.id

  const formatSecondary = getFormatter(selectedCurrency)

  const handleClick = () => {
    setSelectedCategory(isSelected ? null : category.id)
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles['card--selected'] : ''}`}
      style={{ borderLeftColor: category.color, color: category.color }}
      onClick={handleClick}
      data-category={category.id}
    >
      <div className={styles.header}>
        <span className={styles.icon}>{category.emoji}</span>
        <span className={styles.name}>{category.name}</span>
      </div>
      <div className={styles.amount}>
        <span className={styles.amountUsd}>${category.amount.toLocaleString()}</span>
        <span className={styles.amountSecondary}>
          {formatSecondary(convertAmount(category.amount, selectedCurrency, exchangeRates))}
        </span>
      </div>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{
            width: `${Math.min((category.amount / salary) * 100, 100)}%`,
            backgroundColor: category.color
          }}
        />
      </div>
      <div className={styles.percent}>{category.percentage}% от дохода</div>
    </div>
  )
}
