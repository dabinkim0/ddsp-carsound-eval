#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

FIXED_SOURCE_ITEM_IDS = [
    "000",
    "018",
    "020",
    "023",
    "024",
    "031",
    "041",
    "052",
    "055",
    "067",
    "070",
    "080",
    "091",
    "095",
    "099",
    "102",
    "104",
    "112",
    "172",
    "179",
]

STAGE_CONFIG = {
    "stage1": {
        "source_dir": Path("TestA_F0/mainset/processed/selected/16kHz"),
        "candidates": {
            "reference_test.wav": "TestA_00_Reference_Test",
            "c2_direct.wav": "TestA_01_C2_Direct",
            "c1_direct.wav": "TestA_02_C1_Direct",
            "c2_encoder.wav": "TestA_03_C2_Encoder",
            "c1_encoder.wav": "TestA_04_C1_Encoder",
        },
    },
    "stage2": {
        "source_dir": Path("TestB_CAN/mainset/processed/selected/16kHz"),
        "candidates": {
            "reference_test.wav": "TestB_00_Reference_Test",
            "c1_direct_rpm.wav": "TestB_01_C1_Direct_RPM",
            "c1_encoder_rpm.wav": "TestB_02_C1_Encoder_RPM",
            "c1_direct_rpm_pedal_gear.wav": "TestB_03_C1_Direct_RPM,PedalPosition,GearLevel",
            "c1_encoder_rpm_pedal_gear.wav": "TestB_04_C1_Encoder_RPM,PedalPosition,GearLevel",
            "c1_direct_full.wav": "TestB_05_C1_Direct_RPM,PedalPosition,GearLevel,Velocity,Acceleration",
            "c1_encoder_full.wav": "TestB_06_C1_Encoder_RPM,PedalPosition,GearLevel,Velocity,Acceleration",
        },
    },
}


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Copy the fixed AES selected 16kHz v1 set into public/samples/aes-selected."
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        default=repo_root.parent / "AES_ListeningTestset_v1",
        help="Path to the AES_ListeningTestset_v1 root.",
    )
    parser.add_argument(
        "--target-root",
        type=Path,
        default=repo_root / "public" / "samples" / "aes-selected",
        help="Path to the public audio output root.",
    )
    return parser.parse_args()


def ensure_exists(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Required path not found: {path}")


def copy_subset(source_root: Path, target_root: Path) -> None:
    target_root.mkdir(parents=True, exist_ok=True)

    for stage_key, stage in STAGE_CONFIG.items():
        source_stage_dir = source_root / stage["source_dir"]
        ensure_exists(source_stage_dir)

        for item_index, source_item_id in enumerate(FIXED_SOURCE_ITEM_IDS, start=1):
            item_dir = target_root / stage_key / f"item{item_index:02d}"
            item_dir.mkdir(parents=True, exist_ok=True)

            ground_truth_name = f"16kHz_{source_item_id}_GroundTruth.wav"
            shutil.copy2(source_stage_dir / ground_truth_name, item_dir / "ground_truth.wav")

            for target_name, source_suffix in stage["candidates"].items():
                source_name = f"16kHz_{source_item_id}_{source_suffix}.wav"
                shutil.copy2(source_stage_dir / source_name, item_dir / target_name)


def main() -> None:
    args = parse_args()
    copy_subset(Path(args.source_root), Path(args.target_root))
    print("Copied fixed AES selected audio subset:")
    print(f"  source: {args.source_root}")
    print(f"  target: {args.target_root}")
    print(f"  items:  {', '.join(FIXED_SOURCE_ITEM_IDS)}")


if __name__ == "__main__":
    main()
