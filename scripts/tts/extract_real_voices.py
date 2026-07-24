"""Extract real human voice clips from LibriSpeech test-clean (CC BY 4.0).

Downloads the archive if missing, then picks one clean utterance from each of N
distinct speakers, filtering to plain modern-sounding sentences in a duration band,
and applies the SAME trim/normalize as the AI clips.

Usage (conda pytorch env):
    python scripts/tts/extract_real_voices.py
"""
from __future__ import annotations

import json
import os
import sys
import tarfile
import urllib.request

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio_utils import process  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUDIO_JSON = os.path.join(ROOT, "data", "audio.json")
WORK = os.path.join(os.path.dirname(__file__), "data")
LS_ROOT = os.path.join(WORK, "LibriSpeech")
SUBSET = "test-clean"
URL = f"https://www.openslr.org/resources/12/{SUBSET}.tar.gz"
OUT_DIR = os.path.join(os.path.dirname(__file__), "output", "real")

N_CLIPS = 18
DUR_MIN, DUR_MAX = 4.0, 8.5
WORDS_MIN, WORDS_MAX = 8, 18
# Archaic / distinctly literary tokens we avoid so real clips read as neutral
# everyday speech (fairness: topic must not betray the label).
BLOCK = {
    "thee", "thou", "thy", "thine", "hath", "hast", "ye", "'tis", "'twas",
    "unto", "doth", "whilst", "nay", "yea", "o'er", "ere", "wilt", "shalt",
    "art", "verily", "forsooth", "methinks", "prithee",
}


def download() -> None:
    tar = os.path.join(WORK, f"{SUBSET}.tar.gz")
    os.makedirs(WORK, exist_ok=True)
    if os.path.isdir(os.path.join(LS_ROOT, SUBSET)):
        print(f"[real] {SUBSET} already extracted")
        return
    if not os.path.isfile(tar):
        print(f"[real] downloading {URL} ...")
        urllib.request.urlretrieve(URL, tar)
    print("[real] extracting ...")
    with tarfile.open(tar, "r:gz") as tf:
        tf.extractall(WORK)
    print("[real] extracted")


def speaker_genders() -> dict[str, str]:
    path = os.path.join(LS_ROOT, "SPEAKERS.TXT")
    out: dict[str, str] = {}
    if not os.path.isfile(path):
        return out
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith(";"):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 2:
                out[parts[0]] = parts[1]  # 'M' or 'F'
    return out


def acceptable(text: str) -> bool:
    words = text.split()
    if not (WORDS_MIN <= len(words) <= WORDS_MAX):
        return False
    low = text.lower()
    return not any(tok in BLOCK for tok in low.replace(",", " ").replace(".", " ").split())


def main() -> None:
    with open(AUDIO_JSON, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    tgt = spec["target"]
    sr_target = int(tgt["sample_rate"])

    download()
    genders = speaker_genders()
    os.makedirs(OUT_DIR, exist_ok=True)

    base = os.path.join(LS_ROOT, SUBSET)
    speakers = sorted(os.listdir(base), key=lambda s: int(s) if s.isdigit() else s)

    manifest = []
    idx = 0
    for spk in speakers:
        if idx >= N_CLIPS:
            break
        spk_dir = os.path.join(base, spk)
        if not os.path.isdir(spk_dir):
            continue
        picked = False
        for chapter in sorted(os.listdir(spk_dir)):
            if picked:
                break
            ch_dir = os.path.join(spk_dir, chapter)
            trans = os.path.join(ch_dir, f"{spk}-{chapter}.trans.txt")
            if not os.path.isfile(trans):
                continue
            with open(trans, "r", encoding="utf-8") as fh:
                lines = [ln.strip() for ln in fh if ln.strip()]
            for ln in lines:
                uid, _, text = ln.partition(" ")
                text = text.strip()
                if not acceptable(text):
                    continue
                flac = os.path.join(ch_dir, f"{uid}.flac")
                if not os.path.isfile(flac):
                    continue
                info = sf.info(flac)
                dur = info.frames / info.samplerate
                if not (DUR_MIN <= dur <= DUR_MAX):
                    continue
                audio, sr = sf.read(flac, dtype="float32")
                audio = process(audio, sr, rms_dbfs=tgt["rms_dbfs"],
                                peak_dbfs=tgt["peak_dbfs"], trim_db=tgt["trim_silence_db"])
                # LibriSpeech is 16 kHz; keep native SR (do not upsample — resampling
                # would be a synthetic artifact). Store true SR in the manifest.
                idx += 1
                cid = f"real-{idx:02d}"
                out = os.path.join(OUT_DIR, f"{cid}.wav")
                sf.write(out, audio, sr)
                # Title-case transcript is upper in LibriSpeech; present nicely.
                pretty = text.capitalize()
                manifest.append({
                    "id": cid, "is_ai": False, "file": f"{cid}.wav",
                    "speaker": spk, "gender": genders.get(spk, "?"),
                    "accent": "US", "difficulty": (idx % 3) + 1,
                    "duration_s": round(len(audio) / sr, 2), "sample_rate": sr,
                    "text": pretty, "source": f"LibriSpeech {SUBSET}",
                    "license": "CC BY 4.0",
                })
                print(f"[real] {cid} spk {spk:5} {genders.get(spk,'?')} "
                      f"{round(len(audio)/sr,2):5.2f}s  {pretty[:44]}")
                picked = True
                break

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"\nWrote {len(manifest)} real clips -> {OUT_DIR}")
    if len(manifest) < N_CLIPS:
        print(f"WARNING: only {len(manifest)}/{N_CLIPS} clips matched filters.")


if __name__ == "__main__":
    main()
