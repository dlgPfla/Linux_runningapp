import { useEffect, useMemo, useState } from 'react';
import styles from './HomePage.module.css';
import { fetchCourses } from '../api/coursesApi';
import { MOCK_COURSES } from '../data/mockData';
import type { Course, FilterKey, FilterState } from '../types';

const LEVEL_KO: Record<string, string> = { easy: '초급', medium: '중급', hard: '고급' };
const CROWD_KO: Record<string, string> = { low: '한산', medium: '보통', high: '혼잡', unknown: '미확인' };
const DEFAULT_COURSE_IMAGE = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80';

function getCourseImage(course: Course) {
  return course.image_url || DEFAULT_COURSE_IMAGE;
}

function getCourseLocation(course: Course) {
  return course.park_name || course.location || '서대문구';
}

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

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.opt} ${active ? styles.optOn : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PreviewCard({ course, onNavigate }: { course: Course; onNavigate: (p: string) => void }) {
  const crowdStyle =
    course.crowd_level === 'low' ? styles.tagLow
    : course.crowd_level === 'high' ? styles.tagHigh
    : styles.tagMid;
  const imageUrl = getCourseImage(course);
  const location = getCourseLocation(course);

  return (
    <article
      className={styles.previewCard}
      onClick={() => onNavigate('/courses')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate('/courses')}
    >
      <div className={styles.previewImgWrap}>
        <img src={imageUrl} alt={course.course_name} className={styles.previewImg} loading="lazy" />
        <span className={`${styles.previewGrade} ${course.recommend_grade === 'A' ? styles.gradeA : styles.gradeB}`}>
          {course.recommend_grade}등급
        </span>
      </div>
      <div className={styles.previewBody}>
        <p className={styles.previewLocation}>{location}</p>
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    level: '', crowd: '', nightSafe: '', maxKm: '',
  });

  useEffect(() => {
    let ignore = false;

    fetchCourses()
      .then((apiCourses) => {
        console.log('API courses loaded:', apiCourses.length);
        if (!ignore) {
          setCourses(apiCourses);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setCourses(MOCK_COURSES);
          setError(err instanceof Error ? err.message : 'Failed to fetch courses');
        }
        console.warn('API courses failed, using mock fallback', err);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  function toggle(key: FilterKey, val: string) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  }

  const filtered = useMemo(() => {
    let list = [...courses];
    if (filters.level)              list = list.filter((c) => c.level === filters.level);
    if (filters.nightSafe === 'Y')  list = list.filter((c) => c.night_safe === 'Y');
    if (filters.crowd === 'low')    list = list.filter((c) => c.crowd_level === 'low' || c.crowd_level === 'unknown');
    if (filters.crowd === 'medium') list = list.filter((c) => c.crowd_level !== 'high');
    if (filters.maxKm === '5')      list = list.filter((c) => c.distance_km <= 5);
    if (filters.maxKm === '10')     list = list.filter((c) => c.distance_km <= 10);
    return list.sort((a, b) => b.final_recommend_score - a.final_recommend_score);
  }, [courses, filters]);

  const hasFilter = Object.values(filters).some(Boolean);
  const total = courses.length;
  const quiet = courses.filter((c) => c.crowd_level === 'low').length;
  const nightSafe = courses.filter((c) => c.night_safe === 'Y').length;
  const apiStatusText = loading
    ? 'API 데이터 확인 중'
    : error
      ? 'API 연결 실패로 임시 데이터 표시 중'
      : '실제 API 데이터 사용 중';
  const previewSubText = loading
    ? '코스 데이터를 불러오는 중이에요'
    : error
      ? 'API 연결 실패로 임시 데이터 표시 중'
      : hasFilter
        ? '설정한 조건 기준 · 추천점수 순'
        : '추천점수 높은 순으로 보여줘요';

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
            총 {total}개 코스 중 조건을 설정하면<br />딱 맞는 코스를 추려드려요.
          </p>

          {/* 통계 카드 — 실제 데이터 기반 */}
          <div className={styles.statGrid}>
            <StatCard icon="🏃" label="전체 코스" value={`${total}개`} sub="공원·산·수변·도로" />
            <StatCard icon="🌿" label="한산한 코스" value={`${quiet}개`} sub="여유롭게 달리기 좋아요" />
            <StatCard icon="🌙" label="야간 안전" value={`${nightSafe}개`} sub="저녁에도 안전한 코스" />
          </div>
        </div>

        {/* 조건 설정 패널 */}
        <div className={styles.filterBox}>
          <p className={styles.filterTitle}>조건 설정</p>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>난이도</p>
            <div className={styles.opts}>
              <FilterOption label="초급" active={filters.level === 'easy'} onClick={() => toggle('level', 'easy')} />
              <FilterOption label="중급" active={filters.level === 'medium'} onClick={() => toggle('level', 'medium')} />
              <FilterOption label="고급" active={filters.level === 'hard'} onClick={() => toggle('level', 'hard')} />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>혼잡도</p>
            <div className={styles.opts}>
              <FilterOption label="한산한 곳" active={filters.crowd === 'low'} onClick={() => toggle('crowd', 'low')} />
              <FilterOption label="보통까지" active={filters.crowd === 'medium'} onClick={() => toggle('crowd', 'medium')} />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>야간 안전</p>
            <div className={styles.opts}>
              <FilterOption label="야간 안전 필요" active={filters.nightSafe === 'Y'} onClick={() => toggle('nightSafe', 'Y')} />
            </div>
          </div>

          <div className={styles.filterRow}>
            <p className={styles.filterLbl}>최대 거리</p>
            <div className={styles.opts}>
              <FilterOption label="5km 이내" active={filters.maxKm === '5'} onClick={() => toggle('maxKm', '5')} />
              <FilterOption label="10km 이내" active={filters.maxKm === '10'} onClick={() => toggle('maxKm', '10')} />
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
          <p className={styles.filterLbl}>{apiStatusText}</p>
        </div>
      </section>

      {/* ══ 코스 미리보기 ══ */}
      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <div>
            <h2 className={styles.previewTitle}>
              {hasFilter ? `조건에 맞는 코스 ${filtered.length}개` : '추천 코스'}
            </h2>
            <p className={styles.previewSub}>{previewSubText}</p>
          </div>
          <button type="button" className={styles.moreBtn} onClick={() => onNavigate('/courses')}>
            전체 보기 →
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🌿</p>
            <p className={styles.emptyTitle}>
              {loading ? '코스를 불러오는 중이에요' : '조건에 맞는 코스가 없어요'}
            </p>
            <p className={styles.emptySub}>
              {loading ? '잠시만 기다려주세요.' : '조건을 조금 느슨하게 바꿔보세요!'}
            </p>
          </div>
        ) : (
          <div className={styles.previewList}>
            {filtered.slice(0, 3).map((c) => (
              <PreviewCard key={c.course_id} course={c} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        <button type="button" className={styles.allBtn} onClick={() => onNavigate('/courses')}>
          코스 전체 보기 — {total}개
        </button>
      </section>
    </div>
  );
}
