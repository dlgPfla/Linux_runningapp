export interface PopulationPoint {
  name: string;
  avg_population: number;
  crowd_level: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  risk_color: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

// 유동인구 API 응답 객체에서 지도 마커에 사용할 population 배열을 반환함.
export async function fetchPopulation(): Promise<PopulationPoint[]> {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/population`);

  if (!response.ok) {
    throw new Error(`Failed to fetch population: ${response.status}`);
  }

  const data = await response.json() as { total: number; population: PopulationPoint[] };

  return data.population;
}
