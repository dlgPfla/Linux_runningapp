"""
러닝 코스 추천 서비스 - Flask Backend
서대문구 공원 및 유동인구 데이터 기반 러닝 코스 추천 API

사용 CSV 파일:
  - backend/course_master.csv
  - backend/population_summary.csv

API 목록:
  GET /api/courses                  전체 코스 목록 (필터/정렬 지원)
  GET /api/courses/<course_id>      특정 코스 상세 정보
  GET /api/population               유동인구 요약 데이터
  GET /api/recommend                조건 기반 추천 코스
  GET /api/health                   서버 상태 확인
"""

import os
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


# ── 앱 초기화 ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── 데이터 경로 ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

COURSE_CSV = os.path.join(DATA_DIR, "course_master.csv")
POPULATION_CSV = os.path.join(DATA_DIR, "population_summary.csv")


# ── 데이터 로드 헬퍼 ──────────────────────────────────────────────────────────
def load_courses() -> pd.DataFrame:
    """
    course_master.csv를 읽어 DataFrame으로 반환.
    api_status == 'active'인 행만 사용하며, NaN은 None으로 변환.
    """
    df = pd.read_csv(COURSE_CSV)

    if "api_status" in df.columns:
        df = df[df["api_status"] == "active"].copy()

    df = df.where(pd.notnull(df), None)
    return df


def load_population() -> pd.DataFrame:
    """
    population_summary.csv를 읽어 필요한 컬럼만 추출해 DataFrame으로 반환.
    NaN은 None으로 변환.
    """
    df = pd.read_csv(POPULATION_CSV)

    keep = ["name", "avg_population", "crowd_level", "latitude", "longitude", "risk_color"]
    existing = [col for col in keep if col in df.columns]
    df = df[existing].copy()

    df = df.where(pd.notnull(df), None)
    return df


def course_to_dict(row) -> dict:
    """DataFrame 행 하나를 API 응답용 딕셔너리로 변환."""
    return {
        "course_id":              row.get("course_id"),
        "park_name":              row.get("park_name"),
        "course_name":            row.get("course_name"),
        "district":               row.get("district"),
        "address":                row.get("address"),
        "course_type":            row.get("course_type"),
        "distance_km":            row.get("distance_km"),
        "surface_type":           row.get("surface_type"),
        "night_safe":             row.get("night_safe"),
        "level":                  row.get("level"),
        "linked_population_area": row.get("linked_population_area"),
        "crowd_level":            row.get("crowd_level"),
        "facility_score":         row.get("facility_score"),
        "route_available":        row.get("route_available"),
        "final_recommend_score":  row.get("final_recommend_score"),
        "recommend_grade":        row.get("recommend_grade"),
        "note":                   row.get("note"),
    }


# ── 에러 핸들러 ───────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "요청한 API를 찾을 수 없습니다."}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "서버 내부 오류가 발생했습니다."}), 500


