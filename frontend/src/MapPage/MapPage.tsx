import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCourses } from '../api/coursesApi';
import { fetchCourseRoutes } from '../api/courseRoutesApi';
import { fetchPopulation, type PopulationPoint } from '../api/populationApi';
import type { Course, CourseRoute, RunningCourse } from '../types';
import styles from './MapPage.module.css';

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;
const KAKAO_SDK_SCRIPT_ID = 'kakao-map-sdk';
const MAP_CENTER = { latitude: 37.5791, longitude: 126.9368 };
const ROUTE_UNAVAILABLE_MESSAGE = '이 코스는 아직 지도 루트 선이 준비되지 않았습니다.';

const MAP_ERROR_MESSAGES = {
  sdkLoadFailed: '카카오맵 SDK를 불러오지 못했습니다',
  kakaoMissing: '카카오맵 객체를 찾을 수 없습니다',
  mapCreateFailed: '지도 생성 중 오류가 발생했습니다',
} as const;

type CourseWithCoordinates = Course & {
  latitude: number;
  longitude: number;
};

type ParkCourseGroup = {
  parkName: string;
  latitude: number;
  longitude: number;
  courses: CourseWithCoordinates[];
};

type ValidRoutePoint = {
  point_order: number;
  latitude: number;
  longitude: number;
};

interface MapPageProps {
  currentRun: RunningCourse | null;
  onStartRun: (course: Course) => void;
}

interface KakaoLatLngBoundsInstance {
  extend: (latlng: KakaoLatLngInstance) => void;
}

interface KakaoProjectionInstance {
  containerPointFromCoords: (latlng: KakaoLatLngInstance) => {
    x: number;
    y: number;
  };
}

type KakaoMapWithCamera = KakaoMapInstance & {
  getCenter?: () => KakaoLatLngInstance;
  getProjection: () => KakaoProjectionInstance;
  setBounds: (bounds: KakaoLatLngBoundsInstance) => void;
  setCenter: (latlng: KakaoLatLngInstance) => void;
};

type KakaoMapsWithRouteDrawing = KakaoMapsNamespace & {
  CustomOverlay: new (options: {
    position: KakaoLatLngInstance;
    content: HTMLElement | string;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlayInstance;
  LatLngBounds: new () => KakaoLatLngBoundsInstance;
  event?: {
    addListener: (
      target: KakaoMapInstance,
      type: string,
      handler: () => void
    ) => void;
    removeListener?: (
      target: KakaoMapInstance,
      type: string,
      handler: () => void
    ) => void;
  };
};

let kakaoSdkPromise: Promise<void> | null = null;

function loadKakaoMapSdk(appKey: string): Promise<void> {
  if (kakaoSdkPromise) return kakaoSdkPromise;

  kakaoSdkPromise = loadKakaoMapSdkOnce(appKey).catch((error) => {
    kakaoSdkPromise = null;
    throw error;
  });

  return kakaoSdkPromise;
}

function loadKakaoMapSdkOnce(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve);
      return;
    }

    const existingScript = document.getElementById(KAKAO_SDK_SCRIPT_ID);
    if (existingScript && !window.kakao?.maps) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = KAKAO_SDK_SCRIPT_ID;
    script.async = true;
    console.log('Loading Kakao SDK...');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => {
      console.log('Kakao SDK script loaded');
      if (!window.kakao?.maps) {
        console.error('window.kakao.maps is not available');
        reject(new Error(MAP_ERROR_MESSAGES.kakaoMissing));
        return;
      }

      window.kakao.maps.load(resolve);
    };
    script.onerror = () => {
      console.error('Kakao SDK script failed to load');
      reject(new Error(MAP_ERROR_MESSAGES.sdkLoadFailed));
    };
    console.log('Appending Kakao SDK script');
    console.log('Current origin:', window.location.origin);
    console.log('Kakao SDK url without key:', 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=***&autoload=false');
    document.head.appendChild(script);
  });
}

function getMarkerClass(crowdLevel: PopulationPoint['crowd_level']) {
  if (crowdLevel === 'high') return styles.markerHigh;
  if (crowdLevel === 'medium') return styles.markerMedium;
  return styles.markerLow;
}

