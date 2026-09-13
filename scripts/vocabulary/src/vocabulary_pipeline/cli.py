"""CLI entry point.

Commands (see scripts/vocabulary/README.md for detailed docs):

    vocabulary-pipeline build [--sources ...] [--limit N] [--resume] [--stage ...]
    vocabulary-pipeline extract --source wiktextract --limit 1000
    vocabulary-pipeline validate
    vocabulary-pipeline load-postgres [--dry-run]
    vocabulary-pipeline report
    vocabulary-pipeline export [--format csv json excel]
    vocabulary-pipeline inspect   (paths + file facts)
"""

from __future__ import annotations

import argparse
import sys

from .config import ensure_directories, load_config
from .logging import LOG, setup_logging


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    setup_logging(args.log_level or "INFO")
    cfg = load_config()
    ensure_directories(cfg)

    if args.command == "inspect":
        cmd_inspect(cfg)
        return 0
    if args.command == "build":
        return cmd_build(cfg, args)
    if args.command == "extract":
        return cmd_extract(cfg, args)
    if args.command == "validate":
        return cmd_validate(cfg, args)
    if args.command == "load-postgres":
        return cmd_load(cfg, args)
    if args.command == "extract-topics":
        return cmd_extract_topics(cfg, args)
    if args.command == "apply-topics":
        return cmd_apply_topics(cfg, args)
    if args.command == "report":
        return cmd_report(cfg, args)
    if args.command == "export":
        return cmd_export(cfg, args)
    parser.print_help()
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vocabulary-pipeline")
    parser.add_argument("--log-level", default=None)
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("inspect", help="print dataset paths and facts")

    p_build = sub.add_parser("build", help="run extract→normalize→reconcile→validate→report→export")
    p_build.add_argument("--sources", nargs="*", default=None)
    p_build.add_argument("--limit", type=int, default=None, help="max English records (dev sampling)")
    p_build.add_argument("--resume", action="store_true")
    p_build.add_argument("--stage", nargs="*", default=None,
                         help="stages to run from {extract,normalize,reconcile,validate,export,load}")
    p_build.add_argument("--load-postgres", action="store_true", help="also load into PostgreSQL")
    p_build.add_argument("--dry-run", action="store_true")

    p_extract = sub.add_parser("extract", help="run extraction only")
    p_extract.add_argument("--source", required=True)
    p_extract.add_argument("--limit", type=int, default=None)
    p_extract.add_argument("--resume", action="store_true")

    p_validate = sub.add_parser("validate", help="validation + reports")
    p_validate.add_argument("--limit", type=int, default=None)

    p_load = sub.add_parser("load-postgres", help="bulk load processed data into PostgreSQL")
    p_load.add_argument("--dry-run", action="store_true")
    p_load.add_argument("--force", action="store_true", help="skip the idempotency fingerprint check")

    p_topics = sub.add_parser(
        "extract-topics",
        help="thin sidecar: Wiktextract topics/categories from the existing raw dump",
    )
    p_topics.add_argument("--resume", action="store_true")

    p_apply = sub.add_parser(
        "apply-topics",
        help="attach sidecar + WordNet domains to senses and remove placeholder categories",
    )
    p_apply.add_argument(
        "--keep-placeholders",
        action="store_true",
        help="do not delete generated actions 1 / basics 1 rows",
    )

    sub.add_parser("report", help="regenerate reports only")

    p_export = sub.add_parser("export", help="write CSV/JSON/Excel exports")
    p_export.add_argument("--format", nargs="*", default=None)
    return parser


def _manifest(cfg):
    from .pipeline.io import Manifest

    cfg.staging_dir.mkdir(parents=True, exist_ok=True)
    return Manifest(cfg.staging_dir / "manifest.json")


def cmd_inspect(cfg) -> None:

    print("=== Vocabulary pipeline paths ===")
    for name in ("raw_dir", "staging_dir", "processed_dir", "reports_dir", "exports_dir"):
        print(f"{name}: {getattr(cfg, name)}")
    print("\n=== Source files ===")
    from .config import SOURCE_FILES

    for source, rel in SOURCE_FILES.items():
        path = cfg.source_path(source)
        exists = path.exists()
        size = path.stat().st_size if exists else 0
        print(f"{source:10s} exists={exists!s:5s} size={size:,} bytes  {path}")


def cmd_extract(cfg, args) -> int:
    from .pipeline.extract import run as extract_run
    from .pipeline.io import Manifest

    manifest = Manifest(cfg.staging_dir / "manifest.json")
    extract_run(manifest, cfg, sources=[args.source], limit=args.limit, resume=args.resume)
    LOG.info("extract complete")
    return 0


def cmd_build(cfg, args) -> int:
    from .pipeline.export import run as export_run
    from .pipeline.extract import run as extract_run
    from .pipeline.io import Manifest
    from .pipeline.load import run as load_run
    from .pipeline.normalize import run as normalize_run
    from .pipeline.reconcile import run as reconcile_run
    from .pipeline.validate import run as validate_run

    manifest = Manifest(cfg.staging_dir / "manifest.json")
    limit = args.limit or cfg.default_limit

    stages = set(args.stage) if args.stage else {"extract", "normalize", "reconcile", "validate", "report", "export"}
    resume = args.resume

    if "extract" in stages:
        summary = extract_run(manifest, cfg, sources=args.sources, limit=limit, resume=resume)
        LOG.info("[build] extract: %s", summary)
    if "normalize" in stages:
        normalize_run(manifest, cfg)
    if "reconcile" in stages:
        reconcile_run(manifest, cfg)
    if "validate" in stages:
        validate_run(manifest, cfg)
    if "report" in stages:
        # already produced by validate; ensure it ran
        from .quality.reporting import generate

        result = validate_processed_lite(cfg)
        generate(cfg, validate_result=result)
    if "export" in stages:
        export_run(manifest, cfg)
    if "load" in stages or args.load_postgres:
        load_run(manifest, cfg, dry_run=args.dry_run)
    LOG.info("build finished")
    return 0


def validate_processed_lite(cfg):
    from .quality.validators import validate_processed

    return validate_processed(cfg)


def cmd_validate(cfg, args) -> int:
    from .pipeline.io import Manifest
    from .pipeline.validate import run

    run(Manifest(cfg.staging_dir / "manifest.json"), cfg)
    return 0


def cmd_extract_topics(cfg, args) -> int:
    from .pipeline.extract_topics import extract_topics

    extract_topics(cfg, resume=args.resume)
    return 0


def cmd_apply_topics(cfg, args) -> int:
    from .pipeline.apply_topics import apply_topics

    apply_topics(cfg, retire_placeholders=not args.keep_placeholders)
    return 0


def cmd_load(cfg, args) -> int:
    from .pipeline.io import Manifest
    from .pipeline.load import run

    run(Manifest(cfg.staging_dir / "manifest.json"), cfg, dry_run=args.dry_run, skip_fingerprint=args.force)
    return 0


def cmd_report(cfg, args) -> int:
    from .quality.reporting import generate
    from .quality.validators import validate_processed

    result = validate_processed(cfg)
    generate(cfg, validate_result=result)
    return 0


def cmd_export(cfg, args) -> int:
    from .pipeline.export import run
    from .pipeline.io import Manifest

    run(Manifest(cfg.staging_dir / "manifest.json"), cfg, formats=args.format)
    return 0


if __name__ == "__main__":
    sys.exit(main())
