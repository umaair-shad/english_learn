from __future__ import annotations

import json
import time

import pytest

from vocabulary_pipeline.sources.wiktextract import iter_records


def _fragment_stream(data: bytes, size: int):
    return (data[i : i + size] for i in range(0, len(data), size))


def _blob(lines: list[str]) -> bytes:
    return ("\n".join(lines) + "\n").encode("utf-8")


EN = {
    "word": "bank",
    "pos": "noun",
    "lang_code": "en",
    "lang": "English",
    "senses": [{"glosses": ["financial institution"], "examples": [{"text": "a bank"}]}],
    "translations": [{"word": "bank", "lang_code": "pl"}],
}
FR = {"word": "banque", "pos": "noun", "lang_code": "fr", "lang": "French"}
PL = {"word": "bank", "pos": "noun", "lang_code": "pl", "lang": "Polish"}
NO_LANG = {"word": "mystery", "pos": "noun"}


def test_iter_records_chunk_boundaries_preserve_records(tmp_path, monkeypatch):
    path = tmp_path / "records.jsonl"
    lines = [json.dumps(x, ensure_ascii=False) for x in (EN, FR, PL, EN, NO_LANG)]
    data = _blob(lines)
    monkeypatch.setattr(
        "vocabulary_pipeline.sources.wiktextract.open_stream",
        lambda _p: _fragment_stream(data, 13),
    )
    got = list(iter_records(path))
    words = [record["word"] for record, _ in got]
    # only the two English "bank" records survive; FR/PL/missing-lang filtered
    assert words == ["bank", "bank"]
    assert got[0][1] == 1
    assert got[1][1] == 4
    assert all(r["lang_code"] == "en" for r, _ in got)


def test_iter_records_multibyte_split_every_byte(tmp_path, monkeypatch):
    path = tmp_path / "records.jsonl"
    extra = json.loads(json.dumps(EN))
    extra["senses"] = [{"glosses": ["żółw"]}]
    data = _blob([json.dumps(extra, ensure_ascii=False)])
    # 1-byte fragments stress every possible UTF-8 / newline boundary
    monkeypatch.setattr(
        "vocabulary_pipeline.sources.wiktextract.open_stream",
        lambda _p: _fragment_stream(data, 1),
    )
    got = list(iter_records(path))
    assert len(got) == 1
    assert got[0][0]["senses"][0]["glosses"] == ["żółw"]
    assert got[0][1] == 1


def test_iter_records_throughput_smoke(tmp_path, monkeypatch):
    path = tmp_path / "large.jsonl"
    lines = [json.dumps(EN, ensure_ascii=False)] * 30_000
    data = _blob(lines)
    monkeypatch.setattr(
        "vocabulary_pipeline.sources.wiktextract.open_stream",
        lambda _p: _fragment_stream(data, 1 << 20),
    )
    start = time.perf_counter()
    count = sum(1 for _ in iter_records(path, report_every=100_000))
    elapsed = time.perf_counter() - start
    assert count == 30_000
    # pre-fix the quadratic line-split loop took tens of seconds here; the
    # byte-level split must stay comfortably under the bound
    assert elapsed < 15.0


if __name__ == "__main__":
    pytest.main([__file__, "-q"])
