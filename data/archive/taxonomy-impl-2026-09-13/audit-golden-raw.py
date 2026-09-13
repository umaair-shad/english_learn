import json
from pathlib import Path

RAW = Path(
    r"E:\fiver\Project English Learn\project\raw-wiktextract-data.jsonl\raw-wiktextract-data.jsonl"
)
wanted = {"bank", "atom", "river", "election", "volunteer", "boil"}
found = []
with RAW.open("r", encoding="utf-8") as fh:
    for i, line in enumerate(fh, 1):
        if i > 400_000:
            break
        if '"lang_code": "en"' not in line:
            continue
        rec = json.loads(line)
        if rec.get("lang_code") != "en":
            continue
        word = str(rec.get("word") or "").lower()
        if word not in wanted:
            continue
        for sense in rec.get("senses") or []:
            gloss = (sense.get("glosses") or [""])[0]
            found.append(
                {
                    "word": rec.get("word"),
                    "pos": rec.get("pos"),
                    "gloss": gloss[:160],
                    "topics": sense.get("topics") or [],
                    "en_cats": [
                        c
                        for c in (sense.get("categories") or [])
                        if str(c).startswith("en:")
                    ],
                }
            )
        if len(found) >= 40:
            break
print(json.dumps(found, indent=2))
