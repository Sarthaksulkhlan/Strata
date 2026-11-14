from __future__ import annotations

import os
import re
import shutil
import tempfile
import logging
import urllib.request
import zipfile
from pathlib import Path

from integration_api.service import SnapshotError, validate_snapshot

LOGGER = logging.getLogger("clutchiq.snapshot_bootstrap")

_REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_COMMIT_SHA = re.compile(r"^[0-9a-fA-F]{40,64}$")


class SnapshotBootstrapError(RuntimeError): pass


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value: raise SnapshotBootstrapError("Snapshot bootstrap configuration is incomplete.")
    return value


def _safe_extract(archive: zipfile.ZipFile, prefix: str, destination: Path) -> None:
    for member in archive.infolist():
        if member.is_dir() or not member.filename.startswith(prefix): continue
        relative = Path(member.filename[len(prefix):])
        if not relative.parts or relative.is_absolute() or ".." in relative.parts: raise SnapshotBootstrapError("Snapshot archive contains an unsafe path.")
        # Reject Unix symlinks; only regular files are allowed in the snapshot.
        if (member.external_attr >> 16) & 0o170000 == 0o120000: raise SnapshotBootstrapError("Snapshot archive contains an unsupported link.")
        output = (destination / relative).resolve()
        if destination.resolve() not in output.parents: raise SnapshotBootstrapError("Snapshot archive contains an unsafe path.")
        output.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member) as source, output.open("wb") as target: shutil.copyfileobj(source, target)


def bootstrap_snapshot() -> Path:
    repository, revision, token = _required("SNAPSHOT_GITHUB_REPOSITORY"), _required("SNAPSHOT_GITHUB_REF"), _required("SNAPSHOT_GITHUB_TOKEN")
    output = Path(_required("CLUTCHIQ_OUTPUT_SNAPSHOT")).resolve()
    if not _REPOSITORY.fullmatch(repository) or not _COMMIT_SHA.fullmatch(revision): raise SnapshotBootstrapError("Snapshot bootstrap configuration is invalid.")
    request = urllib.request.Request(f"https://api.github.com/repos/{repository}/zipball/{revision}", headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}", "User-Agent": "clutchiq-snapshot-bootstrap"})
    staging_parent = output.parent; staging_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=staging_parent, prefix="snapshot-stage-") as temporary:
        temporary_root = Path(temporary); archive_path = temporary_root / "snapshot.zip"; staging = temporary_root / "payload"; staging.mkdir()
        try:
            LOGGER.info("snapshot bootstrap: downloading pinned archive")
            with urllib.request.urlopen(request, timeout=60) as response, archive_path.open("wb") as target: shutil.copyfileobj(response, target)
            LOGGER.info("snapshot bootstrap: extracting approved snapshot")
            with zipfile.ZipFile(archive_path) as archive:
                candidates = [member.filename for member in archive.infolist() if member.filename.endswith("/phase7a_v2_a/manifest.json")]
                if len(candidates) != 1: raise SnapshotBootstrapError("Snapshot archive layout is invalid.")
                prefix = candidates[0][:-len("manifest.json")]
                _safe_extract(archive, prefix, staging)
            LOGGER.info("snapshot bootstrap: validating complete manifest")
            validate_snapshot(staging)
            LOGGER.info("snapshot bootstrap: manifest validation passed")
        except urllib.error.HTTPError as error:
            LOGGER.error("snapshot bootstrap: download failed with HTTP status %s", error.code)
            raise SnapshotBootstrapError("Snapshot retrieval or integrity validation failed.") from error
        except urllib.error.URLError as error:
            LOGGER.error("snapshot bootstrap: download failed due to a network error")
            raise SnapshotBootstrapError("Snapshot retrieval or integrity validation failed.") from error
        except SnapshotError as error:
            LOGGER.error("snapshot bootstrap: manifest validation failed")
            raise SnapshotBootstrapError("Snapshot retrieval or integrity validation failed.") from error
        except (OSError, zipfile.BadZipFile) as error:
            LOGGER.error("snapshot bootstrap: extraction failed (%s)", type(error).__name__)
            raise SnapshotBootstrapError("Snapshot retrieval or integrity validation failed.") from error
        if output.exists(): shutil.rmtree(output)
        staging.replace(output)
    return output


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    try: bootstrap_snapshot()
    except SnapshotBootstrapError as error: raise SystemExit(str(error))


if __name__ == "__main__": main()
