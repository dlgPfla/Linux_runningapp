import React from 'react';
import styles from './MapPage.module.css';

export default function MapPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>지도</h1>
        <p className={styles.sub}>서대문구 러닝 코스 & 유동인구 현황</p>
      </div>
      <div className={styles.mapArea}>
        <div className={styles.placeholder}>
          <p className={styles.icon}>🗺️</p>
          <p className={styles.ptitle}>지도 연동 예정</p>
          <p className={styles.psub}>백엔드 API 연결 후 이 자리에 지도가 표시됩니다.</p>
          <div className={styles.apiBox}>
            <p className={styles.apiLbl}>연결할 API</p>
            <code className={styles.apiCode}>GET /api/population</code>
            <code className={styles.apiCode}>GET /api/courses</code>
          </div>
        </div>
      </div>
    </div>
  );
}
