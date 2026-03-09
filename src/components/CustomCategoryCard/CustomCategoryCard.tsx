import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { CustomCategoryBudget } from '../../types'
import { convertAmount, convertToUSD, formatUSD, getFormatter } from '../../services/exchangeRate'
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
  const isSelected = selectedCategory.has(category.id)

  const formatCurrency = getFormatter(selectedCurrency)

  const handleClick = () => {
    const newSelected = new Set(selectedCategory)
    if (newSelected.has(category.id)) {
      newSelected.delete(category.id)
    } else {
      newSelected.add(category.id)
    }
    setSelectedCategory(newSelected)
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
        <span className={styles.amountPrimary}>
          {formatCurrency(convertAmount(category.amount, selectedCurrency, exchangeRates))}
        </span>
        {selectedCurrency !== 'USD' && (
          <span className={styles.amountSecondary}>
            ≈ {formatUSD(convertToUSD(convertAmount(category.amount, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
          </span>
        )}
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
