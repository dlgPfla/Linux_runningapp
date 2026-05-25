import type { Course } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export async function fetchCourses(): Promise<Course[]> {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/courses`);

  if (!response.ok) {
    throw new Error(`Failed to fetch courses: ${response.status}`);
  }

  const data = await response.json() as { total: number; courses: Course[] };

  return data.courses;
}
