import React, { useState, useMemo } from 'react';
import styles from './HomePage.module.css';
import type { Course, FilterState, FilterKey } from '../../types';
import { MOCK_COURSES } from '../../data/mockData';

const LEVEL_KO: Record<string, string> = { easy: '초급', medium: '중급', hard: '고급' };
const CROWD_KO: Record<string, string> = { low: '한산', medium: '보통', high: '혼잡', unknown: '미확인' };

// 실제 데이터에서 통계 계산
const TOTAL = MOCK_COURSES.length;
const QUIET = MOCK_COURSES.filter((c) => c.crowd_level === 'low').length;
const NIGHT_SAFE = MOCK_COURSES.filter((c) => c.night_safe === 'Y').length;

interface HomePageProps {
  onNavigate: (path: string) => void;
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statSub}>{sub}</p>
      </div>
    </div>
  );
}

function PreviewCard({ course, onNavigate }: { course: Course; onNavigate: (p: string) => void }) {
  const crowdStyle =
    course.crowd_level === 'low' ? styles.tagLow
    : course.crowd_level === 'high' ? styles.tagHigh
    : styles.tagMid;

  return (
    <article
      className={styles.previewCard}
      onClick={() => onNavigate('/courses')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate('/courses')}
    >
      <div className={styles.previewImgWrap}>
        <img src={course.image_url} alt={course.course_name} className={styles.previewImg} loading="lazy" />
        <span className={`${styles.previewGrade} ${course.recommend_grade === 'A' ? styles.gradeA : styles.gradeB}`}>
          {course.recommend_grade}등급
        </span>
      </div>
      <div className={styles.previewBody}>
        <p className={styles.previewLocation}>{course.location}</p>
        <h3 className={styles.previewName}>{course.course_name}</h3>
        <div className={styles.previewTags}>
          <span className={styles.tag}>{course.distance_km.toFixed(1)} km</span>
          <span className={styles.tag}>{LEVEL_KO[course.level]}</span>
          <span className={`${styles.tag} ${crowdStyle}`}>{CROWD_KO[course.crowd_level]}</span>
          {course.night_safe === 'Y'
            ? <span className={`${styles.tag} ${styles.tagLow}`}>야간 안전</span>
            : <span className={`${styles.tag} ${styles.tagWarn}`}>야간 주의</span>}
        </div>
      </div>
      <div className={styles.previewScore}>
        <span className={styles.scoreNum}>{course.final_recommend_score}</span>
        <span className={styles.scoreLbl}>점</span>
      </div>
    </article>
  );
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [filters, setFilters] = useState<FilterState>({
    level: '', crowd: '', nightSafe: '', maxKm: '',
  });

  function toggle(key: FilterKey, val: string) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  }

  const filtered = useMemo(() => {
    let list = [...MOCK_COURSES];
    if (filters.level)              list = list.filter((c) => c.level === filters.level);
    if (filters.nightSafe === 'Y')  list = list.filter((c) => c.night_safe === 'Y');
    if (filters.crowd === 'low')    list = list.filter((c) => c.crowd_level === 'low' || c.crowd_level === 'unknown');
    if (filters.crowd === 'medium') list = list.filter((c) => c.crowd_level !== 'high');
    if (filters.maxKm === '5')      list = list.filter((c) => c.distance_km <= 5);
    if (filters.maxKm === '10')     list = list.filter((c) => c.distance_km <= 10);
    return list.sort((a, b) => b.final_recommend_score - a.final_recommend_score);
  }, [filters]);

  const hasFilter = Object.values(filters).some(Boolean);

  function Opt({ label, fKey, val }: { label: string; fKey: FilterKey; val: string }) {
    return (
      <button
        type="button"
        className={`${styles.opt} ${filters[fKey] === val ? styles.optOn : ''}`}
        onClick={() => toggle(fKey, val)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={styles.page}>

      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>
            <span className={styles.heroTagDot} />
            서대문구 러닝 코스 추천
          </div>
          <h1 className={styles.heroTitle}>
            내 조건에 맞는<br />
            <em className={styles.heroEm}>코스를 찾아보세요</em>
          </h1>
          <p className={styles.heroSub}>
            총 {TOTAL}개 코스 중 조건을 설정하면<br />딱 맞는 코스를 추려드려요.
          </p>

          {/* 통계 카드 — 실제 데이터 기반 */}
          <div className={styles.statGrid}>
            <StatCard icon="🏃" label="전체 코스" value={`${TOTAL}개`} sub="공원·산·수변·도로" />
            <StatCard icon="🌿" label="한산한 코스" value={`${QUIET}개`} sub="여유롭게 달리기 좋아요" />
            <StatCard icon="🌙" label="야간 안전" value={`${NIGHT_SAFE}개`} sub="저녁에도 안전한 코스" />
          </div>
        </div>

        {/* 조건 설정 패널 */}
        <div className={styles.filterBox}>
          <p className={styles.filterTitle}>조건 설정</p>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>난이도</p>
            <div className={styles.opts}>
              <Opt label="초급" fKey="level" val="easy" />
              <Opt label="중급" fKey="level" val="medium" />
              <Opt label="고급" fKey="level" val="hard" />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>혼잡도</p>
            <div className={styles.opts}>
              <Opt label="한산한 곳" fKey="crowd" val="low" />
              <Opt label="보통까지" fKey="crowd" val="medium" />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>야간 안전</p>
            <div className={styles.opts}>
              <Opt label="야간 안전 필요" fKey="nightSafe" val="Y" />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>최대 거리</p>
            <div className={styles.opts}>
              <Opt label="5km 이내" fKey="maxKm" val="5" />
              <Opt label="10km 이내" fKey="maxKm" val="10" />
            </div>
          </div>

          {hasFilter && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => setFilters({ level: '', crowd: '', nightSafe: '', maxKm: '' })}
            >
              조건 초기화
            </button>
          )}

          <div className={styles.filterResult}>
            <span className={styles.filterResultNum}>{filtered.length}개</span>
            <span className={styles.filterResultTxt}> 코스가 조건에 맞아요</span>
          </div>
        </div>
      </section>

      {/* ══ 코스 미리보기 ══ */}
      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <div>
            <h2 className={styles.previewTitle}>
              {hasFilter ? `조건에 맞는 코스 ${filtered.length}개` : '추천 코스'}
            </h2>
            <p className={styles.previewSub}>
              {hasFilter ? '설정한 조건 기준 · 추천점수 순' : '추천점수 높은 순으로 보여줘요'}
            </p>
          </div>
          <button type="button" className={styles.moreBtn} onClick={() => onNavigate('/courses')}>
            전체 보기 →
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🌿</p>
            <p className={styles.emptyTitle}>조건에 맞는 코스가 없어요</p>
            <p className={styles.emptySub}>조건을 조금 느슨하게 바꿔보세요!</p>
          </div>
        ) : (
          <div className={styles.previewList}>
            {filtered.slice(0, 3).map((c) => (
              <PreviewCard key={c.course_id} course={c} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        <button type="button" className={styles.allBtn} onClick={() => onNavigate('/courses')}>
          코스 전체 보기 — {TOTAL}개
        </button>
      </section>
    </div>
  );
}
