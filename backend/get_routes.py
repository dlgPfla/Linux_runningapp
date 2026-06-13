import requests
import csv
import time
import os

# 현재 파일 기준으로 절대 경로 설정(어디서 실행해도 경로 오류 없음)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")        #csv 저장 폴더
OUTPUT_CSV = os.path.join(DATA_DIR, "course_routes.csv")    #최종 출력 파일

# data 폴더가 없으면 자동 생
os.makedirs(DATA_DIR, exist_ok=True)

def get_walking_route(waypoints):
    """
    OSRM 무료 보행자 경로 API를 호출해 실제 도로 위 좌표 목록을 반환
    - API 키 불필요, 완전 무료(project-osrm.org 공개 서버 사용)
    - waypoints: [(위도, 경도), ...] 형태의 경유지 목록
    - 반환값: [(위도, 경도), ...] 형태의 실제 도로 경로 좌표 목록
    """


    # OSRM은 경도,위도(lon,lat) 순서를 요구하므로 순서 변환 후 세미콜론으로 연결
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)

    # foot 프로파일: 보행자 경로 (car, bike 등도 있음)
    url = f"http://router.project-osrm.org/route/v1/foot/{coords_str}"
    params = {
        "overview": "full",    # 전체 경로 좌표 반환 (simplified이면 일부만 반환)
        "geometries": "geojson"    # 좌표 형식을 GeoJSON으로 지정
    }
    
    res = requests.get(url, params=params, timeout=15)

    # HTTP 오류 발생 시 예외 발생
    if res.status_code != 200:
        raise Exception(f"HTTP {res.status_code} 오류")
    
    data = res.json()

    # 경로가 없는 경우 (접근 불가 좌표 등)
    if not data.get("routes"):
        raise Exception("경로 없음")
    
    # GeoJSON coordinates는 [경도, 위도] 순서이므로 다시 (위도, 경도)로 변환
    path = data["routes"][0]["geometry"]["coordinates"]
    return [(lat, lon) for lon, lat in path]


# ─── 코스별 경유지 정의 ──────────────────────────────────────────────────────
# 각 코스 ID에 대해 실제 현장 경유 포인트(위도, 경도)를 순서대로 지정
# 마지막 좌표를 출발지와 동일하게 설정하면 순환 코스가 됨
courses = {
    "C005": [
        (37.582584, 126.962452),  # 수성동계곡
        (37.584024, 126.964018),  # 무무대
        (37.585897, 126.964231),  # 더숲초소책방
        (37.586531, 126.962057),  # 숲속쉼터
        (37.590973, 126.966235),  # 윤동주언덕
        (37.592072, 126.967119),  # 윤동주문학관
        (37.582584, 126.962452),  # 복귀
    ],
    "C017": [
        (37.574481, 126.957930),  # 독립문역 5번 출구
        (37.572884, 126.952417),  # 안산자락길 입구
        (37.574596, 126.943480),  # 무악정
        (37.576892, 126.947203),  # 봉수대
        (37.580366, 126.938529),  # 연희숲속쉼터
        (37.574481, 126.957930),  # 복귀
    ],
    "C024": [
        (37.575286, 126.955019),  # 독립공원 정문
        (37.572402, 126.959530),  # 독립문
        (37.573086, 126.956781),  # 순국선열추념탑
        (37.575286, 126.955019),  # 복귀
    ],
    "C012": [
        (37.582915, 126.930598),  # 유아숲체험장
        (37.591615, 126.927335),  # 은평정 정상
        (37.586115, 126.927335),  # 백련사
        (37.582915, 126.930598),  # 복귀
    ],
    "C039": [
        (37.572402, 126.959530),  # 독립문
        (37.572884, 126.952417),  # 안산자락길 입구
        (37.573086, 126.956781),  # 순국선열추념탑
        (37.572402, 126.959530),  # 복귀
    ],
}

# ─── 경로 데이터 수집 및 CSV 저장 ────────────────────────────────────────────
 
# CSV 헤더 행 초기화
all_rows = [["course_id", "point_order", "latitude", "longitude"]]

for course_id, waypoints in courses.items():
    try:
         # OSRM API로 실제 도로 위 좌표 목록 가져오기
        coords = get_walking_route(waypoints)

        # point_order는 1부터 시작 (프론트엔드 정렬 기준)
        for i, (lat, lon) in enumerate(coords, 1):
            all_rows.append([course_id, i, round(lat, 6), round(lon, 6)])
        print(f"{course_id}: {len(coords)}개 포인트 완료")
    except Exception as e:
        # 개별 코스 실패 시 전체 중단 없이 다음 코스로 진행
        print(f"{course_id}: 실패 - {e}")

    # OSRM 공개 서버 부하 방지 — 코스 간 1초 대기
    time.sleep(1)

# 수집한 전체 좌표를 CSV로 저장
with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows(all_rows)

print(f"\n총 {len(all_rows)-1}개 포인트 저장 완료: {OUTPUT_CSV}")
