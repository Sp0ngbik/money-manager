import React, { useEffect, useState } from 'react'
import styles from './Modal.module.scss'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  data?: {
    categories: Array<{ 
      id: string
      name: string 
      amount: number 
      percent: number 
      color: string 
      icon?: string 
    }>
    totalAmount: number
    currency: string
    totalPercent: number
  }
  isClosing?: boolean
}

interface PieChartProps {
  data: Array<{ 
    id: string
    percent: number 
    color: string
    opacity?: number
  }>
  size: number
}

const PieChart: React.FC<PieChartProps> = ({ data, size }) => {
  let gradient = ''
  let currentPercent = 0
  
  data.forEach((item, index) => {
    const endPercent = currentPercent + item.percent
    // Добавить opacity если задан
    let color = item.color
    if (item.opacity !== undefined && item.opacity < 1) {
      // Преобразовать hex в rgba с opacity
      const hex = item.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      color = `rgba(${r}, ${g}, ${b}, ${item.opacity})`
    }
    gradient += `${color} ${currentPercent}% ${endPercent}%${index < data.length - 1 ? ', ' : ''}`
    currentPercent = endPercent
  })
  
  return (
    <div 
      className={styles.pieChart}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `conic-gradient(${gradient})`,
      }}
    />
  )
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  data,
  isClosing = false
}) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showFullList, setShowFullList] = useState(false)

  useEffect(() => {
    // Сбрасывать состояния при открытии
    if (isOpen) {
      setSelectedCategories(new Set())
      setShowFullList(false)
    }
  }, [isOpen])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isClosing])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isClosing) {
      onClose()
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const toggleFullList = () => {
    setShowFullList(!showFullList)
    // Закрыть селекты при переключении на список
    if (!showFullList) {
      setSelectedCategories(new Set())
    }
  }
  
  // Подготовить данные для PieChart с учётом выделения
  const prepareChartData = (categories: NonNullable<typeof data>['categories']) => {
    if (selectedCategories.size === 0) {
      // Ничего не выделено - все сегменты яркие
      return categories.map(cat => ({
        id: cat.id,
        percent: cat.percent,
        color: cat.color,
      }))
    }
    
    // Что-то выделено - невыделенные сегменты затемняются
    return categories.map(cat => ({
      id: cat.id,
      percent: cat.percent,
      color: cat.color,
      opacity: selectedCategories.has(cat.id) ? 1 : 0.3,
    }))
  }
  
  if (!isOpen) return null
  
  const chartData = data && data.categories ? prepareChartData(data.categories) : []
  
  return (
    <div 
      className={`${styles.overlay} ${isClosing ? styles['overlay--closing'] : ''}`} 
      onClick={handleOverlayClick}
    >
      <div 
        className={`${styles.modal} ${isClosing ? styles['modal--closing'] : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
          
          {!showFullList && data && data.categories.length > 0 && (
            <>
              <div className={styles.chartSection}>
                <div className={styles.chartContainer}>
                  <PieChart data={chartData} size={120} />
                </div>
                
                <div className={styles.legend}>
                  {data.categories.slice(0, 5).map((cat, index) => (
                    <div 
                      key={index} 
                      className={`${styles.legendItem} ${selectedCategories.has(cat.id) ? styles['legendItem--selected'] : ''}`}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <div 
                        className={`${styles.legendDot} ${selectedCategories.has(cat.id) ? styles['legendDot--selected'] : ''}`} 
                        style={{ backgroundColor: cat.color }} 
                      />
                      <span className={styles.legendText}>
                        {cat.icon || ''} {cat.name} {cat.percent}%
                      </span>
                    </div>
                  ))}
                  {data.categories.length > 5 && (
                    <div 
                      className={styles.legendMore}
                      onClick={toggleFullList}
                    >
                      +{data.categories.length - 5} ещё
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.summarySection}>
                <div className={styles.totalInfo}>
                  Итого: {data.totalAmount.toLocaleString()} {data.currency} ({data.categories.length} категорий)
                </div>
              </div>
            </>
          )}

          {showFullList && data && data.categories.length > 0 && (
            <div className={styles.fullListSection}>
              <div className={styles.fullListHeader}>
                <button className={styles.backButton} onClick={toggleFullList}>
                  ← К диаграмме
                </button>
                <div className={styles.selectedCount}>
                  Выбрано: {selectedCategories.size}
                </div>
              </div>
              
              <div className={styles.fullListGrid}>
                {data.categories.map((cat, index) => (
                  <div 
                    key={index} 
                    className={`${styles.fullListItem} ${selectedCategories.has(cat.id) ? styles['fullListItem--selected'] : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className={styles.fullListItemIcon}>{cat.icon || '📦'}</div>
                    <div className={styles.fullListItemInfo}>
                      <div className={styles.fullListItemName}>{cat.name}</div>
                      <div className={styles.fullListItemDetails}>
                        <span className={styles.fullListItemPercent}>{cat.percent}%</span>
                        <span className={styles.fullListItemAmount}>
                          {cat.amount.toLocaleString()} {data.currency}
                        </span>
                      </div>
                    </div>
                    <div 
                      className={styles.fullListItemDot} 
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            {cancelText}
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal
