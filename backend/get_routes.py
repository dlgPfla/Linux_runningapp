import requests
import csv
import time

def get_walking_route(waypoints):
    """OSRM 무료 API - 키 없음, 완전 무료"""
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    
    url = f"http://router.project-osrm.org/route/v1/foot/{coords_str}"
    params = {
        "overview": "full",
        "geometries": "geojson"
    }
    
    res = requests.get(url, params=params, timeout=15)
    
    if res.status_code != 200:
        raise Exception(f"HTTP {res.status_code} 오류")
    
    data = res.json()
    
    if not data.get("routes"):
        raise Exception("경로 없음")
    
    # 실제 도로 위 좌표 추출 (OSRM은 lon,lat 순서)
    path = data["routes"][0]["geometry"]["coordinates"]
    return [(lat, lon) for lon, lat in path]


# 5개 코스 경유지
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

# 전체 저장
all_rows = [["course_id", "point_order", "latitude", "longitude"]]

for course_id, waypoints in courses.items():
    try:
        coords = get_walking_route(waypoints)
        for i, (lat, lon) in enumerate(coords, 1):
            all_rows.append([course_id, i, round(lat, 6), round(lon, 6)])
        print(f"{course_id}: {len(coords)}개 포인트 완료")
    except Exception as e:
        print(f"{course_id}: 실패 - {e}")
    
    time.sleep(1)  # OSRM 서버 부하 방지

with open("data/course_routes.csv", "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows(all_rows)

print(f"\n총 {len(all_rows)-1}개 포인트 저장 완료!")
