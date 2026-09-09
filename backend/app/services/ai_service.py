import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
import logging
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

# Work-type compatibility: which departments can share a block.
COMPATIBILITY_MATRIX = {
    ("ENG", "ENG"): True,
    ("ENG", "SNT"): False,  # track work vs signalling usually conflict
    ("ENG", "TRD"): True,   # track + OHE can often be combined
    ("SNT", "TRD"): True,
    ("SNT", "SNT"): True,
    ("TRD", "TRD"): True,
    ("MECH", "ENG"): False,
    ("MECH", "SNT"): True,
    ("ELEC", "TRD"): False,
}

# High-risk work combos that force TSR
TSR_WORK_TYPES = {"track_renewal", "ballast_cleaning", "bridge_inspection", "welding"}

# Earliest slot a manual planner typically books first. The baseline is this
# slot simulated with the IDENTICAL impact logic — deterministic, no randomness.
BASELINE_START_HOUR = 8


def _compat_key(a: str, b: str) -> bool:
    if a == b:
        return True
    return COMPATIBILITY_MATRIX.get((a, b), COMPATIBILITY_MATRIX.get((b, a), False))


def _naive(dt):
    """Drop timezone info so aware API input never crashes comparisons
    against the naive wall-clock times stored in the database."""
    if isinstance(dt, datetime) and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