function getCrowdLabel(crowdLevel: PopulationPoint['crowd_level']) {
  if (crowdLevel === 'high') return '혼잡';
  if (crowdLevel === 'medium') return '보통';
  return '여유';
}

function getCourseCrowdLabel(crowdLevel: Course['crowd_level']) {
  if (crowdLevel === 'unknown') return '미확인';
  return getCrowdLabel(crowdLevel);
}

function getLevelLabel(level: Course['level']) {
  if (level === 'easy') return '초급';
  if (level === 'hard') return '상급';
  return '중급';
}

function getNightSafeLabel(nightSafe: Course['night_safe']) {
  return nightSafe === 'Y' ? '야간 안전' : '야간 주의';
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getRouteWithEnoughPoints(route: CourseRoute | undefined) {
  if (!route) return null;

  const points = route.points
    .map((point) => ({
      point_order: Number(point.point_order),
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }))
    .filter((point) => (
      Number.isFinite(point.point_order)
      && Number.isFinite(point.latitude)
      && Number.isFinite(point.longitude)
    ))
    .sort((a, b) => Number(a.point_order) - Number(b.point_order));

  return points.length >= 2 ? { ...route, points } : null;
}

function groupCoursesByPark(courses: CourseWithCoordinates[]): ParkCourseGroup[] {
  const groups = new Map<string, ParkCourseGroup>();

  courses.forEach((course) => {
    const parkName = course.park_name || course.location || '이름 없는 공원';
    const existing = groups.get(parkName);

    if (existing) {
      existing.courses.push(course);
      return;
    }

    groups.set(parkName, {
      parkName,
      latitude: course.latitude,
      longitude: course.longitude,
      courses: [course],
    });
  });

  return Array.from(groups.values());
}

export default function MapPage({ currentRun, onStartRun }: MapPageProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMapWithCamera | null>(null);
  const populationOverlaysRef = useRef<KakaoOverlayInstance[]>([]);
  const parkOverlaysRef = useRef<KakaoOverlayInstance[]>([]);
  const infoOverlayRef = useRef<KakaoOverlayInstance | null>(null);
  const routePolylineRefs = useRef<Array<{ setMap: (map: KakaoMapInstance | null) => void }>>([]);
  const routeOverlayRefs = useRef<KakaoOverlayInstance[]>([]);
  const previousRunIdRef = useRef<string | null>(null);

  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [population, setPopulation] = useState<PopulationPoint[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseRoutes, setCourseRoutes] = useState<CourseRoute[]>([]);
  const [selectedParkGroup, setSelectedParkGroup] = useState<ParkCourseGroup | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithCoordinates | null>(null);
  const [selectedRouteMessage, setSelectedRouteMessage] = useState('');
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<ValidRoutePoint[]>([]);
  const [routeSvgPoints, setRouteSvgPoints] = useState('');
  const [routeSvgSize, setRouteSvgSize] = useState({ width: 0, height: 0 });

  const [populationLoading, setPopulationLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [populationError, setPopulationError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const coursesWithCoordinates = useMemo(
    () => courses.filter((course): course is CourseWithCoordinates => (
      isFiniteCoordinate(course.latitude) && isFiniteCoordinate(course.longitude)
    )),
    [courses],
  );

  const parkGroups = useMemo(
    () => groupCoursesByPark(coursesWithCoordinates),
    [coursesWithCoordinates],
  );

  const isRunningMode = Boolean(currentRun);

  const runningParkGroup = useMemo(() => {
    if (!currentRun) return null;
    return parkGroups.find((group) => (
      group.courses.some((course) => course.course_id === currentRun.courseId)
    )) || null;
  }, [currentRun, parkGroups]);

  const visibleParkGroups = useMemo(() => {
    if (!isRunningMode) return parkGroups;
    return runningParkGroup ? [runningParkGroup] : [];
  }, [isRunningMode, parkGroups, runningParkGroup]);

  const displayedParkGroup = isRunningMode ? runningParkGroup : selectedParkGroup;

  const routeMap = useMemo(() => {
    const mapByCourseId = new Map<string, CourseRoute>();
    courseRoutes.forEach((route) => {
      mapByCourseId.set(route.course_id.trim(), route);
    });
    return mapByCourseId;
  }, [courseRoutes]);

  const clearRouteLayer = useCallback(() => {
    routePolylineRefs.current.forEach((line) => line.setMap(null));
    routePolylineRefs.current = [];

    routeOverlayRefs.current.forEach((overlay) => overlay.setMap(null));
    routeOverlayRefs.current = [];
    setSelectedRoutePoints([]);
    setRouteSvgPoints('');
    setSelectedRouteMessage('');
  }, []);

  const updateRouteSvgPath = useCallback((validPoints: ValidRoutePoint[]) => {
    if (!kakaoMapRef.current || !window.kakao?.maps || !mapContainerRef.current) return;
    if (validPoints.length < 2) {
      setRouteSvgPoints('');
      return;
    }

    const kakaoMaps = window.kakao.maps;
    const projection = kakaoMapRef.current.getProjection();
    const { clientWidth, clientHeight } = mapContainerRef.current;
    const svgPoints = validPoints
      .map((point) => {
        const latLng = new kakaoMaps.LatLng(point.latitude, point.longitude);
        const containerPoint = projection.containerPointFromCoords(latLng);

        return `${containerPoint.x},${containerPoint.y}`;
      })
      .join(' ');

    setRouteSvgSize({ width: clientWidth, height: clientHeight });
    setRouteSvgPoints(svgPoints);
    console.log('svg route points:', svgPoints);
    console.log('SVG route updated');
  }, []);

  useEffect(() => {
    console.log('Kakao key exists:', Boolean(KAKAO_KEY));
  }, []);

  useEffect(() => {
    console.log('courses with coordinates:', coursesWithCoordinates.length);
  }, [coursesWithCoordinates]);

  useEffect(() => {
    console.log('park groups:', parkGroups.length);
  }, [parkGroups]);

  useEffect(() => {
    console.log('currentRun:', currentRun);
    console.log('is running mode:', Boolean(currentRun));
    console.log('visible park groups:', visibleParkGroups.length);
    console.log('selected running course id:', currentRun?.courseId);
  }, [currentRun, visibleParkGroups]);

  useEffect(() => {
    console.log('selected park:', selectedParkGroup?.parkName);
  }, [selectedParkGroup]);

  useEffect(() => {
    const currentMap = kakaoMapRef.current;
    const kakaoMaps = window.kakao?.maps as KakaoMapsWithRouteDrawing | undefined;
    if (!map || !currentMap || !kakaoMaps?.event || selectedRoutePoints.length < 2) return undefined;

    const refreshSvgRoute = () => {
      updateRouteSvgPath(selectedRoutePoints);
    };

    kakaoMaps.event.addListener(currentMap, 'idle', refreshSvgRoute);
    window.addEventListener('resize', refreshSvgRoute);
    refreshSvgRoute();

    return () => {
      kakaoMaps.event?.removeListener?.(currentMap, 'idle', refreshSvgRoute);
      window.removeEventListener('resize', refreshSvgRoute);
    };
  }, [map, selectedRoutePoints, updateRouteSvgPath]);

  useEffect(() => {
    let ignore = false;

    fetchPopulation()
      .then((data) => {
        console.log('population loaded:', data.length);
        if (!ignore) {
          setPopulation(data);
          setPopulationError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setPopulationError('유동인구 데이터를 불러오지 못했습니다');
        }
        console.warn('population failed', err);
      })
      .finally(() => {
        if (!ignore) {
          setPopulationLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchCourses()
      .then((data) => {
        console.log('courses loaded:', data.length);
        if (!ignore) {
          setCourses(data);
          setCoursesError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setCourses([]);
          setCoursesError('코스 데이터를 불러오지 못했습니다');
        }
        console.warn('courses failed', err);
      })
      .finally(() => {
        if (!ignore) {
          setCoursesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchCourseRoutes()
      .then((routes) => {
        console.log('course routes loaded:', routes.length);
        if (!ignore) {
          setCourseRoutes(routes);
          setRouteError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setCourseRoutes([]);
          setRouteError('코스 루트 데이터를 불러오지 못했습니다');
        }
        console.warn('course routes failed', err);
      })
      .finally(() => {
        if (!ignore) {
          setRoutesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!KAKAO_KEY || !mapContainerRef.current) return;

    let ignore = false;

    loadKakaoMapSdk(KAKAO_KEY)
      .then(() => {
        const kakaoMaps = window.kakao?.maps;
        if (ignore || !mapContainerRef.current) return;

        if (!kakaoMaps) {
          console.error('window.kakao.maps is not available');
          setMapError(MAP_ERROR_MESSAGES.kakaoMissing);
          return;
        }

        try {
          console.log('Creating Kakao map');
          const center = new kakaoMaps.LatLng(MAP_CENTER.latitude, MAP_CENTER.longitude);
          const kakaoMap = new kakaoMaps.Map(mapContainerRef.current, {
            center,
            level: 5,
          }) as KakaoMapWithCamera;

          console.log('Kakao map created');
          console.log('map container ref:', mapContainerRef.current);
          console.log('kakao map ref:', kakaoMap);
          console.log('kakao map getCenter exists:', typeof kakaoMap.getCenter);
          kakaoMapRef.current = kakaoMap;
          setMap(kakaoMap);
          setMapError(null);
        } catch (err) {
          console.error('Kakao map create failed', err);
          setMapError(MAP_ERROR_MESSAGES.mapCreateFailed);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setMapError(err instanceof Error ? err.message : MAP_ERROR_MESSAGES.sdkLoadFailed);
        }
        console.warn('Kakao map failed', err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const kakaoMaps = window.kakao?.maps;
    const currentMap = kakaoMapRef.current;
    if (!map || !currentMap || !kakaoMaps) return;

    populationOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    populationOverlaysRef.current = [];
    infoOverlayRef.current?.setMap(null);

    population
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .forEach((point) => {
        const position = new kakaoMaps.LatLng(point.latitude, point.longitude);
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.className = `${styles.marker} ${getMarkerClass(point.crowd_level)}`;
        markerElement.title = point.name;
        markerElement.setAttribute('aria-label', `${point.name} ${getCrowdLabel(point.crowd_level)}`);

        const markerOverlay = new kakaoMaps.CustomOverlay({
          position,
          content: markerElement,
          yAnchor: 0.5,
        });

        markerElement.addEventListener('click', () => {
          infoOverlayRef.current?.setMap(null);

          const infoElement = document.createElement('div');
          infoElement.className = styles.infoWindow;
          infoElement.innerHTML = `
            <strong>${point.name}</strong>
            <span>평균 유동인구 ${Math.round(point.avg_population).toLocaleString()}명</span>
            <em>${getCrowdLabel(point.crowd_level)}</em>
          `;

          const infoOverlay = new kakaoMaps.CustomOverlay({
            position,
            content: infoElement,
            yAnchor: 1.25,
          });

          infoOverlay.setMap(currentMap);
          infoOverlayRef.current = infoOverlay;
        });

        markerOverlay.setMap(currentMap);
        populationOverlaysRef.current.push(markerOverlay);
      });

    return () => {
      populationOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      populationOverlaysRef.current = [];
      infoOverlayRef.current?.setMap(null);
    };
  }, [map, population]);

  useEffect(() => {
    const kakaoMaps = window.kakao?.maps;
    const currentMap = kakaoMapRef.current;
    if (!map || !currentMap || !kakaoMaps) return;

    parkOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    parkOverlaysRef.current = [];

    visibleParkGroups.forEach((group) => {
      const position = new kakaoMaps.LatLng(group.latitude, group.longitude);
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = styles.parkMarker;
      markerElement.title = `${group.parkName} ${group.courses.length}개 코스`;
      markerElement.setAttribute('aria-label', `${group.parkName} ${group.courses.length}개 코스`);
      markerElement.innerHTML = `
        <strong>${group.parkName}</strong>
        <span>${group.courses.length}개 코스</span>
      `;

      markerElement.addEventListener('click', () => {
        setSelectedParkGroup(group);
        setSelectedCourse(null);
        setSelectedRouteMessage('');
        currentMap.setCenter(position);
      });

      const parkOverlay = new kakaoMaps.CustomOverlay({
        position,
        content: markerElement,
        yAnchor: 1,
      });

      parkOverlay.setMap(currentMap);
      parkOverlaysRef.current.push(parkOverlay);
    });

    return () => {
      parkOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      parkOverlaysRef.current = [];
    };
  }, [map, visibleParkGroups]);

  const moveToPark = (group: ParkCourseGroup) => {
    const kakaoMaps = window.kakao?.maps;
    const currentMap = kakaoMapRef.current;
    if (!currentMap || !kakaoMaps) return;

    const center = new kakaoMaps.LatLng(group.latitude, group.longitude);
    currentMap.setCenter(center);
  };

  const handleViewCourse = (course: CourseWithCoordinates, group: ParkCourseGroup) => {
    const route = getRouteWithEnoughPoints(routeMap.get(course.course_id.trim()));
    setSelectedCourse(course);
    setSelectedRouteMessage(route ? '' : ROUTE_UNAVAILABLE_MESSAGE);
    moveToPark(group);
  };

  const handleShowRoute = useCallback((course: CourseWithCoordinates) => {
    console.log('map container ref:', mapContainerRef.current);
    console.log('kakao map ref:', kakaoMapRef.current);
    console.log('kakao map getCenter exists:', typeof kakaoMapRef.current?.getCenter);

    if (!kakaoMapRef.current || !window.kakao?.maps) {
      console.error('Kakao map instance is not ready');
      return;
    }

    clearRouteLayer();

    const currentMap = kakaoMapRef.current;
    const kakaoMaps = window.kakao.maps as KakaoMapsWithRouteDrawing;
    const matchedRoute = courseRoutes.find(
      (route) => route.course_id.trim() === course.course_id.trim(),
    );

    console.log('clicked course id:', course.course_id);
    console.log('available route ids:', courseRoutes.map((route) => route.course_id));
    console.log('matched route:', matchedRoute);

    setSelectedCourse(course);

    if (!matchedRoute) {
      if (Number.isFinite(course.latitude) && Number.isFinite(course.longitude)) {
        currentMap.setCenter(new kakaoMaps.LatLng(course.latitude, course.longitude));
      }
      setSelectedRouteMessage(ROUTE_UNAVAILABLE_MESSAGE);
      return;
    }

    const validPoints: ValidRoutePoint[] = matchedRoute.points
      .map((point) => ({
        point_order: Number(point.point_order),
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      }))
      .filter((point) => (
        Number.isFinite(point.point_order)
        && Number.isFinite(point.latitude)
        && Number.isFinite(point.longitude)
      ))
      .sort((a, b) => a.point_order - b.point_order);

    console.log('valid route point count:', validPoints.length);
    console.log('valid route points:', validPoints);

    if (validPoints.length < 2) {
      if (Number.isFinite(course.latitude) && Number.isFinite(course.longitude)) {
        currentMap.setCenter(new kakaoMaps.LatLng(course.latitude, course.longitude));
      }
      setSelectedRouteMessage('루트 좌표가 부족해서 선을 표시할 수 없습니다.');
      return;
    }

    const path = validPoints.map(
      (point) => new kakaoMaps.LatLng(point.latitude, point.longitude),
    );

    console.log('route path length:', path.length);
    console.log('route start:', validPoints[0]);
    console.log('route end:', validPoints[validPoints.length - 1]);
    console.log('route start point:', validPoints[0]);
    console.log('route end point:', validPoints[validPoints.length - 1]);
    console.log('selected route points:', validPoints.length);

    setSelectedRoutePoints(validPoints);

    const displayPoints = validPoints.filter((_, index) => {
      if (validPoints.length > 30) return index % 2 === 0;
      return true;
    });

    displayPoints.forEach((point) => {
      const routePointOverlay = new kakaoMaps.CustomOverlay({
        position: new kakaoMaps.LatLng(point.latitude, point.longitude),
        content: '<div style="width:7px;height:7px;border-radius:999px;background:rgba(255,107,44,0.9);border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 4px rgba(255,107,44,0.45);"></div>',
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 24,
      });

      routePointOverlay.setMap(currentMap);
      routeOverlayRefs.current.push(routePointOverlay);
    });

    console.log('custom route points drawn:', displayPoints.length);

    const startOverlay = new kakaoMaps.CustomOverlay({
      position: path[0],
      content: '<div style="position:relative;z-index:40;background:#3F6F24;color:white;padding:6px 10px;border-radius:999px;font-weight:700;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">출발</div>',
      yAnchor: 1.45,
      xAnchor: 1.05,
      zIndex: 40,
    });
    console.log('start overlay created');

    const endOverlay = new kakaoMaps.CustomOverlay({
      position: path[path.length - 1],
      content: '<div style="position:relative;z-index:40;background:#111111;color:white;padding:6px 10px;border-radius:999px;font-weight:700;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">도착</div>',
      yAnchor: 1.45,
      xAnchor: -0.05,
      zIndex: 41,
    });
    console.log('end overlay created');

    startOverlay.setMap(currentMap);
    endOverlay.setMap(currentMap);
    routeOverlayRefs.current.push(startOverlay);
    routeOverlayRefs.current.push(endOverlay);
    console.log('route overlays count:', routeOverlayRefs.current.length);

    const bounds = new kakaoMaps.LatLngBounds();
    path.forEach((latLng) => bounds.extend(latLng));
    currentMap.setBounds(bounds);
    updateRouteSvgPath(validPoints);
    window.setTimeout(() => updateRouteSvgPath(validPoints), 100);

    setSelectedRouteMessage('주황색 점과 반투명 선으로 선택한 대표 루트를 표시하고 있습니다.');
  }, [clearRouteLayer, courseRoutes, updateRouteSvgPath]);

  useEffect(() => {
    if (!currentRun) {
      if (!previousRunIdRef.current) return undefined;

      previousRunIdRef.current = null;
      const timeoutId = window.setTimeout(() => {
        clearRouteLayer();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    previousRunIdRef.current = currentRun.courseId;

    if (!runningParkGroup) return undefined;

    const runningCourse = runningParkGroup.courses.find(
      (course) => course.course_id === currentRun.courseId,
    );
    const matchedRoute = courseRoutes.find(
      (route) => route.course_id.trim() === currentRun.courseId.trim(),
    );

    console.log('matched running route:', matchedRoute?.course_id);

    if (runningCourse) {
      const timeoutId = window.setTimeout(() => {
        handleShowRoute(runningCourse);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [clearRouteLayer, courseRoutes, currentRun, handleShowRoute, runningParkGroup]);

  const shouldShowPlaceholder = !KAKAO_KEY || mapError;
  const isLoading = populationLoading || coursesLoading || routesLoading;
  const statusErrors = [populationError, coursesError, routeError].filter(Boolean);
  const statusText = isLoading
    ? '지도 데이터를 불러오는 중입니다'
    : statusErrors.join(' · ')
      || `${population.length}개 혼잡도 지점 · ${visibleParkGroups.length}개 공원 표시 중`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>지도</h1>
        <p className={styles.sub}>서대문구 러닝 코스 & 유동인구 현황</p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mapArea}>
          {shouldShowPlaceholder ? (
            <div className={styles.placeholder}>
              <p className={styles.icon}>🗺️</p>
              <p className={styles.ptitle}>{KAKAO_KEY ? '지도 연결 오류' : '카카오맵 API 키를 설정해주세요'}</p>
              <p className={styles.psub}>
                {mapError || 'frontend/.env의 VITE_KAKAO_MAP_KEY를 설정하면 지도가 표시됩니다.'}
              </p>
              <div className={styles.apiBox}>
                <p className={styles.apiLbl}>연결 API</p>
                <code className={styles.apiCode}>GET /api/population</code>
                <code className={styles.apiCode}>GET /api/courses</code>
                <code className={styles.apiCode}>GET /api/course-routes</code>
              </div>
            </div>
          ) : (
            <>
              <div ref={mapContainerRef} className={styles.mapCanvas} />
              {routeSvgPoints && routeSvgSize.width > 0 && routeSvgSize.height > 0 && (
                <svg
                  aria-hidden="true"
                  className={styles.routeSvgOverlay}
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${routeSvgSize.width} ${routeSvgSize.height}`}
                >
                  <polyline
                    fill="none"
                    points={routeSvgPoints}
                    stroke="#FFFFFF"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.55"
                    strokeWidth="4"
                  />
                  <polyline
                    fill="none"
                    points={routeSvgPoints}
                    stroke="#FF6B2C"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.65"
                    strokeWidth="3"
                  />
                </svg>
              )}
              <div className={styles.mapOverlay}>
                <div className={styles.legend}>
                  <span><i className={styles.legendPark} />공원 위치</span>
                  <span><i className={styles.legendRoute} />주황색 점·반투명 선: 선택한 대표 러닝 루트</span>
                  <span><i className={styles.legendLow} />여유</span>
                  <span><i className={styles.legendMedium} />보통</span>
                  <span><i className={styles.legendHigh} />혼잡</span>
                </div>
                <p className={styles.status}>{statusText}</p>
              </div>
            </>
          )}
        </div>

        <aside className={styles.sidePanel}>
          {displayedParkGroup ? (
            <>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>공원 대표 마커</span>
                <h2>{displayedParkGroup.parkName}</h2>
                <p>{displayedParkGroup.courses.length}개 코스</p>
              </div>

              <div className={styles.courseList}>
                {displayedParkGroup.courses.map((course) => {
                  const route = getRouteWithEnoughPoints(routeMap.get(course.course_id.trim()));
                  const hasRoute = Boolean(route);
                  const isSelected = selectedCourse?.course_id === course.course_id;

                  return (
                    <article
                      key={course.course_id}
                      className={`${styles.courseCard} ${isSelected ? styles.courseCardSelected : ''}`}
                    >
                      <div className={styles.courseCardTop}>
                        <h3>{course.course_name}</h3>
                        <span className={styles.grade}>{course.recommend_grade}등급</span>
                      </div>
                      <div className={styles.courseMeta}>
                        <span>{course.distance_km}km</span>
                        <span>{getLevelLabel(course.level)}</span>
                        <span>{getCourseCrowdLabel(course.crowd_level)}</span>
                        <span>{getNightSafeLabel(course.night_safe)}</span>
                      </div>
                      <div className={styles.courseScore}>
                        <strong>{Math.round(course.final_recommend_score)}</strong>
                        <span>추천 점수</span>
                        <em>{course.route_available === 'Y' ? '루트 후보' : '루트 미등록'}</em>
                      </div>
                      <div className={styles.courseActions}>
                        <button type="button" onClick={() => handleViewCourse(course, displayedParkGroup)}>
                          코스 보기
                        </button>
                        {hasRoute ? (
                          <button
                            type="button"
                            className={styles.primaryAction}
                            onClick={() => handleShowRoute(course)}
                          >
                            루트 보기
                          </button>
                        ) : (
                          <span className={styles.routeMissing}>루트 준비 전</span>
                        )}
                        <button
                          type="button"
                          className={styles.runAction}
                          disabled={Boolean(currentRun)}
                          onClick={() => {
                            handleShowRoute(course);
                            onStartRun(course);
                          }}
                        >
                          {currentRun ? '러닝 진행 중' : '이 코스 러닝 시작'}
                        </button>
                      </div>
                      {isSelected && (
                        <div className={styles.courseDetail}>
                          <p>{course.note || course.description || '코스 설명이 준비 중입니다.'}</p>
                          <dl>
                            <div>
                              <dt>노면</dt>
                              <dd>{course.surface_type}</dd>
                            </div>
                            <div>
                              <dt>시설 점수</dt>
                              <dd>{course.facility_score}</dd>
                            </div>
                          </dl>
                          {selectedRouteMessage && (
                            <p className={styles.routeNotice}>{selectedRouteMessage}</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.emptyPanel}>
              <span className={styles.panelEyebrow}>서대문 GO</span>
              <h2>공원별 코스 보기</h2>
              <p>지도에서 공원 마커를 선택하면 해당 공원의 코스 목록이 표시됩니다.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
