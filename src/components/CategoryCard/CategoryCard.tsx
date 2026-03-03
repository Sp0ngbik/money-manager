import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, getFormatter } from '../../services/exchangeRate'
import styles from './CategoryCard.module.scss'

interface CategoryCardProps {
  categoryKey: keyof Category
  amount: number
  percentage: number
  salary: number
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  categoryKey,
  amount,
  percentage,
  salary,
}) => {
  const { selectedCategory, setSelectedCategory, selectedCurrency, exchangeRates } = useBudget()
  const isSelected = selectedCategory === categoryKey

  const formatSecondary = getFormatter(selectedCurrency)
  const color = categoryColors[categoryKey]
  const categoryName = categoryNames[categoryKey]
  const [icon, ...nameParts] = categoryName.split(' ')
  const name = nameParts.join(' ')

  const handleClick = () => {
    setSelectedCategory(isSelected ? null : categoryKey as string)
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles['card--selected'] : ''}`}
      style={{ borderLeftColor: color }}
      onClick={handleClick}
      data-category={categoryKey}
    >
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.name}>{name}</span>
      </div>
      <div className={styles.amount}>
        <span className={styles.amountUsd}>${amount.toLocaleString()}</span>
        <span className={styles.amountSecondary}>
          {formatSecondary(convertAmount(amount, selectedCurrency, exchangeRates))}
        </span>
      </div>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{
            width: `${Math.min((amount / salary) * 100, 100)}%`,
            backgroundColor: color
          }}
        />
      </div>
      <div className={styles.percent}>{percentage}% от дохода</div>
    </div>
  )
}
