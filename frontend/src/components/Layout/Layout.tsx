import React, { useState, useEffect } from 'react';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { label: '홈', path: '/' },
  { label: '코스 전체', path: '/courses' },
  { label: '지도', path: '/map' },
  { label: '내 기록', path: '/mypage' },
] as const;

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Layout({ children, currentPath, onNavigate }: LayoutProps) {
  const now = useNow();

  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => onNavigate('/')} role="button" tabIndex={0}>
          <span className={styles.logoDot} />
          <span className={styles.logoTxt}>서대문 GO</span>
        </div>
        <ul className={styles.links}>
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <a
                href="#"
                className={`${styles.link} ${currentPath === item.path ? styles.linkActive : ''}`}
                onClick={(e) => { e.preventDefault(); onNavigate(item.path); }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.right}>
          <span className={styles.dot} />
          <span className={styles.region}>오늘 {timeStr} · 서대문구</span>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <span className={styles.footerLogo}>서대문 GO</span>
        <span className={styles.footerTxt}>서대문구 공원·등산로·도로 러닝 코스 · 유동인구 데이터 기반</span>
      </footer>
    </div>
  );
}
