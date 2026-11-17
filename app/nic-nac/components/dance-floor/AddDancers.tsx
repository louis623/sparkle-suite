import styles from './dance-floor.module.css'
export function AddDancers({ value, onChange, onAdd, adding }: { value: string; onChange: (value: string) => void; onAdd: () => void; adding: boolean }) {
  return <section id="add" className={styles.section}>
    <p className={styles.kicker}>Add</p><h2>Add dancers</h2>
    <form className={styles.quickAdd} onSubmit={event => { event.preventDefault(); if (!adding) onAdd() }}>
      <label className={styles.field}>Item number<input className="ph-no-capture" value={value} onChange={event => onChange(event.target.value.toUpperCase())} placeholder="RG100" /></label>
      <button type="submit" className={styles.primary} disabled={adding}>{adding ? 'Adding…' : 'Add dancer'}</button>
    </form><p>Know the item number? Add a dancer in one step.</p>
    <div className={styles.bulk}><h3>Add photos</h3><p>Add a folder of jewelry photos, then review each piece before it goes on your Floor.</p>
      <button type="button" className={styles.secondary} disabled aria-describedby="dance-floor-photos-soon">Add photos</button><p id="dance-floor-photos-soon">Coming soon in this rebuild.</p>
    </div>
  </section>
}
