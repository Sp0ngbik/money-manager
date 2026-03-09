import React from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category, CustomCategoryBudget } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, convertToUSD, formatUSD, formatBYN, formatRUB, getFormatter, getConvertedAmountsInOrder } from '../../services/exchangeRate'
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
    const newSelected = new Set(selectedCategory)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedCategory(newSelected)
  }

  // Get selected categories info
  const selectedDefaultCats = Array.from(selectedCategory).filter(cat => cat in categoryColors)
  const selectedCustomCats = customCategories.filter(cat => selectedCategory.has(cat.id))

  // Calculate total amount of selected categories
  const totalAmount = [
    ...selectedDefaultCats.map(cat => categories[cat as keyof Category]),
    ...selectedCustomCats.map(cat => cat.amount)
  ].reduce((sum, amount) => sum + amount, 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          📊 Диаграмма распределения
          <small>(кликните для выбора категорий)</small>
        </h3>
        {selectedCategory.size > 0 && (
          <div className={styles.headerActions}>
            <div className={styles.totalAmountContainer}>
              <span className={styles.totalLabel}>Общая сумма:</span>
              <span className={styles.totalValue}>
                {getConvertedAmountsInOrder(totalAmount, selectedCurrency, exchangeRates)}
              </span>
            </div>
            <button 
              className={styles.clearButton}
              onClick={() => setSelectedCategory(new Set())}
            >
              ✕ Очистить выбор ({selectedCategory.size})
            </button>
          </div>
        )}
      </div>

      <div className={styles.progressBar}>
        {/* Default categories segments */}
        {(Object.keys(categories) as Array<keyof Category>).map((key) => (
          <div
            key={key}
            className={`${styles.segment} ${selectedCategory.has(key as string) ? styles['segment--selected'] : ''}`}
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
            className={`${styles.segment} ${selectedCategory.has(cat.id) ? styles['segment--selected'] : ''}`}
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

      {/* Selected categories info */}
      {selectedCategory.size > 0 && (
        <div className={styles.selectedCategoriesContainer}>
          <h4 className={styles.selectedTitle}>Выбрано категорий: {selectedCategory.size}</h4>
          
          {/* Default categories */}
          {selectedDefaultCats.map(catKey => (
            <div
              key={catKey}
              className={styles.selectedInfo}
              style={{ borderColor: categoryColors[catKey] }}
            >
              <div className={styles.selectedHeader}>
                <span
                  className={styles.dot}
                  style={{ backgroundColor: categoryColors[catKey] }}
                />
                <span className={styles.selectedName}>{categoryNames[catKey]}</span>
                <span className={styles.selectedPercent}>{percentages[catKey]}%</span>
              </div>
              <div className={styles.selectedAmounts}>
                <span className={styles.amountPrimary}>
                  {formatCurrency(convertAmount(categories[catKey as keyof Category], selectedCurrency, exchangeRates))}
                </span>
                {selectedCurrency === 'USD' ? (
                  <>
                    <span className={styles.amountSecondary}>≈ {formatBYN(categories[catKey as keyof Category] * exchangeRates.BYN)}</span>
                    <span className={styles.amountSecondary}>≈ {formatRUB(categories[catKey as keyof Category] * exchangeRates.RUB)}</span>
                  </>
                ) : (
                  <span className={styles.amountSecondary}>
                    ≈ {formatUSD(convertToUSD(convertAmount(categories[catKey as keyof Category], selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Custom categories */}
          {selectedCustomCats.map(cat => (
            <div
              key={cat.id}
              className={styles.selectedInfo}
              style={{ borderColor: cat.color }}
            >
              <div className={styles.selectedHeader}>
                <span
                  className={styles.dot}
                  style={{ backgroundColor: cat.color }}
                />
                <span className={styles.selectedName}>{cat.emoji} {cat.name}</span>
                <span className={styles.selectedPercent}>{cat.percentage}%</span>
              </div>
              <div className={styles.selectedAmounts}>
                <span className={styles.amountPrimary}>
                  {formatCurrency(convertAmount(cat.amount, selectedCurrency, exchangeRates))}
                </span>
                {selectedCurrency === 'USD' ? (
                  <>
                    <span className={styles.amountSecondary}>≈ {formatBYN(cat.amount * exchangeRates.BYN)}</span>
                    <span className={styles.amountSecondary}>≈ {formatRUB(cat.amount * exchangeRates.RUB)}</span>
                  </>
                ) : (
                  <span className={styles.amountSecondary}>
                    ≈ {formatUSD(convertToUSD(convertAmount(cat.amount, selectedCurrency, exchangeRates), selectedCurrency, exchangeRates))}
                  </span>
                )}
              </div>
            </div>
          ))}
          
        </div>
      )}

      <div className={styles.legend}>
        {/* Default categories legend */}
        {(Object.keys(categories) as Array<keyof Category>).map((key) => (
          <div
            key={key}
            className={`${styles.legendItem} ${selectedCategory.has(key as string) ? styles['legendItem--selected'] : ''}`}
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
            className={`${styles.legendItem} ${selectedCategory.has(cat.id) ? styles['legendItem--selected'] : ''}`}
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