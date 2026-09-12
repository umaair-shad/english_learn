Baseline: 20,000-record sample build (Phase 1 validation)

Generated: 2026-09-09
CLI:        python -m vocabulary_pipeline.cli build --limit 20000
Config:     MIN_GLOSS_SIMILARITY=25; wordnet floor 0.25 / margin 0.12

Contents
  reports/                         QC CSVs + pipeline-summary.{json,md} from the sample
  vocabulary_export.{csv,jsonl}    60,657 sense-centric rows
  manifest.json                    staging manifest at sample completion
  db-counts.txt                    PostgreSQL row counts AFTER sample load (run 1)

PostgreSQL counts (post-load, sample):
  entries       16,760
  senses        60,657
  translations  20,612
  examples      78,121
  cefr          26,099
  frequency     3,437
  synsets       107,519
  sense_synsets 10,084
  rels          131,098
  provenance    73,505
  conflicts     33
  quality       51

These numbers are the reference for ratio checks on the full-dataset run.