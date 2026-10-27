import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("publish_package", Path(__file__).resolve().parent / "publish_package.py")
publish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish)


class PublishTests(unittest.TestCase):
    def test_replaces_old_apks_preserves_other_projects_and_rejects_older_runs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo = root / "repo"
            folder = repo / "AutoCareManager"
            folder.mkdir(parents=True)
            (folder / "old-version.apk").write_bytes(b"old")
            (folder / "old-version.apk.sha256").write_text("old")
            (repo / "OtherApp.apk").write_bytes(b"keep")
            (folder / "notes.txt").write_text("keep")
            artifact = root / "new.apk"
            with zipfile.ZipFile(artifact, "w") as archive:
                archive.writestr("AndroidManifest.xml", "test manifest")
                archive.writestr("classes.dex", "test code")
            self.assertTrue(publish.prepare(repo, artifact, "android", 1002, "1.0.2", "a" * 40))
            self.assertEqual([p.name for p in folder.glob("*.apk")], ["AutoCareManager.apk"])
            self.assertFalse((folder / "old-version.apk.sha256").exists())
            self.assertEqual((repo / "OtherApp.apk").read_bytes(), b"keep")
            self.assertEqual((folder / "notes.txt").read_text(), "keep")
            self.assertFalse(publish.prepare(repo, artifact, "android", 1001, "1.0.1", "b" * 40))
            with self.assertRaises(ValueError):
                publish.prepare(repo, artifact, "android", 1002, "1.0.2", "b" * 40)
            self.assertEqual(json.loads((folder / "latest.json").read_text())["commit"], "a" * 40)

    def test_bad_package_cannot_remove_working_version(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "AutoCareManager").mkdir()
            current = root / "AutoCareManager" / "AutoCareManager.apk"
            current.write_bytes(b"working")
            artifact = root / "bad.zip"
            with zipfile.ZipFile(artifact, "w") as archive:
                archive.writestr("unexpected", "no app")
            with self.assertRaises(ValueError):
                publish.prepare(root, artifact, "android", 1, "1.0", "a" * 40)
            self.assertEqual(current.read_bytes(), b"working")

    def test_ios_package_has_install_instructions_and_stable_name(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            repo = root / "repo"
            repo.mkdir()
            artifact = root / "ios.zip"
            with zipfile.ZipFile(artifact, "w") as archive:
                for name in ["index.html", "manifest.webmanifest", "sw.js", "icons/apple-touch-icon.png"]:
                    archive.writestr(name, "test")
            publish.prepare(repo, artifact, "ios", 1, "1.0", "a" * 40)
            folder = repo / "AutoCareManager"
            self.assertTrue((folder / "AutoCareManager-iOS.zip").is_file())
            instructions = (folder / "README.md").read_text(encoding="utf-8")
            self.assertIn("AutoCare Manager no iPhone", instructions)
            self.assertIn("Não é um IPA", instructions)
