import React, { useState } from 'react'
import { useBudget } from '../../context/useBudget'
import type { Category } from '../../types'
import { categoryNames, categoryColors } from '../../types'
import { convertAmount, getFormatter } from '../../services/exchangeRate'
import styles from './PercentageEditor.module.scss'

export const PercentageEditor: React.FC = () => {
  const {
    percentages,
    setPercentages,
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    salary,
    isEditing,
    setIsEditing,
    totalPercentage,
    defaultTotalPercentage,
    customTotalPercentage,
    selectedCurrency,
    exchangeRates,
  } = useBudget()

  const formatSecondary = getFormatter(selectedCurrency)
  const salaryNum = parseFloat(salary) || 0

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦')
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1')
  const [newCategoryPercent, setNewCategoryPercent] = useState('')

  const updatePercentage = (category: keyof Category, value: string) => {
    const num = parseFloat(value) || 0
    setPercentages({
      ...percentages,
      [category]: Math.max(0, num),
    })
  }

  const calculatePreviewAmount = (percent: number): number => {
    return Math.round(salaryNum * (percent / 100))
  }

  const getBudgetStatus = () => {
    if (totalPercentage < 100) {
      return {
        type: 'surplus',
        message: `💰 Экономия: ${(100 - totalPercentage).toFixed(1)}% бюджета остаётся свободным!`,
        note: 'Цель сбережений достигается БЫСТРЕЕ за счёт остатка',
      }
    } else if (totalPercentage > 100) {
      const deficit = totalPercentage - 100
      return {
        type: 'deficit',
        message: `⚠️ Перерасход: ${deficit.toFixed(1)}% сверх дохода`,
        note: 'Цель сбережений достигается МЕДЛЕННЕЕ или становится недостижимой',
      }
    }
    return {
      type: 'balanced',
      message: '✅ Бюджет сбалансирован',
      note: 'Все средства распределены по категориям',
    }
  }

  const budgetStatus = getBudgetStatus()

  const handleAddCategory = () => {
    const percent = parseFloat(newCategoryPercent)
    if (newCategoryName.trim() && !isNaN(percent) && percent > 0) {
      addCustomCategory({
        name: newCategoryName.trim(),
        emoji: newCategoryEmoji || '📦',
        color: newCategoryColor,
        percentage: percent,
      })
      setNewCategoryName('')
      setNewCategoryPercent('')
      setNewCategoryEmoji('📦')
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>⚙️ Распределение (%)</h2>
        <button
          className={styles.toggleButton}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? '✓ Готово' : '✏️ Изменить'}
        </button>
      </div>

      <div className={`${styles.budgetStatus} ${styles[`budgetStatus--${budgetStatus.type}`]}`}>
        <span className={styles.budgetStatus__message}>{budgetStatus.message}</span>
        <span className={styles.budgetStatus__note}>{budgetStatus.note}</span>
      </div>

      {isEditing ? (
        <>
          {/* Default Categories */}
          <div className={styles.grid}>
            {(Object.keys(percentages) as Array<keyof Category>).map((key) => {
              const previewAmount = calculatePreviewAmount(percentages[key])
              return (
                <div key={key} className={styles.input}>
                  <label>{categoryNames[key]}</label>
                  <div className={styles.field}>
                    <input
                      type="number"
                      value={percentages[key]}
                      onChange={(e) => updatePercentage(key, e.target.value)}
                      min="0"
                      step="0.5"
                    />
                    <span className={styles.suffix}>%</span>
                  </div>
                  {salaryNum > 0 && (
                    <div className={styles.preview}>
                      <span className={styles.preview__usd}>${previewAmount.toLocaleString()}</span>
                      <span className={styles.preview__secondary}>
                        {formatSecondary(convertAmount(previewAmount, selectedCurrency, exchangeRates))}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div className={styles.grid} style={{ marginTop: '1rem' }}>
              {customCategories.map((cat) => {
                const previewAmount = calculatePreviewAmount(cat.percentage)
                return (
                  <div key={cat.id} className={styles.input} style={{ borderLeft: `3px solid ${cat.color}` }}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => deleteCustomCategory(cat.id)}
                      title="Удалить категорию"
                    >
                      ✕
                    </button>
                    <label>
                      <input
                        type="text"
                        value={cat.emoji}
                        onChange={(e) => updateCustomCategory(cat.id, { emoji: e.target.value })}
                        style={{ width: '40px', textAlign: 'center', background: 'transparent', border: 'none', fontSize: '1rem' }}
                      />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCustomCategory(cat.id, { name: e.target.value })}
                        style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #2d2d44', color: '#eaeaea', fontSize: '0.9rem' }}
                      />
                    </label>
                    <div className={styles.field}>
                      <input
                        type="number"
                        value={cat.percentage}
                        onChange={(e) => updateCustomCategory(cat.id, { percentage: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.5"
                      />
                      <span className={styles.suffix}>%</span>
                    </div>
                    {salaryNum > 0 && (
                      <div className={styles.preview}>
                        <span className={styles.preview__usd}>${previewAmount.toLocaleString()}</span>
                        <span className={styles.preview__secondary}>
                          {formatSecondary(convertAmount(previewAmount, selectedCurrency, exchangeRates))}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add New Category Form */}
          <div className={styles.addCategorySection}>
            <h3 className={styles.addCategoryTitle}>➕ Добавить свою категорию</h3>
            <div className={styles.addCategoryForm}>
              <div className={styles.formGroup}>
                <label>Название</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Например: Спорт"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Иконка (emoji)</label>
                <input
                  type="text"
                  value={newCategoryEmoji}
                  onChange={(e) => setNewCategoryEmoji(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Цвет</label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className={styles.colorInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>%</label>
                <input
                  type="number"
                  value={newCategoryPercent}
                  onChange={(e) => setNewCategoryPercent(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
              <button
                className={styles.addButton}
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || !newCategoryPercent}
              >
                Добавить
              </button>
            </div>
          </div>

          <div className={`${styles.total} ${
            totalPercentage === 100 ? styles['total--success'] :
            totalPercentage < 100 ? styles['total--info'] : styles['total--warning']
          }`}>
            Итого: {totalPercentage.toFixed(1)}%
            {customCategories.length > 0 && (
              <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                (базовые: {defaultTotalPercentage.toFixed(1)}% + свои: {customTotalPercentage.toFixed(1)}%)
              </span>
            )}
            {totalPercentage < 100 && ` — остаток ${(100 - totalPercentage).toFixed(1)}% идёт в запас`}
            {totalPercentage > 100 && ` — перерасход ${(totalPercentage - 100).toFixed(1)}%!`}
          </div>
          <div className={styles.hint}>
            <strong>💡 Совет:</strong> Можно задать меньше 100% для экономии,
            или больше 100% для агрессивного плана (с риском).
          </div>
        </>
      ) : (
        <div className={styles.previewMode}>
          {/* Default categories preview */}
          {(Object.keys(percentages) as Array<keyof Category>).map((key) => (
            <div
              key={key}
              className={styles.tag}
              style={{
                backgroundColor: categoryColors[key] + '20',
                borderColor: categoryColors[key] + '40'
              }}
            >
              <span className={styles.dot} style={{ backgroundColor: categoryColors[key] }}></span>
              <span>{categoryNames[key]}: {percentages[key]}%</span>
            </div>
          ))}
          {/* Custom categories preview */}
          {customCategories.map((cat) => (
            <div
              key={cat.id}
              className={styles.tag}
              style={{
                backgroundColor: cat.color + '20',
                borderColor: cat.color + '40'
              }}
            >
              <span className={styles.dot} style={{ backgroundColor: cat.color }}></span>
              <span>{cat.emoji} {cat.name}: {cat.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
