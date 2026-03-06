import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category, CustomCategoryBudget } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, convertToUSD, formatUSD, formatBYN, formatRUB, getFormatter } from '../../services/exchangeRate'
import styles from './BudgetChart.module.scss'

interface BudgetChartProps {
  categories: Category
  customCategories?: CustomCategoryBudget[]
  percentages: Category
  remainingPercent: number
  remainingAmount: number
}

export const BudgetChart: React.FC<BudgetChartProps> = ({
  categories,
  customCategories = [],
  percentages,
  remainingPercent,
  remainingAmount,
}) => {
  const { selectedCategory, setSelectedCategory, selectedCurrency, exchangeRates } = useBudget()
  const formatCurrency = getFormatter(selectedCurrency)

  const handleSegmentClick = (key: string) => {
    setSelectedCategory(selectedCategory === key ? null : key)
  }

  // Find selected custom category
  const selectedCustomCat = customCategories.find(cat => cat.id === selectedCategory)
  
  // Check if selected category is a default category
  const isDefaultCategory = selectedCategory && selectedCategory in categoryColors

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        📊 Диаграмма распределения
        <small>(кликните для подсветки)</small>
      </h3>

      <div className={styles.progressBar}>
        {/* Default categories segments */}
        {(Object.keys(categories) as Array<keyof Category>).map((key) => (
          <div
            key={key}
            className={`${styles.segment} ${selectedCategory === key ? styles['segment--selected'] : ''}`}
            style={{
              width: `${Math.min(percentages[key], 100)}%`,
              backgroundColor: categoryColors[key as string],
            }}
            onClick={() => handleSegmentClick(key as string)}
            title={`${categoryNames[key as string]}: ${formatCurrency(convertAmount(categories[key], selectedCurrency, exchangeRates))} (${percentages[key]}%)`}
          />
        ))}
        
        {/* Custom categories segments */}
        {customCategories.map((cat) => (
          <div
            key={cat.id}
            className={`${styles.segment} ${selectedCategory === cat.id ? styles['segment--selected'] : ''}`}
            style={{
              width: `${Math.min(cat.percentage, 100)}%`,
              backgroundColor: cat.color,
            }}
            onClick={() => handleSegmentClick(cat.id)}
            title={`${cat.emoji} ${cat.name}: ${formatCurrency(convertAmount(cat.amount, selectedCurrency, exchangeRates))} (${cat.percentage}%)`}
          />
        ))}
        
        {remainingPercent > 0 && (
          <div
            className={`${styles.segment} ${styles['segment--remaining']}`}
            style={{ width: `${Math.min(remainingPercent, 100)}%` }}
            title={`Остаток: ${formatCurrency(convertAmount(remainingAmount, selectedCurrency, exchangeRates))} (${remainingPercent.toFixed(1)}%)`}
          >
            <span className={styles.remainingLabel}>+{remainingPercent.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {remainingPercent < 0 && (
        <div className={styles.overspendIndicator}>
          <div
            className={styles.overspendBar}
            style={{ width: `${Math.min(Math.abs(remainingPercent), 50)}%` }}
          />
          <span className={styles.overspendText}>
            Перерасход: {Math.abs(remainingPercent).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Selected default category info */}
      {selectedCategory && isDefaultCategory && (
        <div
          className={styles.selectedInfo}
          style={{ borderColor: categoryColors[selectedCategory] }}
        >
          <div className={styles.selectedHeader}>
            <span
              className={styles.dot}
              style={{ backgroundColor: categoryColors[selectedCategory] }}
            />
            <span className={styles.selectedName}>{categoryNames[selectedCategory]}</span>
            <span className={styles.selectedPercent}>{percentages[selectedCategory]}%</span>
          </div>
          <div className={styles.selectedAmounts}>
            <span className={styles.amountPrimary}>
              {formatCurrency(convertAmount(categories[selectedCategory], selectedCurrency, exchangeRates))}
            </span>
            {selectedCurrency === 'USD' ? (
              <>
                <span className={styles.amountSecondary}>≈ {formatBYN(categories[selectedCategory] * exchangeRates.BYN)}</span>
                <span className={styles.amountSecondary}>≈ {formatRUB(categories[selectedCategory] * exchangeRates.RUB)}</span>
              </>
            ) : (
              <span className={styles.amountSecondary}>
                ≈ {formatUSD(convertToUSD(convertAmount(categories[selectedCategory], selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selected custom category info */}
      {selectedCustomCat && (
        <div
          className={styles.selectedInfo}
          style={{ borderColor: selectedCustomCat.color }}
        >
          <div className={styles.selectedHeader}>
            <span
              className={styles.dot}
              style={{ backgroundColor: selectedCustomCat.color }}
            />
            <span className={styles.selectedName}>{selectedCustomCat.emoji} {selectedCustomCat.name}</span>
            <span className={styles.selectedPercent}>{selectedCustomCat.percentage}%</span>
          </div>
          <div className={styles.selectedAmounts}>
            <span className={styles.amountPrimary}>
              {formatCurrency(convertAmount(selectedCustomCat.amount, selectedCurrency, exchangeRates))}
            </span>
            {selectedCurrency === 'USD' ? (
              <>
                <span className={styles.amountSecondary}>≈ {formatBYN(selectedCustomCat.amount * exchangeRates.BYN)}</span>
                <span className={styles.amountSecondary}>≈ {formatRUB(selectedCustomCat.amount * exchangeRates.RUB)}</span>
              </>
            ) : (
              <span className={styles.amountSecondary}>
                ≈ {formatUSD(convertToUSD(convertAmount(selectedCustomCat.amount, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.legend}>
        {/* Default categories legend */}
        {(Object.keys(categories) as Array<keyof Category>).map((key) => (
          <div
            key={key}
            className={`${styles.legendItem} ${selectedCategory === key ? styles['legendItem--selected'] : ''}`}
            onClick={() => handleSegmentClick(key as string)}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: categoryColors[key as string] }}
            />
            <span>{categoryNames[key as string]} ({percentages[key]}%)</span>
          </div>
        ))}
        
        {/* Custom categories legend */}
        {customCategories.map((cat) => (
          <div
            key={cat.id}
            className={`${styles.legendItem} ${selectedCategory === cat.id ? styles['legendItem--selected'] : ''}`}
            onClick={() => handleSegmentClick(cat.id)}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: cat.color }}
            />
            <span>{cat.emoji} {cat.name} ({cat.percentage}%)</span>
          </div>
        ))}
        
        {remainingPercent > 0 && (
          <div className={`${styles.legendItem} ${styles['legendItem--remaining']}`}>
            <span className={`${styles.dot} ${styles['dot--remaining']}`} />
            <span>💰 Остаток ({remainingPercent.toFixed(1)}%)</span>
          </div>
        )}
      </div>
    </div>
  )
}
