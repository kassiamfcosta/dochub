#!/usr/bin/env python3
import json
import sys
from typing import Any, Dict, List

import whisper


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_words(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    words: List[Dict[str, Any]] = []
    for segment in segments:
        seg_start = to_float(segment.get("start"))
        seg_end = to_float(segment.get("end"))
        segment_words = segment.get("words")

        if isinstance(segment_words, list) and segment_words:
            for w in segment_words:
                raw_word = str(w.get("word") or "").strip()
                if not raw_word:
                    continue
                words.append(
                    {
                        "word": raw_word,
                        "start": to_float(w.get("start"), seg_start),
                        "end": to_float(w.get("end"), seg_end),
                    }
                )
            continue

        fallback_text = str(segment.get("text") or "").strip()
        if fallback_text:
            words.append({"word": fallback_text, "start": seg_start, "end": seg_end})

    return words


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: whisper_local_transcribe.py <audio_path> [model] [language]", file=sys.stderr)
        return 1

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "pt"

    model = whisper.load_model(model_name)
    kwargs: Dict[str, Any] = {"task": "transcribe", "language": language, "fp16": False}

    try:
        result = model.transcribe(audio_path, word_timestamps=True, **kwargs)
    except TypeError:
        result = model.transcribe(audio_path, **kwargs)

    segments = result.get("segments") or []
    words = normalize_words(segments)
    duration = to_float(segments[-1].get("end")) if segments else 0.0

    payload = {
        "text": str(result.get("text") or "").strip(),
        "language": str(result.get("language") or language),
        "duration": duration,
        "words": words,
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