class RailSwayAI:
    """Core AI engine: compatibility, window search, impact simulation, recommendation."""

    def __init__(self):
        self.impact_model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
        self.is_trained = False
        self._train_default_model()

    # ---------- training ----------
    def _train_default_model(self):
        try:
            rng = np.random.default_rng(42)
            n = 500
            affected = rng.integers(0, 40, n)
            priority = rng.integers(0, 8, n)
            conflicts = rng.integers(0, 5, n)
            delay = rng.uniform(0, 600, n)
            tsr = rng.integers(0, 2, n)
            X = np.column_stack([affected, priority, conflicts, delay, tsr])
            y = affected * 0.5 + priority * 10 + conflicts * 5 + delay / 60 + tsr * 8
            y += rng.normal(0, 2, n)
            self.impact_model.fit(X, y)
            self.is_trained = True
        except Exception as e:
            logger.warning("Failed to train default impact model: %s", e)

    def _score(self, affected: int, priority: int, conflicts: int, delay: float, tsr: bool) -> float:
        if self.is_trained:
            try:
                X = np.array([[affected, priority, conflicts, delay, int(tsr)]])
                return float(self.impact_model.predict(X)[0])
            except Exception:
                pass
        return affected * 0.5 + priority * 10 + conflicts * 5 + delay / 60 + (8 if tsr else 0)

    # ---------- compatibility ----------
    def analyze_compatibility(self, requests: List[Any]) -> Dict[str, Any]:
        """Group maintenance requests into compatible clubs for a common block."""
        items = [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in requests]
        if not items:
            return {"clubs": [], "conflicts": [], "summary": "No requests provided"}

        # group by section first
        by_section: Dict[str, List[Dict]] = {}
        for r in items:
            by_section.setdefault(r.get("section", "unknown"), []).append(r)

        clubs = []
        conflicts = []
        for section, reqs in by_section.items():
            club: List[Dict] = []
            for r in reqs:
                placed = False
                for c in club:
                    pass
                # simple greedy: try to fit into existing club
                fitted = False
                for existing_club in [c for c in clubs if c["section"] == section]:
                    ok = all(
                        _compat_key(r.get("department", ""), m.get("department", ""))
                        for m in existing_club["members"]
                    )
                    total_dur = sum(m.get("duration", 2.0) for m in existing_club["members"]) + r.get("duration", 2.0)
                    if ok and total_dur <= 4.0:
                        existing_club["members"].append(r)
                        existing_club["total_duration"] = total_dur
                        fitted = True
                        break
                if not fitted:
                    # check conflict with others in same section for reporting
                    for other in reqs:
                        if other is r:
                            continue
                        if not _compat_key(r.get("department", ""), other.get("department", "")):
                            pair = tuple(sorted([r.get("task_id"), other.get("task_id")]))
                            if pair not in [tuple(sorted(c["pair"])) for c in conflicts]:
                                conflicts.append(
                                    {
                                        "pair": list(pair),
                                        "reason": f"{r.get('department')} {r.get('work_type')} incompatible with "
                                        f"{other.get('department')} {other.get('work_type')}",
                                    }
                                )
                    clubs.append(
                        {
                            "section": section,
                            "members": [r],
                            "total_duration": r.get("duration", 2.0),
                            "block_required": any(m.get("block_required", True) for m in [r]),
                        }
                    )
        return {
            "clubs": clubs,
            "conflicts": conflicts,
            "summary": f"{len(clubs)} block club(s) from {len(items)} request(s), {len(conflicts)} conflict(s).",
        }

    # ---------- window search ----------
    def find_optimal_windows(
        self,
        requests: List[Any],
        train_schedules: List[Dict[str, Any]],
        day: datetime | date,
        max_duration_hours: float = 2.5,
    ) -> List[Dict[str, Any]]:
        if isinstance(day, date) and not isinstance(day, datetime):
            day = datetime(day.year, day.month, day.day, 0, 0, 0)
        day = _naive(day)

        # normalise schedules
        norm = []
        for t in train_schedules:
            st = t.get("scheduled_time")
            if isinstance(st, str):
                try:
                    st = _naive(datetime.fromisoformat(st))
                except ValueError:
                    continue
            else:
                st = _naive(st)
            if st is None:
                continue
            norm.append(
                {
                    "id": t.get("train_number", t.get("id")),
                    "scheduled_time": st,
                    "priority": int(t.get("priority", 3)),
                    "type": t.get("train_type", "passenger"),
                }
            )
        norm.sort(key=lambda x: x["scheduled_time"])

        items = [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in requests]
        needs_tsr = any((r.get("work_type") in TSR_WORK_TYPES) for r in items)
        total_block_h = max([r.get("duration", 2.0) for r in items] + [max_duration_hours])
        total_block_h = min(total_block_h, 4.0)

        windows = []
        for start_hour in [8, 11, 14, 17]:
            start = day.replace(hour=start_hour, minute=0, second=0, microsecond=0)
            end = start + timedelta(hours=total_block_h)
            if end.hour > 23 or (end.day != start.day):
                continue
            impact = self._simulate_impact(start, end, norm, base_tsr=needs_tsr)
            windows.append(
                {
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "affected_trains": impact["affected"],
                    "affected_train_ids": impact["affected_train_ids"],
                    "priority_affected": impact["priority_affected"],
                    "conflicts": impact["conflicts"],
                    "tsr_required": impact["tsr"],
                    "estimated_delay": round(impact["total_delay"], 1),
                    "immediate_delay": round(impact["immediate_delay"], 1),
                    "downstream_delay": round(impact["downstream_delay"], 1),
                    "impact_score": round(impact["score"], 2),
                }
            )
        windows.sort(key=lambda x: x["impact_score"])
        # Return every evaluated window, not just the top 3: on sparse days the
        # empty (zero-impact) windows would otherwise crowd out the windows
        # that actually overlap trains, hiding the interesting candidates.
        return windows

    # ---------- baseline vs AI comparison ----------
    @staticmethod
    def _block_hours(items: List[Dict], max_duration_hours: float) -> float:
        items = [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in items]
        return min(max([r.get("duration", 2.0) for r in items] + [max_duration_hours]), 4.0)

    def compute_baseline(
        self,
        requests: List[Any],
        train_schedules: List[Dict[str, Any]],
        day: datetime | date,
        max_duration_hours: float = 2.5,
    ) -> Dict[str, Any]:
        """Deterministic 'before Rail-Sway' baseline: the same grouped work
        placed in the earliest morning slot (BASELINE_START_HOUR) without any
        optimization, simulated with the IDENTICAL impact logic as candidates.
        Same inputs always yield the same baseline."""
        if isinstance(day, date) and not isinstance(day, datetime):
            day = datetime(day.year, day.month, day.day, 0, 0, 0)
        day = _naive(day)
        items = [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in requests]
        norm = []
        for t in train_schedules:
            st = t.get("scheduled_time")
            if isinstance(st, str):
                try:
                    st = _naive(datetime.fromisoformat(st))
                except ValueError:
                    continue
            else:
                st = _naive(st)
            if st is None:
                continue
            norm.append({
                "id": t.get("train_number", t.get("id")),
                "scheduled_time": st,
                "priority": int(t.get("priority", 3)),
            })
        needs_tsr = any((r.get("work_type") in TSR_WORK_TYPES) for r in items)
        hours = self._block_hours(items, max_duration_hours)
        start = day.replace(hour=BASELINE_START_HOUR, minute=0, second=0, microsecond=0)
        end = start + timedelta(hours=hours)
        impact = self._simulate_impact(start, end, norm, base_tsr=needs_tsr)
        return {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "label": "Baseline (earliest slot, no optimization)",
            "affected_trains": impact["affected"],
            "affected_train_ids": impact["affected_train_ids"],
            "priority_affected": impact["priority_affected"],
            "conflicts": impact["conflicts"],
            "tsr_required": impact["tsr"],
            "estimated_delay": round(impact["total_delay"], 1),
            "immediate_delay": round(impact["immediate_delay"], 1),
            "downstream_delay": round(impact["downstream_delay"], 1),
            "impact_score": round(impact["score"], 2),
        }

    @staticmethod
    def compare_with_baseline(baseline: Dict[str, Any], recommended: Dict[str, Any], requests: List[Any]) -> Dict[str, Any]:
        """Estimated saving = baseline impact − AI impact, from real simulated
        values. Minutes come from estimated_delay (genuinely minutes);
        percent comes from impact_score (unitless — never presented as minutes).
        Percent is omitted (None) when the baseline score is zero.

        Occupation saving answers a different, defensible question: had the
        grouped requests each taken a separate corridor block, the corridor
        would be occupied for the SUM of their durations; coordinated, it is
        occupied once for the recommended window duration."""
        items = [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in requests]
        request_count = len(items)
        separate_hours = round(sum(float(r.get("duration", 0.0) or 0.0) for r in items), 2)
        coordinated_hours = 0.0
        try:
            coordinated_hours = round(
                (_naive(datetime.fromisoformat(recommended["end"])) - _naive(datetime.fromisoformat(recommended["start"]))).total_seconds() / 3600, 2
            )
        except (KeyError, ValueError, TypeError):
            pass
        occupation_saved = round(separate_hours - coordinated_hours, 2)
        occupation_pct = round(occupation_saved / separate_hours * 100, 1) if separate_hours > 0 else None
        d0 = float(baseline.get("estimated_delay", 0.0))
        d1 = float(recommended.get("estimated_delay", 0.0))
        s0 = float(baseline.get("impact_score", 0.0))
        s1 = float(recommended.get("impact_score", 0.0))
        saved = round(d0 - d1, 1)
        pct = round((s0 - s1) / s0 * 100, 1) if s0 > 0 else None
        b_span = f"{baseline['start'][11:16]}–{baseline['end'][11:16]}"
        if d0 == 0 and d1 == 0:
            explanation = (
                "Both the baseline and the recommended window avoid train movements entirely, "
                "so no delay saving is estimated. The recommendation stands on grouping and timing."
            )
        elif saved > 0:
            explanation = (
                f"Compared with the baseline {b_span} arrangement ({d0:.0f} min estimated delay, "
                f"{baseline.get('affected_trains', 0)} trains), the recommended window reduces estimated "
                f"operational impact by {saved:.0f} min while grouping {request_count} compatible request(s)."
            )
        elif saved < 0:
            explanation = (
                f"The recommended window accepts {abs(saved):.0f} min additional estimated delay versus the "
                f"baseline {b_span} arrangement in exchange for lower overall estimated impact "
                f"(score {s0} → {s1})."
            )
        else:
            explanation = (
                "The recommended window coincides with the baseline slot; no additional saving is estimated."
            )
        return {
            "baseline_start": baseline.get("start"),
            "baseline_end": baseline.get("end"),
            "estimated_delay_before": d0,
            "estimated_delay_after": d1,
            "estimated_minutes_saved": saved,
            "impact_score_before": s0,
            "impact_score_after": s1,
            "estimated_impact_reduction_percent": pct,
            "affected_trains_before": baseline.get("affected_trains", 0),
            "affected_trains_after": recommended.get("affected_trains", 0),
            "priority_trains_before": baseline.get("priority_affected", 0),
            "priority_trains_after": recommended.get("priority_affected", 0),
            "occupation": {
                "separate_hours": separate_hours,
                "coordinated_hours": coordinated_hours,
                "hours_saved": occupation_saved,
                "percent": occupation_pct,
                "request_count": request_count,
            },
            "explanation": explanation,
        }

    def _simulate_impact(self, start: datetime, end: datetime, schedules: List[Dict], base_tsr: bool = False):
        affected = []
        immediate_delay = 0.0
        downstream_delay = 0.0
        for train in schedules:
            st = train["scheduled_time"]
            if start <= st <= end:
                delay = (end - st).total_seconds() / 60 + 5
                affected.append({"id": train["id"], "delay": delay, "priority": train.get("priority", 3)})
                immediate_delay += delay
            elif end < st <= end + timedelta(hours=2) and affected:
                # cascade: queued departures inherit congestion
                delay = min(len(affected) * 4, 15)
                if delay > 1:
                    affected.append({"id": train["id"], "delay": delay, "priority": train.get("priority", 3)})
                    downstream_delay += delay
        total_delay = immediate_delay + downstream_delay
        priority_affected = sum(1 for a in affected if a["priority"] <= 2)
        conflicts = sum(1 for a in affected if a["delay"] > 15)
        tsr = bool(base_tsr or len(affected) > 20)
        score = self._score(len(affected), priority_affected, conflicts, total_delay, tsr)
        return {
            "affected": len(affected),
            "affected_train_ids": [a["id"] for a in affected][:25],
            "priority_affected": priority_affected,
            "conflicts": conflicts,
            "tsr": tsr,
            "total_delay": total_delay,
            "immediate_delay": immediate_delay,
            "downstream_delay": downstream_delay,
            "score": score,
        }

    # ---------- recommendation ----------
    def generate_recommendation(self, windows: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not windows:
            return {"recommendation": None, "reason": "No windows available", "confidence": "LOW"}
        best = min(windows, key=lambda x: x.get("impact_score", float("inf")))
        others = [w for w in windows if w is not best]
        gap = min([o["impact_score"] - best["impact_score"] for o in others], default=10.0)

        parts = [
            f"Window {best['start'][11:16]}–{best['end'][11:16]} affects only {best['affected_trains']} trains "
            f"({best['priority_affected']} priority)."
        ]
        if not best["tsr_required"]:
            parts.append("No TSR required, keeping line speed intact.")
        else:
            parts.append("TSR required — factor 15 min caution working into crew briefing.")
        if best["conflicts"] == 0:
            parts.append("Zero hard conflicts predicted.")
        parts.append(f"Total estimated network delay {best['estimated_delay']:.0f} min.")

        # Optional LLM polish if keys configured
        llm_reason = self._llm_polish(best, windows)
        reason = llm_reason or " ".join(parts)
        confidence = "HIGH" if gap > 5 and best["priority_affected"] == 0 else ("MEDIUM" if gap > 2 else "LOW")
        return {"recommendation": best, "reason": reason, "confidence": confidence}

    def _llm_polish(self, best: Dict, windows: List[Dict]) -> Optional[str]:
        # Try Gemini, then OpenAI; silently fall back to heuristic on any failure.
        prompt = (
            "You are a railway operations assistant. Given candidate block windows with "
            f"impact data {json.dumps(windows)[:2000]}, explain in 2-3 sentences why the window "
            f"{best['start']} to {best['end']} is recommended. Mention trains affected, "
            "priority trains, TSR and delay. Be concise and operational."
        )
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai

                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                resp = model.generate_content(prompt)
                if resp and getattr(resp, "text", None):
                    return resp.text.strip()
            except Exception as e:
                logger.warning("Gemini polish failed: %s", e)
        if settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                r = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200,
                )
                return r.choices[0].message.content.strip()
            except Exception as e:
                logger.warning("OpenAI polish failed: %s", e)
        return None