# ── GET /api/courses ──────────────────────────────────────────────────────────
@app.route("/api/courses", methods=["GET"])
def get_courses():
    """
    모든 러닝 코스 목록 반환.

    Query Parameters (모두 선택):
      level       : easy | medium | hard
      course_type : mountain | trail | road | park
      crowd_level : low | medium | high | unknown
      night_safe  : Y | N
      min_km      : 최소 거리 (float)
      max_km      : 최대 거리 (float)
      sort        : score_desc (기본) | score_asc | distance_asc | distance_desc
    """
    try:
        df = load_courses()

        # ── 필터링 ──
        level       = request.args.get("level")
        course_type = request.args.get("course_type")
        crowd_level = request.args.get("crowd_level")
        night_safe  = request.args.get("night_safe")
        min_km      = request.args.get("min_km", type=float)
        max_km      = request.args.get("max_km", type=float)

        if level and "level" in df.columns:
            df = df[df["level"] == level]
        if course_type and "course_type" in df.columns:
            df = df[df["course_type"] == course_type]
        if crowd_level and "crowd_level" in df.columns:
            df = df[df["crowd_level"] == crowd_level]
        if night_safe and "night_safe" in df.columns:
            df = df[df["night_safe"] == night_safe.upper()]
        if min_km is not None and "distance_km" in df.columns:
            df = df[df["distance_km"] >= min_km]
        if max_km is not None and "distance_km" in df.columns:
            df = df[df["distance_km"] <= max_km]

        # ── 정렬 ──
        sort_map = {
            "score_desc":    ("final_recommend_score", False),
            "score_asc":     ("final_recommend_score", True),
            "distance_asc":  ("distance_km",           True),
            "distance_desc": ("distance_km",           False),
        }
        sort = request.args.get("sort", "score_desc")
        col, asc = sort_map.get(sort, ("final_recommend_score", False))

        if col in df.columns:
            df = df.sort_values(col, ascending=asc)

        courses = [course_to_dict(row) for _, row in df.iterrows()]
        return jsonify({"total": len(courses), "courses": courses})

    except FileNotFoundError:
        return jsonify({"error": f"CSV 파일을 찾을 수 없습니다: {COURSE_CSV}"}), 500
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── GET /api/courses/<course_id> ──────────────────────────────────────────────
@app.route("/api/courses/<course_id>", methods=["GET"])
def get_course(course_id: str):
    """
    특정 코스 상세 정보 반환.
    예: GET /api/courses/C001
    """
    try:
        df = load_courses()

        if "course_id" not in df.columns:
            return jsonify({"error": "course_id 컬럼이 없습니다."}), 500

        row = df[df["course_id"] == course_id.upper()]

        if row.empty:
            return jsonify({"error": f"코스를 찾을 수 없습니다: {course_id}"}), 404

        return jsonify(course_to_dict(row.iloc[0]))

    except FileNotFoundError:
        return jsonify({"error": f"CSV 파일을 찾을 수 없습니다: {COURSE_CSV}"}), 500
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── GET /api/population ───────────────────────────────────────────────────────
@app.route("/api/population", methods=["GET"])
def get_population():
    """
    유동인구 요약 데이터 반환.

    Query Parameters (선택):
      crowd_level : low | medium | high
    """
    try:
        df = load_population()

        crowd_level = request.args.get("crowd_level")
        if crowd_level and "crowd_level" in df.columns:
            df = df[df["crowd_level"] == crowd_level]

        records = df.to_dict(orient="records")
        return jsonify({"total": len(records), "population": records})

    except FileNotFoundError:
        return jsonify({"error": f"CSV 파일을 찾을 수 없습니다: {POPULATION_CSV}"}), 500
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── GET /api/recommend ────────────────────────────────────────────────────────
@app.route("/api/recommend", methods=["GET"])
def get_recommend():
    """
    사용자 조건에 맞는 추천 코스 반환.

    Query Parameters (모두 선택):
      level       : easy | medium | hard           (운동 수준)
      crowd_level : low | medium | high | unknown   (혼잡도 선호)
      night_safe  : Y | N                          (야간 안전 여부)
      min_km      : float                           (최소 거리)
      max_km      : float                           (최대 거리)
      top_n       : int, 기본 5, 최대 20            (반환할 코스 수)

    crowd_level 필터 동작:
      low    → low, unknown만 포함
      medium → low, medium, unknown 포함
      high   → 모두 포함
    """
    try:
        df = load_courses()

        level       = request.args.get("level")
        crowd_level = request.args.get("crowd_level")
        night_safe  = request.args.get("night_safe")
        min_km      = request.args.get("min_km", type=float)
        max_km      = request.args.get("max_km", type=float)
        top_n       = request.args.get("top_n", default=5, type=int)
        top_n       = max(1, min(top_n, 20))  # 1~20 범위 클램프

        if level and "level" in df.columns:
            df = df[df["level"] == level]

        if crowd_level and "crowd_level" in df.columns:
            if crowd_level == "low":
                df = df[df["crowd_level"].isin(["low", "unknown"])]
            elif crowd_level == "medium":
                df = df[df["crowd_level"].isin(["low", "medium", "unknown"])]
            else:
                df = df[df["crowd_level"].isin(["low", "medium", "high", "unknown"])]

        if night_safe and "night_safe" in df.columns:
            df = df[df["night_safe"] == night_safe.upper()]
        if min_km is not None and "distance_km" in df.columns:
            df = df[df["distance_km"] >= min_km]
        if max_km is not None and "distance_km" in df.columns:
            df = df[df["distance_km"] <= max_km]

        if "final_recommend_score" in df.columns:
            df = df.sort_values("final_recommend_score", ascending=False)

        df = df.head(top_n)

        courses = [course_to_dict(row) for _, row in df.iterrows()]
        return jsonify({
            "total": len(courses),
            "filters_applied": {
                "level":       level,
                "crowd_level": crowd_level,
                "night_safe":  night_safe,
                "min_km":      min_km,
                "max_km":      max_km,
                "top_n":       top_n,
            },
            "courses": courses,
        })

    except FileNotFoundError:
        return jsonify({"error": f"CSV 파일을 찾을 수 없습니다: {COURSE_CSV}"}), 500
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── GET /api/health ───────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    """서버 상태 확인."""
    return jsonify({"status": "ok"})


# ── 실행 ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
