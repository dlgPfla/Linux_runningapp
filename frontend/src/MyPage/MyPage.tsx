import styles from './MyPage.module.css';

const RECORDS = [
  { id: 1, date: '2026.05.10', course: '북한산 6km 둘레길', distance: 6.0, time: '42분' },
  { id: 2, date: '2026.05.07', course: '안산자락길 순환 코스', distance: 4.3, time: '31분' },
  { id: 3, date: '2026.05.03', course: '홍제천 수변 러닝로', distance: 7.2, time: '52분' },
];

export default function MyPage() {
  const total = RECORDS.reduce((s, r) => s + r.distance, 0);
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>내 기록</h1>
        <p className={styles.sub}>러닝 히스토리와 누적 기록을 확인하세요</p>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><p className={styles.statLbl}>총 러닝</p><p className={styles.statVal}>{RECORDS.length}<span className={styles.unit}>회</span></p></div>
        <div className={styles.stat}><p className={styles.statLbl}>누적 거리</p><p className={styles.statVal}>{total.toFixed(1)}<span className={styles.unit}>km</span></p></div>
        <div className={styles.stat}><p className={styles.statLbl}>최근 러닝</p><p className={styles.statVal} style={{fontSize:18}}>{RECORDS[0].date}</p></div>
      </div>
      <h2 className={styles.secTitle}>러닝 히스토리</h2>
      <div className={styles.list}>
        {RECORDS.map((r) => (
          <div key={r.id} className={styles.record}>
            <div><p className={styles.recDate}>{r.date}</p><p className={styles.recName}>{r.course}</p></div>
            <div className={styles.recChips}>
              <span className={styles.recChip}>{r.distance.toFixed(1)} km</span>
              <span className={styles.recChip}>{r.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
