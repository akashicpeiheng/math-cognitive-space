"""Regression tests for preserving editions and exposing incomplete evidence.

Run from the repository root with:
    python mcs-foundations/publication/test_build.py
"""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import build


class ReadingEditionTests(unittest.TestCase):
    version = "2026-10-02-r1"

    def setUp(self):
        self.catalog = json.loads(build.CATALOG.read_text(encoding="utf-8"))

    def test_rejects_missing_chapter(self):
        self.catalog["books"][0]["parts"][1]["sources"].pop()
        with self.assertRaisesRegex(ValueError, "coverage mismatch"):
            build.validate_catalog(self.catalog)

    def test_rejects_duplicate_chapter(self):
        part = self.catalog["books"][0]["parts"][1]
        part["sources"].append(part["sources"][0])
        with self.assertRaisesRegex(ValueError, "duplicate chapter"):
            build.validate_catalog(self.catalog)

    def test_rejects_source_outside_foundations(self):
        self.catalog["books"][0]["parts"][0]["sources"][0] = "../AGENTS.md"
        with self.assertRaisesRegex(ValueError, "escapes root"):
            build.validate_catalog(self.catalog)

    def test_rejects_invalid_release_names(self):
        for version in ("../outside", "2026-10-02-r0", "2026-02-30-r1", "C:/outside"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                build.release_path(version)

    def test_existing_release_is_not_overwritten(self):
        release = build.release_path(self.version)
        before = {p.relative_to(release): build.digest(p.read_bytes())
                  for p in release.rglob("*") if p.is_file()}
        with self.assertRaises(FileExistsError):
            build.build(self.version)
        after = {p.relative_to(release): build.digest(p.read_bytes())
                 for p in release.rglob("*") if p.is_file()}
        self.assertEqual(before, after)

    def test_detects_corrupt_output(self):
        # Work only on a disposable copy; the recorded edition is never edited.
        with tempfile.TemporaryDirectory(prefix="mcs-publication-test-") as folder:
            release = Path(folder) / self.version
            shutil.copytree(build.release_path(self.version), release)
            name = self.catalog["books"][0]["output"]
            (release / name).write_text("corrupt", encoding="utf-8")
            with patch.object(build, "RELEASES", Path(folder)):
                with self.assertRaisesRegex(ValueError, "hash mismatch"):
                    build.verify(self.version)

    def test_detects_corrupt_source_snapshot(self):
        with tempfile.TemporaryDirectory(prefix="mcs-publication-test-") as folder:
            release = Path(folder) / self.version
            shutil.copytree(build.release_path(self.version), release)
            manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
            (release / manifest["sources"][0]["snapshot"]).write_bytes(b"corrupt")
            with patch.object(build, "RELEASES", Path(folder)):
                with self.assertRaisesRegex(ValueError, "source snapshot mismatch"):
                    build.verify(self.version)

    def test_working_source_drift_is_separate_from_snapshot_integrity(self):
        with tempfile.TemporaryDirectory(prefix="mcs-publication-source-") as folder:
            with patch.object(build, "ROOT", Path(folder)):
                result = build.verify(self.version)
        self.assertEqual(result["status"], "passed")
        self.assertEqual(len(result["current_source_drift"]), 27)
        self.assertEqual(result["publication_status"], "local-only")

    def test_missing_local_link_is_reported(self):
        with tempfile.TemporaryDirectory(prefix="mcs-publication-link-") as folder:
            source = Path(folder) / "chapter.md"
            errors = build.missing_links("[evidence](missing.json)", source)
        self.assertEqual(len(errors), 1)
        self.assertIn("missing.json", errors[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
