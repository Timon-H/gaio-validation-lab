#!/usr/bin/env python3
"""Compute 95% bootstrap confidence intervals for Macro-F1 from run-level exports.

The script can be used for both primary and exploratory tiers and supports
filtering by variant (default: combined).
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path
import re

import numpy as np


TARGETS = {
    "tarife_count": 3.0,
    "faq_count": 3.0,
    "form_felder_count": 6.0,
    "produktkarten_count": 2.0,
}


def to_bool(value: str) -> bool:
    return str(value).strip().lower() in {"t", "true", "1", "yes"}


def f1_count(observed: float, target: float) -> float:
    recall = min(observed / target, 1.0)
    precision = 0.0 if observed == 0 else min(target / observed, 1.0)
    return 0.0 if (precision + recall) == 0 else (2.0 * precision * recall) / (precision + recall)


def row_macro_f1(row: dict[str, str]) -> float:
    f1_tarife = f1_count(float(row["tarife_count"]), TARGETS["tarife_count"])
    f1_faq = f1_count(float(row["faq_count"]), TARGETS["faq_count"])
    f1_felder = f1_count(float(row["form_felder_count"]), TARGETS["form_felder_count"])
    f1_karten = f1_count(float(row["produktkarten_count"]), TARGETS["produktkarten_count"])
    f1_kontakt = 1.0 if to_bool(row["hat_kontakt"]) else 0.0
    f1_anbieter = 1.0 if to_bool(row["hat_anbieter"]) else 0.0
    return float(np.mean([f1_tarife, f1_faq, f1_felder, f1_karten, f1_kontakt, f1_anbieter]))


def parse_thinking_profile(thinking_controls: str) -> str:
    match = re.search(r"profile=([^;]+)", thinking_controls or "")
    return match.group(1) if match else "n/a"


def row_group_key(row: dict[str, str], include_profile: bool) -> str:
    provider = row.get("provider")
    model = row.get("model")
    profile = parse_thinking_profile(row.get("thinking_controls", "") or "")

    provider_title = {
        "openai": "OpenAI",
        "claude": "Anthropic",
        "gemini": "Google",
    }.get(provider or "", (provider or "unknown").capitalize())

    if include_profile:
        return f"{provider_title} ({model}, profile={profile})"
    return f"{provider_title} ({model})"


def compute_bootstrap_intervals(
    csv_path: Path,
    n_boot: int,
    seed: int,
    tier: str,
    variant: str,
    include_profile: bool,
) -> dict[str, dict[str, float | int]]:
    grouped: dict[str, list[float]] = defaultdict(list)

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("variant_id") != variant or row.get("tier") != tier:
                continue

            key = row_group_key(row, include_profile)

            grouped[key].append(row_macro_f1(row))

    rng = np.random.default_rng(seed)
    results: dict[str, dict[str, float | int]] = {}

    for key, values in grouped.items():
        arr = np.array(values, dtype=float)
        n = len(arr)
        if n == 0:
            continue

        indices = rng.integers(0, n, size=(n_boot, n))
        bootstrap_means = arr[indices].mean(axis=1)
        ci_low, ci_high = np.percentile(bootstrap_means, [2.5, 97.5])

        results[key] = {
            "n": n,
            "mean": float(arr.mean()),
            "ci_low": float(ci_low),
            "ci_high": float(ci_high),
        }

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap CI for run-level Macro-F1 results.")
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("datasets/DATA_llm_evaluation_results_rows.csv"),
        help="Path to run-level CSV export.",
    )
    parser.add_argument(
        "--tier",
        choices=["primary", "validation", "exploratory"],
        default="primary",
        help="Evaluation tier to analyze.",
    )
    parser.add_argument(
        "--variant",
        default="combined",
        help="Variant id to analyze (default: combined).",
    )
    parser.add_argument(
        "--collapse-profiles",
        action="store_true",
        help="If set, aggregate all thinking profiles per provider/model.",
    )
    parser.add_argument("--bootstrap", type=int, default=10000, help="Number of bootstrap resamples.")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility.")
    args = parser.parse_args()

    results = compute_bootstrap_intervals(
        csv_path=args.csv,
        n_boot=args.bootstrap,
        seed=args.seed,
        tier=args.tier,
        variant=args.variant,
        include_profile=not args.collapse_profiles,
    )

    if not results:
        print("No matching rows found for the selected filters.")
        return

    print(
        f"Bootstrap CI (tier={args.tier}, variant={args.variant}, "
        f"profiles={'collapsed' if args.collapse_profiles else 'separate'})"
    )

    for key in sorted(results):
        stats = results[key]
        print(
            f"{key}: n={stats['n']} "
            f"mean={stats['mean']:.6f} "
            f"ci95=[{stats['ci_low']:.6f}, {stats['ci_high']:.6f}]"
        )


if __name__ == "__main__":
    main()
