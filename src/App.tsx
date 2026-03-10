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
} from './components'
import type { Category } from './types'
import './index.scss'
import styles from './App.module.scss'

function AppContent() {
  const { budget, percentages, effectiveSavings, selectedCurrency } = useBudget()
  const { latitude, longitude, loading: geoLoading, error: geoError } = useGeolocation()
  const { atms, loading: atmsLoading } = useNearbyAtms(latitude, longitude)

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
              <h2 className={styles.sectionTitle}>🏧 Банкоматы рядом</h2>
              {geoLoading && <p>Определение местоположения...</p>}
              {!geoLoading && !latitude && !longitude && geoError && (
                <p className={styles.error}>{geoError}</p>
              )}
              {latitude && longitude && (
                <>
                  {atmsLoading && <p>Загрузка банкоматов...</p>}
                  <AtmMap userLat={latitude} userLon={longitude} atms={atms} selectedCurrency={selectedCurrency} />
                  {!atmsLoading && atms.length === 0 && (
                    <p>Банкоматы не найдены в радиусе 2 км</p>
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
