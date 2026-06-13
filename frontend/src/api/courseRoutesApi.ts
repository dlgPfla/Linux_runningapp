import type { CourseRoute } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

// 코스별 좌표 목록을 받아 지도에서 루트를 찾을 수 있도록 routes 배열을 반환함.
export async function fetchCourseRoutes(): Promise<CourseRoute[]> {
  const requestUrl = `${API_BASE_URL}/api/course-routes`;
  console.log('course routes request url:', requestUrl);

  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch course routes: ${response.status}`);
  }

  const data = await response.json() as { total: number; routes: CourseRoute[] };
  console.log('course routes response:', data);
  console.log('course routes loaded:', data.routes?.length);

  return data.routes ?? [];
}
