import os
from datetime import timedelta

from django.utils import timezone

CACHE_TTL_HOURS = {
    'text':    72,   # 3 ngày
    'image':   72,   # 3 ngày
    'cooking': 168,  # 7 ngày — công thức ít thay đổi
}
SEMANTIC_THRESHOLD = 0.92   # Ngưỡng tương đồng (0–1)
CHROMA_CACHE_DIR   = None   # Sẽ lấy từ settings khi gọi lần đầu


def _get_cache_chroma_dir():
    global CHROMA_CACHE_DIR
    if CHROMA_CACHE_DIR is None:
        from django.conf import settings
        CHROMA_CACHE_DIR = os.path.join(settings.BASE_DIR, "core", "cache", "chroma_db_cache")
    return CHROMA_CACHE_DIR


def _get_vectorstore():
    """Khởi tạo Chroma vectorstore cho cache (collection riêng)."""
    try:
        from langchain_chroma import Chroma
        from apps.chatbot_core.services import OmniRouteEmbeddings
        return Chroma(
            collection_name="analysis_cache",
            persist_directory=_get_cache_chroma_dir(),
            embedding_function=OmniRouteEmbeddings(),
        )
    except Exception as exc:
        print(f"[Cache] ChromaDB init failed: {exc}")
        return None


class HybridCacheService:
    """
    Hai lớp cache:
      Layer 1 — DB exact match (cache_key = SHA256 hash)
      Layer 2 — ChromaDB semantic match (food_name embedding)
    """

    # ──────────────────────────────────────────────
    # Layer 1: DB exact match
    # ──────────────────────────────────────────────

    @classmethod
    def get_exact(cls, cache_key: str):
        """Trả về dict response nếu cache hit, None nếu miss hoặc hết TTL."""
        from apps.fitness.models import AnalysisCache

        try:
            entry = AnalysisCache.objects.get(cache_key=cache_key)
            ttl_hours = CACHE_TTL_HOURS.get(entry.analysis_type, 72)
            if timezone.now() - entry.updated_at > timedelta(hours=ttl_hours):
                entry.delete()
                print(f"[Cache L1] Expired: {entry.food_name}")
                return None

            # Response rỗng (lưu lỗi từ lần trước) → bỏ qua
            if not entry.response_json or not entry.response_json.strip():
                print(f"[Cache L1] Empty response_json for: {entry.food_name}, skipping")
                return None

            entry.hit_count += 1
            entry.save(update_fields=["hit_count"])
            print(f"[Cache L1] HIT: {entry.food_name} ({entry.analysis_type}) — hits={entry.hit_count}")
            # Trả về raw string (không parse JSON — client nhận text stream như LLM output)
            return entry.response_json

        except AnalysisCache.DoesNotExist:
            return None
        except Exception as exc:
            print(f"[Cache L1] Error: {exc}")
            return None

    # ──────────────────────────────────────────────
    # Layer 2: ChromaDB semantic match
    # ──────────────────────────────────────────────

    @classmethod
    def get_semantic(cls, food_name: str, analysis_type: str, profile_hash: str):
        """
        Tìm cache gần đúng qua embedding similarity.
        Trả về dict response nếu tương đồng >= SEMANTIC_THRESHOLD.
        """
        try:
            vs = _get_vectorstore()
            if vs is None:
                return None

            query = f"{analysis_type} {food_name}"
            # ChromaDB requires $and for multi-field filters
            chroma_filter = {
                "$and": [
                    {"analysis_type": {"$eq": analysis_type}},
                    {"profile_hash":  {"$eq": profile_hash}},
                ]
            }
            results = vs.similarity_search_with_relevance_scores(
                query,
                k=1,
                filter=chroma_filter,
            )

            if not results:
                return None

            doc, score = results[0]
            print(f"[Cache L2] Semantic score={score:.3f} for '{food_name}' ({analysis_type})")

            if score < SEMANTIC_THRESHOLD:
                return None

            cache_key = doc.metadata.get("cache_key")
            if cache_key:
                return cls.get_exact(cache_key)
            return None

        except Exception as exc:
            print(f"[Cache L2] Error: {exc}")
            return None

    # ──────────────────────────────────────────────
    # Save
    # ──────────────────────────────────────────────

    @classmethod
    def save(
        cls,
        cache_key: str,
        food_name: str,
        analysis_type: str,
        profile_hash: str,
        response_text: str,
        user=None,
    ):
        """Lưu vào DB và thêm embedding vào ChromaDB."""
        from apps.fitness.models import AnalysisCache
        from langchain_core.documents import Document

        # --- DB ---
        try:
            entry, created = AnalysisCache.objects.update_or_create(
                cache_key=cache_key,
                defaults={
                    "food_name": food_name,
                    "analysis_type": analysis_type,
                    "profile_hash": profile_hash,
                    "response_json": response_text,
                    "user": user,
                    "hit_count": 0,
                },
            )
            print(f"[Cache] {'Created' if created else 'Updated'} DB: {food_name} ({analysis_type})")
        except Exception as exc:
            print(f"[Cache] DB save error: {exc}")

        # --- ChromaDB embedding ---
        try:
            vs = _get_vectorstore()
            if vs:
                doc = Document(
                    page_content=f"{analysis_type} {food_name}",
                    metadata={
                        "cache_key": cache_key,
                        "food_name": food_name,
                        "analysis_type": analysis_type,
                        "profile_hash": profile_hash,
                    },
                )
                vs.add_documents([doc])
                print(f"[Cache] ChromaDB embedding saved: {food_name}")
        except Exception as exc:
            print(f"[Cache] ChromaDB save error: {exc}")

    # ──────────────────────────────────────────────
    # Invalidate / Stats
    # ──────────────────────────────────────────────

    @classmethod
    def invalidate(cls, food_name: str, analysis_type: str | None = None):
        """Xóa cache cho một món ăn (và tuỳ chọn: theo loại phân tích)."""
        from apps.fitness.models import AnalysisCache

        qs = AnalysisCache.objects.filter(food_name__iexact=food_name)
        if analysis_type:
            qs = qs.filter(analysis_type=analysis_type)
        count, _ = qs.delete()
        print(f"[Cache] Invalidated {count} entries for '{food_name}'")
        return count

    @classmethod
    def get_stats(cls):
        """Trả về thống kê cache theo loại phân tích."""
        from apps.fitness.models import AnalysisCache
        from django.db.models import Count, Sum

        rows = (
            AnalysisCache.objects.values("analysis_type")
            .annotate(entries=Count("id"), total_hits=Sum("hit_count"))
            .order_by("analysis_type")
        )
        return {
            r["analysis_type"]: {
                "entries": r["entries"],
                "total_hits": r["total_hits"] or 0,
            }
            for r in rows
        }
