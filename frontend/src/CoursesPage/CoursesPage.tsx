import React, { useState, useMemo } from 'react';
import styles from './CoursesPage.module.css';
import type { Course, FilterState, FilterKey } from '../../types';
import { MOCK_COURSES } from '../../data/mockData';

const LEVEL_KO: Record<string, string> = { easy: '초급', medium: '중급', hard: '고급' };
const CROWD_KO: Record<string, string> = { low: '한산', medium: '보통', high: '혼잡', unknown: '미확인' };

// ══════════════════════════════════════
// 코스 상세 모달
// ══════════════════════════════════════
function CourseModal({ course, onClose }: { course: Course; onClose: () => void }) {
  function onBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const crowdCardStyle =
    course.crowd_level === 'low' ? styles.infoLow
    : course.crowd_level === 'high' ? styles.infoHigh
    : styles.infoMid;

  return (
    <div className={styles.backdrop} onClick={onBackdrop}>
      <div className={styles.modal}>

        {/* 이미지 + 닫기 + 오버레이 텍스트 */}
        <div className={styles.modalImgWrap}>
          <img src={course.image_url} alt={course.course_name} className={styles.modalImg} />
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
          <div className={styles.modalImgOverlay}>
            <p className={styles.modalLocation}>{course.location}</p>
            <h2 className={styles.modalName}>{course.course_name}</h2>
          </div>
        </div>

        {/* 본문 */}
        <div className={styles.modalBody}>

          {/* 핵심 정보 4칸 */}
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <p className={styles.infoLbl}>거리</p>
              <p className={styles.infoVal}>{course.distance_km.toFixed(1)} km</p>
            </div>
            <div className={styles.infoCard}>
              <p className={styles.infoLbl}>난이도</p>
              <p className={styles.infoVal}>{LEVEL_KO[course.level]}</p>
            </div>
            <div className={`${styles.infoCard} ${crowdCardStyle}`}>
              <p className={styles.infoLbl}>현재 혼잡도</p>
              <p className={styles.infoVal}>{CROWD_KO[course.crowd_level]}</p>
            </div>
            <div className={styles.infoCard}>
              <p className={styles.infoLbl}>야간 안전</p>
              <p className={`${styles.infoVal} ${course.night_safe === 'Y' ? styles.safeY : styles.safeN}`}>
                {course.night_safe === 'Y' ? '✓ 안전' : '⚠ 주의'}
              </p>
            </div>
          </div>

          {/* 추천 점수 바 */}
          <div className={styles.scoreRow}>
            <span className={styles.scoreLbl}>추천 점수</span>
            <div className={styles.scoreBarBg}>
              <div className={styles.scoreBarFill} style={{ width: `${course.final_recommend_score}%` }} />
            </div>
            <span className={styles.scoreNum}>{course.final_recommend_score}점</span>
          </div>

          {/* 설명 */}
          <p className={styles.modalDesc}>{course.description}</p>

          {/* 태그 */}
          <div className={styles.modalTags}>
            <span className={styles.mTag}>{course.distance_km.toFixed(1)} km</span>
            <span className={styles.mTag}>{LEVEL_KO[course.level]}</span>
            <span className={`${styles.mTag} ${
              course.crowd_level === 'low' ? styles.mTagLow
              : course.crowd_level === 'high' ? styles.mTagHigh
              : styles.mTagMid}`}>
              {CROWD_KO[course.crowd_level]}
            </span>
            {course.night_safe === 'Y' && <span className={`${styles.mTag} ${styles.mTagLow}`}>야간 안전</span>}
            {course.route_available === 'Y' && <span className={styles.mTag}>루트 지원</span>}
          </div>

          {/* 버튼 */}
          <div className={styles.modalBtns}>
            <button type="button" className={styles.btnPrimary}>이 코스 러닝 시작</button>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>목록으로 돌아가기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 코스 행 카드
// ══════════════════════════════════════
function CourseRow({ course, onClick }: { course: Course; onClick: () => void }) {
  const crowdStyle =
    course.crowd_level === 'low' ? styles.chipLow
    : course.crowd_level === 'high' ? styles.chipHigh
    : styles.chipMid;

  return (
    <article
      className={styles.row}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className={styles.rowImgWrap}>
        <img src={course.image_url} alt={course.course_name} className={styles.rowImg} loading="lazy" />
      </div>
      <div className={styles.rowBody}>
        <div className={styles.rowTop}>
          <span className={`${styles.badge} ${course.recommend_grade === 'A' ? styles.badgeA : styles.badgeB}`}>
            {course.recommend_grade}등급
          </span>
          <p className={styles.rowLocation}>{course.location}</p>
        </div>
        <h3 className={styles.rowName}>{course.course_name}</h3>
        <div className={styles.rowChips}>
          <span className={styles.chip}>{course.distance_km.toFixed(1)} km</span>
          <span className={styles.chip}>{LEVEL_KO[course.level]}</span>
          <span className={`${styles.chip} ${crowdStyle}`}>{CROWD_KO[course.crowd_level]}</span>
          {course.night_safe === 'Y'
            ? <span className={`${styles.chip} ${styles.chipLow}`}>야간 안전</span>
            : <span className={`${styles.chip} ${styles.chipWarn}`}>야간 주의</span>}
        </div>
      </div>
      <div className={styles.rowScore}>
        <p className={styles.rowScoreNum}>{course.final_recommend_score}</p>
        <p className={styles.rowScoreLbl}>추천점수</p>
        <p className={styles.rowHint}>클릭해서 상세보기</p>
      </div>
    </article>
  );
}

// ══════════════════════════════════════
// CoursesPage
// ══════════════════════════════════════
export default function CoursesPage() {
  const [filters, setFilters] = useState<FilterState>({ level: '', crowd: '', nightSafe: '', maxKm: '' });
  const [sort, setSort] = useState<'score' | 'distance'>('score');
  const [selected, setSelected] = useState<Course | null>(null);

  function toggle(key: FilterKey, val: string) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  }

  const filtered = useMemo(() => {
    let list = [...MOCK_COURSES];
    if (filters.level)             list = list.filter((c) => c.level === filters.level);
    if (filters.nightSafe === 'Y') list = list.filter((c) => c.night_safe === 'Y');
    if (filters.crowd === 'low')    list = list.filter((c) => c.crowd_level === 'low' || c.crowd_level === 'unknown');
    if (filters.crowd === 'medium') list = list.filter((c) => c.crowd_level !== 'high');
    if (filters.maxKm === '5')     list = list.filter((c) => c.distance_km <= 5);
    if (filters.maxKm === '10')    list = list.filter((c) => c.distance_km <= 10);
    if (sort === 'score')    list.sort((a, b) => b.final_recommend_score - a.final_recommend_score);
    if (sort === 'distance') list.sort((a, b) => a.distance_km - b.distance_km);
    return list;
  }, [filters, sort]);

  function Opt({ label, fKey, val }: { label: string; fKey: FilterKey; val: string }) {
    return (
      <button
        type="button"
        className={`${styles.fOpt} ${filters[fKey] === val ? styles.fOptOn : ''}`}
        onClick={() => toggle(fKey, val)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className={styles.page}>
      {/* 모달 */}
      {selected && <CourseModal course={selected} onClose={() => setSelected(null)} />}

      {/* 페이지 헤더 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>코스 전체</h1>
          <p className={styles.pageSub}>서대문구 러닝 코스 42개 · 카드를 클릭하면 상세 정보를 볼 수 있어요</p>
        </div>
        <div className={styles.sortRow}>
          <span className={styles.sortLbl}>정렬</span>
          <button type="button" className={`${styles.sortBtn} ${sort === 'score' ? styles.sortOn : ''}`} onClick={() => setSort('score')}>추천순</button>
          <button type="button" className={`${styles.sortBtn} ${sort === 'distance' ? styles.sortOn : ''}`} onClick={() => setSort('distance')}>거리순</button>
        </div>
      </div>

      <div className={styles.body}>
        {/* 필터 사이드바 */}
        <aside className={styles.filterPanel}>
          <p className={styles.fTitle}>필터</p>

          <div className={styles.fGroup}>
            <p className={styles.fLbl}>난이도</p>
            <div className={styles.fOpts}>
              <Opt label="초급" fKey="level" val="easy" />
              <Opt label="중급" fKey="level" val="medium" />
              <Opt label="고급" fKey="level" val="hard" />
            </div>
          </div>
          <div className={styles.fGroup}>
            <p className={styles.fLbl}>혼잡도</p>
            <div className={styles.fOpts}>
              <Opt label="한산한 곳" fKey="crowd" val="low" />
              <Opt label="보통까지" fKey="crowd" val="medium" />
            </div>
          </div>
          <div className={styles.fGroup}>
            <p className={styles.fLbl}>야간 안전</p>
            <div className={styles.fOpts}>
              <Opt label="야간 안전 필요" fKey="nightSafe" val="Y" />
            </div>
          </div>
          <div className={styles.fGroup}>
            <p className={styles.fLbl}>최대 거리</p>
            <div className={styles.fOpts}>
              <Opt label="5km 이내" fKey="maxKm" val="5" />
              <Opt label="10km 이내" fKey="maxKm" val="10" />
            </div>
          </div>

          <button type="button" className={styles.resetBtn}
            onClick={() => setFilters({ level: '', crowd: '', nightSafe: '', maxKm: '' })}>
            필터 초기화
          </button>
        </aside>

        {/* 코스 목록 */}
        <div className={styles.list}>
          <p className={styles.resultCount}><strong>{filtered.length}개</strong> 코스</p>
          {filtered.length === 0
            ? <div className={styles.empty}>조건에 맞는 코스가 없어요.<br />필터를 조정해보세요.</div>
            : filtered.map((c) => (
                <CourseRow key={c.course_id} course={c} onClick={() => setSelected(c)} />
              ))
          }
        </div>
      </div>
    </div>
  );
}
