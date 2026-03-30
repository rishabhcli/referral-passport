#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


ROOT_DIR = Path(__file__).resolve().parents[2]
PLAN_PATH = ROOT_DIR / "scripts" / "demo" / "demo-plan.json"
MODEL_PATH = ROOT_DIR / "tmp" / "demo-tts" / "models" / "kokoro-v1.0.onnx"
VOICES_PATH = ROOT_DIR / "tmp" / "demo-tts" / "models" / "voices-v1.0.bin"
OUTPUT_AUDIO_DIR = ROOT_DIR / "output" / "demo" / "audio"
AUDITION_DIR = OUTPUT_AUDIO_DIR / "auditions"
METADATA_PATH = ROOT_DIR / "output" / "demo" / "manifests" / "narration-metadata.json"
MASTER_AUDIO_PATH = OUTPUT_AUDIO_DIR / "referral-passport-demo-narration.wav"

VOICE_ORDER = ["af_sarah", "af_nicole", "af_bella"]
AUDITION_PAUSE_SECONDS = 0.45
SEGMENT_TAIL_PAD_SECONDS = {
    "s1-hook-rewind": 2.0,
    "s2-problem-and-product": 1.7,
    "s3-patient-context": 2.0,
    "s4-initial-submission": 2.0,
    "s5-repair-to-accepted": 2.3,
    "s6-audit-trail": 2.4,
    "s7-blocked-proof": 1.8,
    "s8-close": 1.8,
}


def spoken_text(text: str) -> str:
    replacements = {
        "UACR": "U A C R",
        "CKD": "C K D",
        "FHIR-style": "fire-style",
        "FHIR": "fire",
        "A2A": "A two A",
    }

    for source, target in replacements.items():
        text = text.replace(source, target)

    return text


def ensure_paths() -> None:
    OUTPUT_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    AUDITION_DIR.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing Kokoro model: {MODEL_PATH}")
    if not VOICES_PATH.exists():
        raise FileNotFoundError(f"Missing Kokoro voices: {VOICES_PATH}")


def load_plan() -> dict:
    return json.loads(PLAN_PATH.read_text())


def synthesize_clip(kokoro: Kokoro, text: str, voice: str, speed: float) -> tuple[np.ndarray, int]:
    audio, sample_rate = kokoro.create(
        spoken_text(text),
        voice=voice,
        speed=speed,
        lang="en-us",
        trim=True,
    )
    return np.asarray(audio, dtype=np.float32), sample_rate


def write_wav(path: Path, audio: np.ndarray, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(path, audio, sample_rate)


def with_tail_pad(audio: np.ndarray, sample_rate: int, pad_seconds: float) -> np.ndarray:
    if pad_seconds <= 0:
        return audio
    pad = np.zeros(int(sample_rate * pad_seconds), dtype=np.float32)
    return np.concatenate([audio, pad])


def combine_with_pause(parts: list[np.ndarray], sample_rate: int, pause_seconds: float) -> np.ndarray:
    if not parts:
        return np.zeros(0, dtype=np.float32)

    pause = np.zeros(int(sample_rate * pause_seconds), dtype=np.float32)
    stitched: list[np.ndarray] = []

    for index, part in enumerate(parts):
        stitched.append(part)
        if index < len(parts) - 1:
            stitched.append(pause)

    return np.concatenate(stitched)


def build_auditions(plan: dict, kokoro: Kokoro, speed: float) -> list[dict]:
    opener = plan["segments"][0]["narration"]
    technical = plan["segments"][5]["narration"]
    results = []

    for voice in VOICE_ORDER:
        opener_audio, sample_rate = synthesize_clip(kokoro, opener, voice, speed)
        technical_audio, _ = synthesize_clip(kokoro, technical, voice, speed)
        combined = combine_with_pause([opener_audio, technical_audio], sample_rate, AUDITION_PAUSE_SECONDS)
        target = AUDITION_DIR / f"{voice}-audition.wav"
        write_wav(target, combined, sample_rate)
        results.append(
            {
                "voice": voice,
                "path": str(target),
                "durationSeconds": round(len(combined) / sample_rate, 3),
            }
        )

    return results


def build_segment_audio(plan: dict, kokoro: Kokoro, voice: str, speed: float) -> tuple[list[dict], np.ndarray, int]:
    metadata = []
    rendered_parts: list[np.ndarray] = []
    sample_rate = 24000

    for segment in plan["segments"]:
        audio, sample_rate = synthesize_clip(kokoro, segment["narration"], voice, speed)
        pad_seconds = SEGMENT_TAIL_PAD_SECONDS.get(segment["id"], 0.0)
        audio = with_tail_pad(audio, sample_rate, pad_seconds)
        rendered_parts.append(audio)
        target = OUTPUT_AUDIO_DIR / f"{segment['id']}.wav"
        write_wav(target, audio, sample_rate)
        metadata.append(
            {
                "id": segment["id"],
                "title": segment["title"],
                "path": str(target),
                "tailPadSeconds": pad_seconds,
                "durationSeconds": round(len(audio) / sample_rate, 3),
            }
        )

    master_audio = combine_with_pause(rendered_parts, sample_rate, 0.0)
    return metadata, master_audio, sample_rate


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate demo narration audio with Kokoro ONNX.")
    parser.add_argument("--voice", default="af_sarah")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    ensure_paths()
    plan = load_plan()
    kokoro = Kokoro(str(MODEL_PATH), str(VOICES_PATH))

    if args.voice not in kokoro.get_voices():
        raise ValueError(f"Voice '{args.voice}' not available in Kokoro voices.")

    auditions = build_auditions(plan, kokoro, args.speed)
    segment_metadata, master_audio, sample_rate = build_segment_audio(plan, kokoro, args.voice, args.speed)
    write_wav(MASTER_AUDIO_PATH, master_audio, sample_rate)

    total_duration = round(len(master_audio) / sample_rate, 3)
    metadata = {
        "generatedAt": datetime.now().isoformat(),
        "voice": args.voice,
        "speed": args.speed,
        "sampleRate": sample_rate,
        "totalDurationSeconds": total_duration,
        "masterAudioPath": str(MASTER_AUDIO_PATH),
        "auditions": auditions,
        "segments": segment_metadata,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
