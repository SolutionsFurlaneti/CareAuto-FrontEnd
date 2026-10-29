"""Publish the approved, already deployed frontend artifact as a resumable release."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Mapping, Sequence
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


JOB_RESULTS = ("CI_RESULT", "MOBILE_RESULT", "DEPLOY_WEB_RESULT")


class ReleaseError(RuntimeError):
    """A release precondition or publishing operation failed."""


@dataclass(frozen=True)
class ReleaseResult:
    tag: str
    commit: str
    url: str
    archive_name: str


def command(arguments: Sequence[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(arguments), cwd=cwd, capture_output=True, text=True, encoding="utf-8", check=False,
    )


def git(*arguments: str, cwd: Path) -> str:
    result = command(("git", *arguments), cwd=cwd)
    if result.returncode:
        raise ReleaseError("Git falhou: " + (result.stderr.strip() or result.stdout.strip()))
    return result.stdout.strip()


def gh(*arguments: str) -> subprocess.CompletedProcess[str]:
    """CLI boundary, replaced by an offline stand-in in the release tests."""
    return command(("gh", *arguments))


def github(*arguments: str):
    result = gh(*arguments)
    if result.returncode:
        raise ReleaseError("GitHub falhou: " + (result.stderr.strip() or result.stdout.strip()))
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ReleaseError("A resposta do GitHub não contém JSON válido.") from error


def github_command(*arguments: str) -> None:
    result = gh(*arguments)
    if result.returncode:
        raise ReleaseError("GitHub falhou: " + (result.stderr.strip() or result.stdout.strip()))


def approved_context(environment: Mapping[str, str], repository_dir: Path) -> tuple[str, str, str]:
    values = {}
    for name in ("GITHUB_SHA", "GITHUB_REPOSITORY", "GITHUB_REF", "DEFAULT_BRANCH"):
        value = environment.get(name, "")
        if not value:
            raise ReleaseError(f"Contexto de release ausente: {name}.")
        values[name] = value
    if values["GITHUB_REF"] != "refs/heads/" + values["DEFAULT_BRANCH"]:
        raise ReleaseError("Release permitida somente na branch principal.")
    for name in JOB_RESULTS:
        if environment.get(name) != "success":
            raise ReleaseError(f"Release bloqueada: {name} não foi aprovado.")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", values["GITHUB_SHA"]):
        raise ReleaseError("GITHUB_SHA deve identificar o commit aprovado.")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", values["GITHUB_REPOSITORY"]):
        raise ReleaseError("GITHUB_REPOSITORY inválido.")
    if git("rev-parse", "--is-shallow-repository", cwd=repository_dir) != "false":
        raise ReleaseError("A contagem da versão exige o histórico completo (fetch-depth: 0).")
    commit = git("rev-parse", "--verify", values["GITHUB_SHA"] + "^{commit}", cwd=repository_dir)
    count = int(git("rev-list", "--count", commit, cwd=repository_dir))
    tag = f"v1.0.{count}"
    local_tag = command(("git", "show-ref", "--verify", "--quiet", "refs/tags/" + tag), cwd=repository_dir)
    if local_tag.returncode == 0:
        target = git("rev-parse", f"refs/tags/{tag}^{{commit}}", cwd=repository_dir)
        if target != commit:
            raise ReleaseError(f"A tag local {tag} pertence a outro commit; nenhuma versão será sobrescrita.")
    elif local_tag.returncode != 1:
        raise ReleaseError("Não foi possível verificar a tag local.")
    return values["GITHUB_REPOSITORY"], commit, tag


def artifact_files(artifact_dir: Path) -> tuple[Path, list[Path]]:
    if artifact_dir.is_symlink() or not artifact_dir.is_dir():
        raise ReleaseError("Informe o diretório do artefato web aprovado.")
    root = artifact_dir.resolve()
    files = []
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ReleaseError("O pacote de produção não pode conter links simbólicos.")
        if path.name.casefold() == ".env" or path.name.casefold().startswith(".env."):
            raise ReleaseError("O pacote de produção não pode conter arquivos .env.")
        if path.is_file():
            files.append(path)
    index = root / "index.html"
    if not index.is_file() or index.stat().st_size == 0:
        raise ReleaseError("O artefato web aprovado deve conter index.html não vazio.")
    return root, sorted(files, key=lambda path: path.relative_to(root).as_posix())


def package_artifact(root: Path, files: Sequence[Path], archive_path: Path) -> Path:
    # Stable metadata makes the ZIP reproducible when the downloaded artifact is unchanged.
    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            info = ZipInfo(path.relative_to(root).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    checksum = archive_path.parent / "SHA256SUMS"
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    checksum.write_text(f"{digest}  {archive_path.name}\n", encoding="utf-8", newline="\n")
    return checksum


def verify_release_assets(release, expected: set[str]) -> None:
    names = {asset["name"] for asset in release.get("assets", [])}
    if not expected.issubset(names):
        raise ReleaseError("A Release não contém os anexos esperados; revise-a antes de publicar.")


def find_release(base: str, tag: str):
    # The tag endpoint only returns published releases. Authenticated listing also
    # includes drafts, and pagination is required when resuming an older release.
    pages = github("api", "--paginate", "--slurp", base + "/releases?per_page=100")
    for page in pages:
        for release in page:
            if release.get("tag_name") == tag:
                return release
    return None


def publish_release(
    artifact_dir: Path,
    *,
    environment: Mapping[str, str] | None = None,
    repository_dir: Path | None = None,
) -> ReleaseResult:
    environment = os.environ if environment is None else environment
    repository_dir = Path.cwd() if repository_dir is None else repository_dir
    repository, commit, tag = approved_context(environment, repository_dir)
    root, files = artifact_files(artifact_dir)
    archive_name = f"autocaremanager-web-{tag}.zip"
    expected = {archive_name, "SHA256SUMS"}
    base = "repos/" + repository

    with tempfile.TemporaryDirectory(prefix="autocare-web-release-") as directory:
        archive = Path(directory) / archive_name
        checksum = package_artifact(root, files, archive)
        refs = github("api", base + "/git/matching-refs/tags/" + tag)
        matching = [reference for reference in refs if reference.get("ref") == "refs/tags/" + tag]
        if matching:
            remote_commit = github("api", base + "/commits/" + tag)["sha"]
            if remote_commit != commit:
                raise ReleaseError(f"A tag remota {tag} não aponta para o commit aprovado.")
        else:
            github("api", "--method", "POST", base + "/git/refs", "-f", "ref=refs/tags/" + tag, "-f", "sha=" + commit)
        # Check the exact remote tag even after creation, before creating or mutating a release.
        if github("api", base + "/commits/" + tag)["sha"] != commit:
            raise ReleaseError(f"A tag remota {tag} não aponta para o commit aprovado.")
        release = find_release(base, tag)
        if release is None:
            github_command(
                "release", "create", tag, "--repo", repository, "--target", commit,
                "--title", tag, "--generate-notes", "--draft",
            )
            release = find_release(base, tag)
            if release is None:
                raise ReleaseError("O GitHub não retornou o rascunho recém-criado.")
        if release["draft"]:
            github_command("release", "upload", tag, str(archive), str(checksum), "--repo", repository, "--clobber")
            release = find_release(base, tag)
            if release is None or not release["draft"]:
                raise ReleaseError("O rascunho mudou antes de concluir a publicação.")
            verify_release_assets(release, expected)
            github_command("release", "edit", tag, "--repo", repository, "--draft=false", "--latest")
            release = find_release(base, tag)
            if release is None or release["draft"]:
                raise ReleaseError("O GitHub ainda informa a Release como rascunho.")
        verify_release_assets(release, expected)
        result = ReleaseResult(tag, commit, release["html_url"], archive_name)

    summary = environment.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a", encoding="utf-8", newline="\n") as output:
            output.write(
                f"### Release web publicada: [{tag}]({result.url})\n\n"
                f"Commit aprovado: `{commit}`\n\nPacote de produção: `{archive_name}` e `SHA256SUMS`.\n"
            )
    return result


def main(arguments: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact_dir", type=Path, help="artefato dist aprovado e implantado no Azure")
    args = parser.parse_args(arguments)
    try:
        result = publish_release(args.artifact_dir)
    except (ReleaseError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Release bloqueada: {error}", file=sys.stderr)
        return 1
    print(f"Release aprovada: {result.tag} ({result.commit})\n{result.url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
