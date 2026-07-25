"""Render AI voice clips with Kokoro-82M from data/audio.json.

Usage (conda pytorch env):
    python scripts/tts/gen_ai_voices.py

Outputs WAVs to scripts/tts/output/ai/<id>.wav and a manifest.json alongside.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio_utils import process  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIO_JSON = os.path.join(ROOT, "data", "audio.json")
OUT_DIR = os.path.join(os.path.dirname(__file__), "output", "ai")


def main() -> None:
    with open(AUDIO_JSON, "r", encoding="utf-8") as fh:
        spec = json.load(fh)

    tgt = spec["target"]
    sr = int(tgt["sample_rate"])
    os.makedirs(OUT_DIR, exist_ok=True)

    from kokoro import KPipeline

    # 'a' = American English, 'b' = British English; pick per voice prefix.
    pipes: dict[str, "KPipeline"] = {}

    def pipe_for(voice: str) -> "KPipeline":
        code = "b" if voice.startswith(("bf_", "bm_")) else "a"
        if code not in pipes:
            pipes[code] = KPipeline(lang_code=code)
        return pipes[code]

    manifest = []
    for item in spec["ai"]:
        voice, text = item["voice"], item["text"]
        pipe = pipe_for(voice)
        audio = None
        for _, _, chunk in pipe(text, voice=voice):
            audio = chunk if audio is None else np.concatenate([audio, chunk])
        audio = process(audio, sr, rms_dbfs=tgt["rms_dbfs"],
                        peak_dbfs=tgt["peak_dbfs"], trim_db=tgt["trim_silence_db"])
        out = os.path.join(OUT_DIR, f"{item['id']}.wav")
        sf.write(out, audio, sr)
        dur = round(len(audio) / sr, 2)
        manifest.append({
            "id": item["id"], "is_ai": True, "file": f"{item['id']}.wav",
            "voice": voice, "accent": item["accent"], "gender": item["gender"],
            "difficulty": item["difficulty"], "duration_s": dur, "text": text,
            "source": "Kokoro-82M", "license": "Apache-2.0",
        })
        print(f"[ai] {item['id']:6} {voice:12} {dur:5.2f}s  {text[:48]}")

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"\nWrote {len(manifest)} AI clips -> {OUT_DIR}")


if __name__ == "__main__":
    main()
