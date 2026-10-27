"""Prepare one atomic Git publication, restricted to AutoCareManager in the distribution checkout."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import zipfile

SITE = "https://careauto.online"


def prepare(repository, artifact, platform, version_code, version_name, commit):
    repository, artifact = Path(repository).resolve(), Path(artifact).resolve()
    if platform not in ("android", "ios") or version_code < 1 or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Invalid platform, version or source commit")
    if not re.fullmatch(r"[0-9A-Za-z.+-]{1,60}", version_name):
        raise ValueError("Invalid version name")
    with zipfile.ZipFile(artifact) as package:
        required = {"AndroidManifest.xml", "classes.dex"} if platform == "android" else {"index.html", "manifest.webmanifest", "sw.js", "icons/apple-touch-icon.png"}
        if not required.issubset(package.namelist()) or package.testzip():
            raise ValueError("Incomplete or corrupt package")
    if artifact.stat().st_size > 90 * 1024 * 1024:
        raise ValueError("Package exceeds the Git distribution limit")
    folder_name = "AutoCareManager"
    folder = repository / folder_name
    if folder.is_symlink() or folder.resolve().parent != repository:
        raise ValueError("Unsafe destination")
    folder.mkdir(exist_ok=True)
    if any(item.is_symlink() for item in folder.iterdir()):
        raise ValueError("Distribution must not contain symlinks")
    previous = folder / "latest.json"
    if previous.exists():
        old = json.loads(previous.read_text(encoding="utf-8"))
        if old["versionCode"] > version_code:
            return False  # A delayed run must never replace a newer package.
        if old["versionCode"] == version_code and old["commit"] != commit:
            raise ValueError("Version already used by another commit")
    name = "AutoCareManager.apk" if platform == "android" else "AutoCareManager-iOS.zip"
    suffix = ".apk" if platform == "android" else ".zip"
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    # These changes are published together in a single Git commit, never as delete-then-upload.
    for old in folder.iterdir():
        if old.is_file() and (old.suffix.lower() == suffix or old.name.lower().endswith(suffix + ".sha256")):
            old.unlink()
    shutil.copyfile(artifact, folder / name)
    (folder / (name + ".sha256")).write_text(f"{digest}  {name}\n", encoding="utf-8")
    repo = "AndroidPackageKit" if platform == "android" else "iPhoneOperatingSystem"
    url = f"https://raw.githubusercontent.com/SolutionsFurlaneti/{repo}/main/{folder_name}/{name}"
    metadata = dict(platform=platform, versionCode=version_code, versionName=version_name,
                    commit=commit, sha256=digest, file=name, downloadUrl=url, installUrl=SITE)
    (folder / "latest.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    if platform == "android":
        instructions = f"[Baixar AutoCareManager para Android]({url})\n\nAndroid 7 (API 24) ou superior. Abra o APK baixado e confirme a instalação. Precisa de internet. Atualizações usam a mesma assinatura e preservam a conta no servidor.\n"
    else:
        instructions = f"[Instalar o AutoCare Manager no iPhone]({SITE})\n\n1. Abra o AutoCare Manager no Safari.\n2. Toque em Compartilhar e escolha Adicionar à Tela de Início.\n3. Confirme o nome e toque em Adicionar.\n\nO ícone abre o sistema de gestão de estacionamento em modo de app. É necessária conexão com a internet; os dados e pagamentos continuam protegidos pela sessão do sistema. As atualizações chegam pelo próprio site.\n\nO ZIP desta pasta é uma cópia da versão web para distribuição e auditoria. **Não é um IPA**: a instalação no iPhone é feita pelo Safari.\n"
    (folder / "README.md").write_text(f"# AutoCareManager · {platform.upper()}\n\nVersão {version_name}.\n\n{instructions}\nApenas o pacote atual fica nesta pasta. O histórico do Git preserva versões anteriores.\n", encoding="utf-8")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--platform", choices=["android", "ios"], required=True)
    parser.add_argument("--version-code", type=int, required=True)
    parser.add_argument("--version-name", required=True)
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()
    changed = prepare(args.repository, args.artifact, args.platform, args.version_code, args.version_name, args.commit)
    print("Package prepared." if changed else "Newer version already published; preserved.")
