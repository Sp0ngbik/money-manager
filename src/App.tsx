import { useState } from 'react'
import { BudgetProvider } from './context/BudgetContext'
import { useBudget } from './context/useBudget'
import { useGeolocation } from './hooks/useGeolocation'
import { useNearbyAtms } from './hooks/useNearbyAtms'
import {
  Header,
  Footer,
  BudgetInput,
  PercentageEditor,
  CategoryCard,
  CustomCategoryCard,
  BudgetChart,
  SummaryCards,
  MonthlyTracker,
  AtmMap,
  AtmMapSkeleton,
  BankRatesTable,
} from './components'
import type { Category } from './types'
import './index.scss'
import styles from './App.module.scss'

const RADIUS_OPTIONS = [
  { value: 2000, label: '2 км' },
  { value: 5000, label: '5 км' },
  { value: 10000, label: '10 км' },
]

function AppContent() {
  const { budget, percentages, effectiveSavings } = useBudget()
  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation()
  const [radius, setRadius] = useState(2000)
  const { atms, loading: atmsLoading, error: atmsError, isRateLimited, reload: reloadAtms } = useNearbyAtms(latitude, longitude, radius)

  const selectedRadiusLabel = RADIUS_OPTIONS.find((opt) => opt.value === radius)?.label || '2 км'

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.main}>
        <section className={styles.card}>
          <BudgetInput />
        </section>

        <section className={styles.card}>
          <PercentageEditor />
        </section>

        {budget && (
          <section className={styles.results}>
            <h2 className={styles.sectionTitle}>📋 Ваш бюджет</h2>

            <SummaryCards budget={budget} effectiveSavings={effectiveSavings} />

            <div className={styles.categoriesGrid}>
              {/* Default categories */}
              {(Object.keys(budget.categories) as Array<keyof Category>).map((key) => (
                <CategoryCard
                  key={key}
                  categoryKey={key}
                  amount={budget.categories[key]}
                  percentage={percentages[key]}
                  salary={budget.salary}
                />
              ))}

              {/* Custom categories */}
              {budget.customCategories?.map((customCat) => (
                <CustomCategoryCard
                  key={customCat.id}
                  category={customCat}
                  salary={budget.salary}
                />
              ))}
            </div>

            <section className={styles.card}>
              <BudgetChart
                categories={budget.categories}
                customCategories={budget.customCategories}
                percentages={percentages}
                remainingPercent={budget.remainingPercent}
                remainingAmount={budget.remainingAmount}
              />
            </section>

            <MonthlyTracker />

            {/* Карта банкоматов */}
            <section className={styles.card}>
              <div className={styles.atmHeader}>
                <h2 className={styles.sectionTitle}>🏧 Банкоматы рядом</h2>
                <div className={styles.radiusSelector}>
                  <label htmlFor="radius-select">Радиус:</label>
                  <select
                    id="radius-select"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className={styles.select}
                  >
                    {RADIUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {geoLoading && <p>Определение местоположения...</p>}
              {!geoLoading && !latitude && !longitude && geoError && (
                <>
                  <p className={styles.error}>{geoError}</p>
                  <p className={styles.hint}>Разрешите доступ к геолокации в настройках браузера, либо проверьте банкоматы вручную.</p>
                </>
              )}
              {latitude && longitude && (
                <>
                  {atmsLoading && <AtmMapSkeleton />}
                  {!atmsLoading && atmsError && (
                    <div className={styles.errorContainer}>
                      <p className={styles.error}>{atmsError}</p>
                      {isRateLimited && (
                        <button 
                          className={styles.retryButton}
                          onClick={reloadAtms}
                        >
                          🔄 Попробовать снова
                        </button>
                      )}
                    </div>
                  )}
                  {!atmsLoading && !atmsError && (
                    <>
                      <AtmMap userLat={latitude} userLon={longitude} atms={atms} radius={radius} />
                      <BankRatesTable atms={atms} radius={radius} />
                    </>
                  )}
                  {!atmsLoading && !atmsError && atms.length === 0 && (
                    <p>Банкоматы не найдены в радиусе {selectedRadiusLabel}</p>
                  )}
                </>
              )}
            </section>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

function App() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  )
}

export default App
