import { BudgetProvider } from './context/BudgetContext'
import { useBudget } from './context/useBudget'
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
} from './components'
import type { Category } from './types'
import './index.scss'
import styles from './App.module.scss'

function AppContent() {
  const { budget, percentages, effectiveSavings } = useBudget()

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
