import styles from './AtmMapSkeleton.module.scss'

export const AtmMapSkeleton = () => {
  return (
    <div className={styles.skeleton}>
      <div className={styles.icon}>🗺️</div>
      <div className={styles.text}>Загрузка карты банкоматов...</div>
    </div>
  )
}
