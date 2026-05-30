import { useState } from 'react';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import CoursesPage from './CoursesPage/CoursesPage';
import MapPage from './MapPage/MapPage';
import MyPage from './MyPage/MyPage';
import RunningTimer from './components/RunningTimer/RunningTimer';
import type { Course, RunRecord, RunningCourse } from './types';

type Path = '/' | '/courses' | '/map' | '/mypage';

export default function App() {
  const [path, setPath] = useState<Path>('/');
  const [currentRun, setCurrentRun] = useState<RunningCourse | null>(null);
  const [records, setRecords] = useState<RunRecord[]>([]);

  function navigate(to: string) {
    setPath(to as Path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startRun(course: Course) {
    if (currentRun) {
      alert('이미 러닝 중인 코스가 있어요. 먼저 종료해주세요.');
      return;
    }

    setCurrentRun({
      courseId: course.course_id,
      courseName: course.course_name || '이름 없는 코스',
      parkName: course.park_name || '서대문구',
      distanceKm: Number(course.distance_km) || 0,
      startedAt: Date.now(),
    });
  }

  function finishRun() {
    if (!currentRun) return;

    const durationSeconds = Math.max(
      1,
      Math.floor((Date.now() - currentRun.startedAt) / 1000),
    );

    const record: RunRecord = {
      id: `${currentRun.courseId}-${Date.now()}`,
      courseId: currentRun.courseId,
      courseName: currentRun.courseName,
      parkName: currentRun.parkName,
      distanceKm: currentRun.distanceKm,
      startedAt: new Date(currentRun.startedAt).toLocaleString('ko-KR'),
      durationSeconds,
    };

    setRecords((prev) => [record, ...prev]);
    setCurrentRun(null);
  }

  return (
    <>
      <Layout currentPath={path} onNavigate={navigate}>
        {path === '/'        && <HomePage onNavigate={navigate} />}
        {path === '/courses' && <CoursesPage />}
        {path === '/map'     && <MapPage currentRun={currentRun} onStartRun={startRun} />}
        {path === '/mypage'  && <MyPage records={records} />}
      </Layout>
      <RunningTimer currentRun={currentRun} onFinishRun={finishRun} />
    </>
  );
}
