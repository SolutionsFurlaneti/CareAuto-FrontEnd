"""Exercise web releases with real local Git history and an offline GitHub CLI boundary."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "create-web-release.py"
SPEC = importlib.util.spec_from_file_location("web_release", SCRIPT)
web_release = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = web_release
SPEC.loader.exec_module(web_release)
REPOSITORY = "example/CareAuto-FrontEnd"


class FakeGithub:
    def __init__(self, asset_dir):
        self.asset_dir = asset_dir
        self.tags = {}
        self.releases = {}
        self.calls = []
        self.interrupted_uploads = 0
        self.release_query_failure = False
        self.list_page_size = 100
        self.omit_uploaded_asset = None

    @staticmethod
    def result(arguments, value=None, error=None, status=1):
        if error is not None:
            return subprocess.CompletedProcess(arguments, status, "", error)
        return subprocess.CompletedProcess(arguments, 0, json.dumps(value), "")

    def metadata(self, tag):
        release = self.releases[tag]
        return {
            "tag_name": tag,
            "draft": release["draft"],
            "html_url": release["url"],
            "assets": [{"name": name} for name in release["assets"]],
        }

    def __call__(self, *arguments):
        self.calls.append(arguments)

        def option(name):
            return arguments[arguments.index(name) + 1]

        if arguments[0] == "api":
            endpoint = next(item for item in arguments[1:] if item.startswith("repos/"))
            base = "repos/" + REPOSITORY + "/"
            if endpoint.startswith(base + "git/matching-refs/tags/"):
                prefix = endpoint.removeprefix(base + "git/matching-refs/tags/")
                return self.result(arguments, [
                    {"ref": "refs/tags/" + tag} for tag in self.tags if tag.startswith(prefix)
                ])
            if endpoint == base + "git/refs":
                if option("--method") != "POST":
                    raise AssertionError(arguments)
                fields = dict(arguments[index + 1].split("=", 1)
                              for index, item in enumerate(arguments) if item == "-f")
                tag = fields["ref"].removeprefix("refs/tags/")
                if tag in self.tags:
                    return self.result(arguments, error="tag already exists")
                self.tags[tag] = fields["sha"]
                return self.result(arguments, {"ref": fields["ref"]})
            if endpoint.startswith(base + "commits/"):
                tag = endpoint.removeprefix(base + "commits/")
                if tag not in self.tags:
                    return self.result(arguments, error="tag not found")
                return self.result(arguments, {"sha": self.tags[tag]})
            if endpoint == base + "releases?per_page=100":
                if "--paginate" not in arguments or "--slurp" not in arguments:
                    raise AssertionError(arguments)
                if self.release_query_failure:
                    return self.result(arguments, error="gh: upstream unavailable (HTTP 503)")
                releases = [self.metadata(tag) for tag in self.releases]
                pages = [releases[index:index + self.list_page_size]
                         for index in range(0, len(releases), self.list_page_size)]
                return self.result(arguments, pages or [[]])
            if endpoint.startswith(base + "releases/tags/"):
                if self.release_query_failure:
                    return self.result(arguments, error="gh: upstream unavailable (HTTP 503)")
                tag = endpoint.removeprefix(base + "releases/tags/")
                if tag not in self.releases or self.releases[tag]["draft"]:
                    return subprocess.CompletedProcess(
                        arguments, 1, json.dumps({"message": "Not Found", "status": "404"}),
                        "gh: Not Found (HTTP 404)",
                    )
                return self.result(arguments, self.metadata(tag))
        elif arguments[:2] == ("release", "create"):
            tag = arguments[2]
            if tag in self.releases:
                return self.result(arguments, error="release already exists")
            if option("--target") != self.tags[tag] or "--draft" not in arguments:
                raise AssertionError(arguments)
            self.releases[tag] = {
                "draft": True,
                "url": f"https://github.com/{REPOSITORY}/releases/tag/{tag}",
                "assets": {},
            }
            return self.result(arguments, self.releases[tag]["url"])
        elif arguments[:2] == ("release", "upload"):
            tag = arguments[2]
            release = self.releases[tag]
            if not release["draft"]:
                return self.result(arguments, error="published assets must not be overwritten")
            sources = []
            for item in arguments[3:]:
                if item.startswith("--"):
                    break
                sources.append(Path(item))
            destination = self.asset_dir / tag
            destination.mkdir(parents=True, exist_ok=True)
            for index, source in enumerate(sources):
                if source.name == self.omit_uploaded_asset:
                    continue
                target = destination / source.name
                shutil.copyfile(source, target)
                release["assets"][source.name] = str(target)
                if index == 0 and self.interrupted_uploads:
                    self.interrupted_uploads -= 1
                    return self.result(arguments, error="simulated interrupted upload")
            return self.result(arguments)
        elif arguments[:2] == ("release", "edit"):
            tag = arguments[2]
            release = self.releases[tag]
            required = {f"autocaremanager-web-{tag}.zip", "SHA256SUMS"}
            if not required.issubset(release["assets"]):
                return self.result(arguments, error="release must remain draft until both assets exist")
            if "--draft=false" not in arguments or "--latest" not in arguments:
                raise AssertionError(arguments)
            release["draft"] = False
            return self.result(arguments)
        raise AssertionError("Unexpected GitHub invocation: " + repr(arguments))

    def operations(self, name):
        return [call for call in self.calls if call[:2] == ("release", name)]


class WebReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="autocare-web-release-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repository = self.root / "repository"
        self.repository.mkdir()
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Release Tests")
        self.git("config", "user.email", "release-tests@example.invalid")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "core.autocrlf", "false")
        self.commit("initial.txt", "initial")
        self.initial_sha = self.git("rev-parse", "HEAD")
        self.git("checkout", "-b", "feature")
        self.commit("feature.txt", "feature one")
        self.commit("feature.txt", "feature two")
        self.git("checkout", "main")
        self.commit("main.txt", "main one")
        self.git("merge", "--no-ff", "feature", "-m", "Merge feature")
        self.approved_sha = self.git("rev-parse", "HEAD")
        self.count = int(self.git("rev-list", "--count", self.approved_sha))
        self.tag = f"v1.0.{self.count}"
        self.archive_name = f"autocaremanager-web-{self.tag}.zip"
        self.artifact = self.root / "approved dist"
        (self.artifact / "assets").mkdir(parents=True)
        (self.artifact / "index.html").write_text("<html>approved frontend</html>", encoding="utf-8")
        (self.artifact / "assets/app.js").write_text("console.log('approved');", encoding="utf-8")
        (self.artifact / "staticwebapp.config.json").write_text('{"navigationFallback":{}}', encoding="utf-8")
        self.summary = self.root / "summary.md"
        self.environment = {
            "GITHUB_SHA": self.approved_sha,
            "GITHUB_REPOSITORY": REPOSITORY,
            "GITHUB_REF": "refs/heads/main",
            "DEFAULT_BRANCH": "main",
            "GITHUB_STEP_SUMMARY": str(self.summary),
            **{name: "success" for name in web_release.JOB_RESULTS},
        }
        self.github = FakeGithub(self.root / "uploaded assets")
        self.addCleanup(patch.stopall)
        patch.object(web_release, "gh", self.github).start()

    def git(self, *arguments, cwd=None):
        result = subprocess.run(
            ["git", *arguments], cwd=cwd or self.repository, capture_output=True,
            text=True, encoding="utf-8", check=True,
        )
        return result.stdout.strip()

    def commit(self, name, content):
        (self.repository / name).write_text(content, encoding="utf-8")
        self.git("add", "--", name)
        self.git("commit", "-m", content)

    def publish(self, overrides=None, omitted=(), artifact=None, cwd=None):
        environment = {**self.environment, **(overrides or {})}
        for name in omitted:
            environment.pop(name, None)
        return web_release.publish_release(
            self.artifact if artifact is None else artifact,
            environment=environment, repository_dir=cwd or self.repository,
        )

    def assert_blocked_before_github(self, **arguments):
        with self.assertRaises(web_release.ReleaseError):
            self.publish(**arguments)
        self.assertEqual([], self.github.calls)

    def seed_release(self, *, draft=False, assets=None, target=None):
        self.github.tags[self.tag] = target or self.approved_sha
        self.github.releases[self.tag] = {
            "draft": draft,
            "url": f"https://github.com/{REPOSITORY}/releases/tag/{self.tag}",
            "assets": assets if assets is not None else {
                self.archive_name: "existing archive", "SHA256SUMS": "existing checksum",
            },
        }

    def test_merge_history_publishes_exact_approved_production_files_with_checksum(self):
        self.assertEqual(5, self.count)
        result = self.publish()
        self.assertEqual(self.tag, result.tag)
        self.assertEqual(self.approved_sha, result.commit)
        self.assertEqual(self.approved_sha, self.github.tags[self.tag])
        release = self.github.releases[self.tag]
        self.assertFalse(release["draft"])
        self.assertEqual({self.archive_name, "SHA256SUMS"}, set(release["assets"]))
        archive_path = Path(release["assets"][self.archive_name])
        with ZipFile(archive_path) as archive:
            expected = {"index.html", "assets/app.js", "staticwebapp.config.json"}
            self.assertEqual(expected, set(archive.namelist()))
            for name in expected:
                self.assertEqual((self.artifact / name).read_bytes(), archive.read(name))
        digest, name = Path(release["assets"]["SHA256SUMS"]).read_text(encoding="utf-8").split()
        self.assertEqual(self.archive_name, name)
        self.assertEqual(hashlib.sha256(archive_path.read_bytes()).hexdigest(), digest)
        self.assertIn(result.url, self.summary.read_text(encoding="utf-8"))
        self.assertIn(self.approved_sha, self.summary.read_text(encoding="utf-8"))
        self.assertEqual(1, len(self.github.operations("create")))
        self.assertIn("--generate-notes", self.github.operations("create")[0])
        self.assertEqual(1, len(self.github.operations("upload")))
        self.assertEqual(1, len(self.github.operations("edit")))

    def test_version_and_tag_use_approved_sha_when_checkout_advanced(self):
        self.commit("later.txt", "unapproved later commit")
        self.assertEqual(self.count + 1, int(self.git("rev-list", "--count", "HEAD")))
        result = self.publish()
        self.assertEqual(self.tag, result.tag)
        self.assertEqual(self.approved_sha, self.github.tags[self.tag])

    def test_unsuccessful_or_missing_gates_block_release(self):
        for name in web_release.JOB_RESULTS:
            for status in ("failure", "cancelled", "skipped", "", "unknown"):
                with self.subTest(job=name, status=status):
                    self.assert_blocked_before_github(overrides={name: status})
            with self.subTest(job=name, status="missing"):
                self.assert_blocked_before_github(omitted=(name,))

    def test_missing_context_is_rejected(self):
        for name in ("GITHUB_SHA", "GITHUB_REPOSITORY", "GITHUB_REF", "DEFAULT_BRANCH"):
            with self.subTest(name=name):
                self.assert_blocked_before_github(omitted=(name,))

    def test_pull_request_and_secondary_branch_cannot_publish(self):
        for reference in ("refs/pull/9/merge", "refs/heads/feature"):
            with self.subTest(reference=reference):
                self.assert_blocked_before_github(overrides={"GITHUB_REF": reference})

    def test_invalid_repository_or_commit_is_rejected(self):
        for overrides in ({"GITHUB_REPOSITORY": "../bad/repo"}, {"GITHUB_SHA": "--help"},
                          {"GITHUB_SHA": "0" * 40}):
            with self.subTest(overrides=overrides):
                self.assert_blocked_before_github(overrides=overrides)

    def test_shallow_git_history_is_rejected(self):
        shallow = self.root / "shallow"
        self.git("clone", "--depth=1", self.repository.as_uri(), str(shallow), cwd=self.root)
        self.assertEqual("true", self.git("rev-parse", "--is-shallow-repository", cwd=shallow))
        self.assert_blocked_before_github(cwd=shallow)

    def test_missing_or_empty_index_and_missing_artifact_are_rejected(self):
        self.assert_blocked_before_github(artifact=self.root / "missing dist")
        (self.artifact / "index.html").unlink()
        self.assert_blocked_before_github()
        (self.artifact / "index.html").write_bytes(b"")
        self.assert_blocked_before_github()

    def test_environment_files_are_rejected_before_github(self):
        for name in (".env", ".env.production", "assets/.ENV.local"):
            with self.subTest(name=name):
                environment_file = self.artifact / name
                environment_file.write_text("not a real secret", encoding="utf-8")
                self.assert_blocked_before_github()
                environment_file.unlink()

    def test_symlink_cannot_copy_files_from_outside_the_approved_artifact(self):
        outside = self.root / "outside.txt"
        outside.write_text("not approved", encoding="utf-8")
        link = self.artifact / "assets/outside.txt"
        try:
            link.symlink_to(outside)
        except OSError as error:
            self.skipTest("This Windows account cannot create symlinks: " + str(error))
        self.assert_blocked_before_github()

    def test_local_tag_collision_is_never_overwritten(self):
        self.git("tag", self.tag, self.initial_sha)
        self.assert_blocked_before_github()
        self.assertEqual(self.initial_sha, self.git("rev-parse", self.tag))

    def test_remote_tag_collision_cannot_create_upload_or_publish_release(self):
        self.github.tags[self.tag] = self.initial_sha
        with self.assertRaisesRegex(web_release.ReleaseError, "tag remota"):
            self.publish()
        for operation in ("create", "upload", "edit"):
            self.assertEqual([], self.github.operations(operation))
        self.assertEqual(self.initial_sha, self.github.tags[self.tag])

    def test_similar_tag_name_does_not_satisfy_the_exact_tag_lookup(self):
        self.github.tags[self.tag + "0"] = self.initial_sha
        self.publish()
        self.assertEqual(self.approved_sha, self.github.tags[self.tag])
        self.assertEqual(self.initial_sha, self.github.tags[self.tag + "0"])

    def test_interrupted_upload_stays_draft_and_retry_completes_without_duplicate_release(self):
        self.github.interrupted_uploads = 1
        with self.assertRaisesRegex(web_release.ReleaseError, "simulated interrupted upload"):
            self.publish()
        self.assertTrue(self.github.releases[self.tag]["draft"])
        self.assertEqual({self.archive_name}, set(self.github.releases[self.tag]["assets"]))
        self.assertEqual([], self.github.operations("edit"))
        self.publish()
        self.assertFalse(self.github.releases[self.tag]["draft"])
        self.assertEqual({self.archive_name, "SHA256SUMS"}, set(self.github.releases[self.tag]["assets"]))
        self.publish()
        self.assertEqual(1, len(self.github.operations("create")))
        self.assertEqual(2, len(self.github.operations("upload")))
        self.assertEqual(1, len(self.github.operations("edit")))

    def test_published_release_is_idempotent_without_mutating_assets(self):
        self.seed_release()
        original = json.loads(json.dumps(self.github.releases))
        result = self.publish()
        self.assertEqual(self.tag, result.tag)
        self.assertEqual(original, self.github.releases)
        for operation in ("create", "upload", "edit", "delete"):
            self.assertEqual([], self.github.operations(operation))

    def test_existing_draft_on_a_later_page_is_resumed_without_duplicate_creation(self):
        self.github.releases["v1.0.1"] = {
            "draft": False, "url": "https://example.invalid/older-release", "assets": {},
        }
        self.seed_release(draft=True, assets={})
        self.github.list_page_size = 1
        self.publish()
        self.assertFalse(self.github.releases[self.tag]["draft"])
        self.assertEqual([], self.github.operations("create"))
        self.assertEqual(1, len(self.github.operations("upload")))
        self.assertFalse(any("/releases/tags/" in argument
                             for call in self.github.calls for argument in call))

    def test_incomplete_successful_upload_keeps_the_release_as_a_draft(self):
        self.github.omit_uploaded_asset = "SHA256SUMS"
        with self.assertRaisesRegex(web_release.ReleaseError, "anexos esperados"):
            self.publish()
        self.assertTrue(self.github.releases[self.tag]["draft"])
        self.assertEqual({self.archive_name}, set(self.github.releases[self.tag]["assets"]))
        self.assertEqual([], self.github.operations("edit"))

    def test_published_release_missing_either_asset_is_rejected_without_mutation(self):
        for missing in (self.archive_name, "SHA256SUMS"):
            with self.subTest(missing=missing):
                self.seed_release(assets={name: "existing" for name in (self.archive_name, "SHA256SUMS") if name != missing})
                original = json.loads(json.dumps(self.github.releases))
                with self.assertRaisesRegex(web_release.ReleaseError, "anexos esperados"):
                    self.publish()
                self.assertEqual(original, self.github.releases)
                for operation in ("create", "upload", "edit", "delete"):
                    self.assertEqual([], self.github.operations(operation))

    def test_github_query_failure_is_not_treated_as_a_missing_release(self):
        self.github.release_query_failure = True
        with self.assertRaisesRegex(web_release.ReleaseError, "503"):
            self.publish()
        self.assertEqual([], self.github.operations("create"))

    def test_zip_bytes_are_stable_when_only_source_timestamps_change(self):
        root, files = web_release.artifact_files(self.artifact)
        first_dir = self.root / "first"
        second_dir = self.root / "second"
        first_dir.mkdir()
        second_dir.mkdir()
        first = first_dir / self.archive_name
        second = second_dir / self.archive_name
        web_release.package_artifact(root, files, first)
        for path in files:
            os.utime(path, (1800000000, 1800000000))
        web_release.package_artifact(root, files, second)
        self.assertEqual(first.read_bytes(), second.read_bytes())


if __name__ == "__main__":
    unittest.main(verbosity=2)
