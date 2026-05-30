export type CourseLevel = 'easy' | 'medium' | 'hard';
export type CrowdLevel = 'low' | 'medium' | 'high' | 'unknown';
export type YesNo = 'Y' | 'N';
export type RecommendGrade = 'A' | 'B' | 'C' | 'D';

export interface Course {
  course_id: string;
  course_name: string;
  park_name: string;
  address: string;
  course_type: string;
  crowd_level: CrowdLevel;
  distance_km: number;
  district: string;
  facility_score: number;
  final_recommend_score: number;
  latitude?: number;
  level: CourseLevel;
  linked_population_area: string;
  longitude?: number;
  night_safe: YesNo;
  note: string;
  recommend_grade: RecommendGrade;
  route_available: YesNo;
  surface_type: string;

  // Legacy display-only fields kept for mockData fallback compatibility.
  description?: string;
  image_url?: string;
  location?: string;
}

export interface FilterState {
  level: string;
  crowd: string;
  nightSafe: string;
  maxKm: string;
}

export type FilterKey = keyof FilterState;

export interface CourseRoutePoint {
  point_order: number;
  latitude: number;
  longitude: number;
}

export interface CourseRoute {
  course_id: string;
  points: CourseRoutePoint[];
}

export interface RunningCourse {
  courseId: string;
  courseName: string;
  parkName: string;
  distanceKm: number;
  startedAt: number;
}

export interface RunRecord {
  id: string;
  courseId: string;
  courseName: string;
  parkName: string;
  distanceKm: number;
  startedAt: string;
  durationSeconds: number;
}
