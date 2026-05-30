import { useEffect, useState } from 'react';
import type { RunningCourse } from '../../types';
import styles from './RunningTimer.module.css';

interface RunningTimerProps {
  currentRun: RunningCourse | null;
  onFinishRun: () => void;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

export default function RunningTimer({ currentRun, onFinishRun }: RunningTimerProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!currentRun) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentRun]);

  if (!currentRun) return null;

  const elapsedSeconds = Math.max(0, Math.floor((now - currentRun.startedAt) / 1000));

  return (
    <aside className={styles.timerBar} aria-live="polite">
      <div className={styles.status}>
        <span className={styles.dot} />
        <span>러닝 중</span>
      </div>
      <div className={styles.courseInfo}>
        <strong>{currentRun.courseName}</strong>
        <span>
          {currentRun.parkName}
          {' · '}
          {currentRun.distanceKm.toFixed(1)}
          km
        </span>
      </div>
      <div className={styles.elapsed}>{formatDuration(elapsedSeconds)}</div>
      <button type="button" onClick={onFinishRun}>
        러닝 종료
      </button>
    </aside>
  );
}
