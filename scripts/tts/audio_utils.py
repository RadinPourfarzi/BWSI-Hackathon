"""Shared audio helpers for the AI-detection audio pipeline.

Loudness-normalizes and trims every clip (AI and real) to the SAME targets so the
only distinguishing signal is voice authenticity, never level or format.
"""
from __future__ import annotations

import numpy as np


def to_mono(audio: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    return audio


def trim_silence(audio: np.ndarray, sr: int, threshold_db: float = 40.0,
                 pad_ms: float = 80.0) -> np.ndarray:
    """Trim leading/trailing silence below (peak - threshold_db)."""
    if audio.size == 0:
        return audio
    peak = float(np.max(np.abs(audio))) or 1e-9
    floor = peak * (10.0 ** (-threshold_db / 20.0))
    mask = np.abs(audio) > floor
    if not mask.any():
        return audio
    first, last = np.argmax(mask), len(mask) - np.argmax(mask[::-1])
    pad = int(sr * pad_ms / 1000.0)
    return audio[max(0, first - pad): min(len(audio), last + pad)]


def normalize(audio: np.ndarray, rms_dbfs: float = -20.0,
              peak_dbfs: float = -1.0) -> np.ndarray:
    """RMS-normalize to a target, then peak-limit to avoid clipping."""
    audio = np.asarray(audio, dtype=np.float32)
    rms = float(np.sqrt(np.mean(np.square(audio)))) or 1e-9
    audio = audio * (10.0 ** (rms_dbfs / 20.0)) / rms
    peak = float(np.max(np.abs(audio))) or 1e-9
    ceil = 10.0 ** (peak_dbfs / 20.0)
    if peak > ceil:
        audio = audio * (ceil / peak)
    return audio.astype(np.float32)


def process(audio: np.ndarray, sr: int, *, rms_dbfs: float, peak_dbfs: float,
            trim_db: float) -> np.ndarray:
    return normalize(trim_silence(to_mono(audio), sr, trim_db),
                     rms_dbfs=rms_dbfs, peak_dbfs=peak_dbfs)
