"""
Pipeline 3 bước cho Fitness Analysis:

  Bước 1 — Identify food name (text hoặc image)
  Bước 2 — RAG lookup dùng tên món
  Bước 3 — LLM analysis (streaming hoặc sync)
"""

import hashlib
import json
import os

import requests

LOCAL_ENDPOINT = "http://localhost:20128/v1/chat/completions"

TEXT_ID_MODELS   = ["fast-text-combo",   "text-smart-combo"]
VISION_ID_MODELS = ["fast-vision-combo", "vision-ultra-combo"]


# ──────────────────────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────────────────────

def _api_headers() -> dict:
    api_key = os.environ.get("OMINIROUTE_API_KEY", "")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def make_profile_hash(profile) -> str:
    """Hash 16 ký tự từ các chỉ số sức khoẻ quan trọng của user."""
    data = (
        f"{getattr(profile, 'weight', 70)}-"
        f"{getattr(profile, 'height', 170)}-"
        f"{getattr(profile, 'age', 25)}-"
        f"{getattr(profile, 'gender', 'male')}"
    )
    return hashlib.md5(data.encode()).hexdigest()[:16]


def make_cache_key(food_name: str, analysis_type: str, profile_hash: str) -> str:
    """SHA256 cache key từ tên món + loại phân tích + profile hash."""
    raw = f"{food_name.lower().strip()}:{analysis_type}:{profile_hash}"
    return hashlib.sha256(raw.encode()).hexdigest()



def call_llm_sync(messages: list, models: list) -> str:
    """
    Gọi LLM đồng bộ, trả về toàn bộ nội dung response.
    Thử lần lượt từng model, dừng lại khi thành công.
    Raise RuntimeError nếu tất cả model thất bại.
    """
    headers = _api_headers()
    last_error = ""

    for model in models:
        try:
            print(f"[Pipeline] Sync call — model: {model}")
            payload = {"model": model, "messages": messages, "stream": False}
            response = requests.post(
                LOCAL_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=30,
            )
            if response.status_code == 200:
                content = (
                    response.json()
                    .get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                if content:
                    print(f"[Pipeline] Sync success — model: {model}")
                    return content.strip()
            last_error = f"Model {model} returned {response.status_code}"
        except Exception as exc:
            last_error = f"Model {model} exception: {exc}"
            print(f"[Pipeline] {last_error}")

    raise RuntimeError(f"All models failed. Last: {last_error}")


def identify_food_from_text(user_input: str) -> str:
    """
    Yêu cầu LLM xác định tên món ăn từ đoạn văn bản.
    Trả về tên món (string). Nếu lỗi → fallback dùng user_input.
    """
    if not user_input:
        return "món ăn"

    messages = [
        {
            "role": "user",
            "content": (
                "Từ đoạn mô tả sau, hãy xác định TÊN MÓN ĂN CHÍNH.\n"
                "Chỉ trả về tên món, không giải thích, không thêm bất kỳ từ nào khác.\n"
                "Nếu không xác định được, trả về chuỗi rỗng.\n\n"
                f"Mô tả: \"{user_input}\""
            ),
        }
    ]

    try:
        name = call_llm_sync(messages, TEXT_ID_MODELS)
        # Làm sạch output phòng model thêm dấu ngoặc kép
        return name.strip().strip('"').strip("'") or user_input
    except Exception as exc:
        print(f"[Pipeline] identify_food_from_text error: {exc}")
        return user_input

def identify_food_from_image(image_base64: str, content_type: str) -> str:
    """
    Yêu cầu vision model xác định tên món ăn từ ảnh.
    Trả về tên món (string). Nếu lỗi → fallback generic.
    """
    image_url = f"data:{content_type};base64,{image_base64}"

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Nhìn vào ảnh này và cho biết tên món ăn trong ảnh là gì?\n"
                        "CHỈ trả về tên món ăn bằng tiếng Việt, không giải thích thêm."
                    ),
                },
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }
    ]

    try:
        name = call_llm_sync(messages, VISION_ID_MODELS)
        return name.strip().strip('"').strip("'") or "món ăn trong ảnh"
    except Exception as exc:
        print(f"[Pipeline] identify_food_from_image error: {exc}")
        return "món ăn trong ảnh"

def stream_and_collect(messages: list, models: list):
    """
    Generator: yield từng chunk text từ LLM (streaming).
    Cuối cùng yield tuple ('__FULL__', full_text) để caller lưu cache.
    Nếu tất cả model thất bại → yield tuple ('__ERROR__', error_msg).
    """
    headers = _api_headers()
    last_error = ""

    for model in models:
        try:
            print(f"[Pipeline] Stream — model: {model}")
            payload = {"model": model, "messages": messages, "stream": True}
            response = requests.post(
                LOCAL_ENDPOINT,
                json=payload,
                headers=headers,
                stream=True,
                timeout=120,
            )
            if response.status_code == 200:
                buffer = []
                for raw_line in response.iter_lines():
                    if not raw_line:
                        continue
                    line = raw_line.decode("utf-8")
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk_content = (
                            json.loads(data_str)
                            .get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content", "")
                        )
                        if chunk_content:
                            buffer.append(chunk_content)
                            yield chunk_content
                    except Exception:
                        pass

                print(f"[Pipeline] Stream success — model: {model}")
                yield ("__FULL__", "".join(buffer))
                return

            last_error = f"Model {model} returned {response.status_code}"
            print(f"[Pipeline] {last_error}")

        except Exception as exc:
            last_error = f"Model {model} exception: {exc}"
            print(f"[Pipeline] {last_error}")

    yield ("__ERROR__", last_error)
