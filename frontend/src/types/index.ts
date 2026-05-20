export interface Course {
  course_id: string;
  course_name: string;
  level: 'easy' | 'medium' | 'hard';
  distance_km: number;
  crowd_level: 'low' | 'medium' | 'high' | 'unknown';
  night_safe: 'Y' | 'N';
  route_available: 'Y' | 'N';
  final_recommend_score: number;
  recommend_grade: 'A' | 'B';
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
