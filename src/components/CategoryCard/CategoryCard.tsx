import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, convertToUSD, formatUSD, getFormatter } from '../../services/exchangeRate'
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
  const isSelected = selectedCategory.has(categoryKey as string)

  const formatCurrency = getFormatter(selectedCurrency)
  const color = categoryColors[categoryKey]
  const categoryName = categoryNames[categoryKey]
  const [icon, ...nameParts] = categoryName.split(' ')
  const name = nameParts.join(' ')

  const handleClick = () => {
    const newSelected = new Set(selectedCategory)
    if (newSelected.has(categoryKey as string)) {
      newSelected.delete(categoryKey as string)
    } else {
      newSelected.add(categoryKey as string)
    }
    setSelectedCategory(newSelected)
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
        <span className={styles.amountPrimary}>
          {formatCurrency(convertAmount(amount, selectedCurrency, exchangeRates))}
        </span>
        {selectedCurrency !== 'USD' && (
          <span className={styles.amountSecondary}>
            ≈ {formatUSD(convertToUSD(convertAmount(amount, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
          </span>
        )}
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
