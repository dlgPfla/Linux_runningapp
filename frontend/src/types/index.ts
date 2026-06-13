export type CourseLevel = 'easy' | 'medium' | 'hard';
export type CrowdLevel = 'low' | 'medium' | 'high' | 'unknown';
export type YesNo = 'Y' | 'N';
export type RecommendGrade = 'A' | 'B' | 'C' | 'D';

// /api/courses에서 내려오는 실제 코스 데이터 구조에 맞춰 정의한 타입임.
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

  // API 실패 시 사용하는 mockData 화면 필드도 선택적으로 유지함.
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

// /api/course-routes의 좌표와 코스별 points 배열 구조를 표현함.
export interface CourseRoutePoint {
  point_order: number;
  latitude: number;
  longitude: number;
}

export interface CourseRoute {
  course_id: string;
  points: CourseRoutePoint[];
}

// 러닝 시작 후 타이머와 지도에서 함께 사용하는 현재 코스 정보임.
export interface RunningCourse {
  courseId: string;
  courseName: string;
  parkName: string;
  distanceKm: number;
  startedAt: number;
}

// 러닝 종료 시 내 기록 화면에 저장할 결과 정보임.
export interface RunRecord {
  id: string;
  courseId: string;
  courseName: string;
  parkName: string;
  distanceKm: number;
  startedAt: string;
  durationSeconds: number;
}
