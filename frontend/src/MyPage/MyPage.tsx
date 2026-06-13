import type { RunRecord } from '../types';
import styles from './MyPage.module.css';

interface MyPageProps {
  records: RunRecord[];
}

function formatRunDuration(seconds: number) {
  if (seconds < 60) return `${seconds}초`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분 ${restSeconds}초`;
}

function formatShortDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

export default function MyPage({ records }: MyPageProps) {
  // App에서 받은 기록을 합산해 총 거리, 총 시간, 최근 러닝 정보를 구함.
  const totalDistance = records.reduce((sum, record) => sum + record.distanceKm, 0);
  const totalSeconds = records.reduce((sum, record) => sum + record.durationSeconds, 0);
  const latestRunDate = records[0]?.startedAt || '-';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>내 기록</h1>
        <p className={styles.sub}>지도에서 시작한 러닝 기록을 이번 실행 동안 확인할 수 있어요.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <p className={styles.statLbl}>총 러닝 횟수</p>
          <p className={styles.statVal}>
            {records.length}
            <span className={styles.unit}>회</span>
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLbl}>누적 거리</p>
          <p className={styles.statVal}>
            {totalDistance.toFixed(1)}
            <span className={styles.unit}>km</span>
          </p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLbl}>누적 시간</p>
          <p className={styles.statValSmall}>{formatRunDuration(totalSeconds)}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLbl}>최근 러닝</p>
          <p className={styles.statValSmall}>{latestRunDate}</p>
        </div>
      </div>

      <h2 className={styles.secTitle}>러닝 히스토리</h2>
      {records.length === 0 ? (
        <div className={styles.empty}>
          아직 러닝 기록이 없어요. 지도에서 코스를 선택하고 러닝을 시작해보세요.
        </div>
      ) : (
        <div className={styles.list}>
          {/* 새 기록을 앞에 저장하므로 최근 러닝부터 순서대로 표시함. */}
          {records.map((record) => (
            <article key={record.id} className={styles.record}>
              <div>
                <p className={styles.recDate}>{record.startedAt}</p>
                <p className={styles.recPark}>{record.parkName}</p>
                <p className={styles.recName}>{record.courseName}</p>
              </div>
              <div className={styles.recChips}>
                <span className={styles.recChip}>{record.distanceKm.toFixed(1)} km</span>
                <span className={styles.recChip}>{formatShortDuration(record.durationSeconds)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
