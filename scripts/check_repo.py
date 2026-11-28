#!/usr/bin/env python3
"""
Repo consistency guard for the hybrid layout (option C):

- registry index files must not point at extension dirs missing on disk
- every extension dir holding plugin.zip should be listed in a registry
- when <ext>/src exists, every script declared in plugin.json must exist there
- plugin.json must parse, metadata.version must be an integer
- registry entry version and plugin.zip version must equal <ext>/plugin.json metadata.version
- extension-api.md and the skill copy must stay identical

Usage:
    python scripts/check_repo.py
Exit code 0 = clean, 1 = problems found.
"""
import json
import os
import re
import sys
import zipfile

REGISTRIES = (
    "plugin.json",
    "chinese_plugin.json",
    "audio.json",
    "video_plugin.json",
    "tts.json",
    "translate.json",
    "ai.json",
)
API_FILES = ("extension-api.md", ".agents/skills/vbook-extensions/reference/extension-api.md")


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def ext_dir_of(url):
    m = re.search(r"/(?:main|master)/([^/]+)/", url or "")
    return m.group(1) if m else None


def main():
    errors = []
    warnings = []

    # 1. registry -> disk
    registered = set()
    registry_versions = []  # (registry file, ext dir, version)
    for name in REGISTRIES:
        if not os.path.isfile(name):
            continue  # registries are optional; only the types in use need one
        try:
            doc = read_json(name)
        except ValueError as e:
            errors.append("{}: invalid JSON ({})".format(name, e))
            continue
        for entry in doc.get("data", []):
            d = ext_dir_of(entry.get("path"))
            if not d:
                errors.append("{}: unparsable path {}".format(name, entry.get("path")))
                continue
            registered.add(d)
            registry_versions.append((name, d, entry.get("version")))
            if not os.path.isdir(d):
                errors.append("{}: points at missing dir '{}'".format(name, d))

    # 2. disk -> registry, and per-extension checks
    ext_dirs = sorted(
        d for d in os.listdir(".")
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, "plugin.json"))
    )
    for ext in ext_dirs:
        has_zip = os.path.isfile(os.path.join(ext, "plugin.zip"))
        if has_zip and ext not in registered:
            warnings.append("{}: on disk but in no registry".format(ext))

        try:
            plugin = read_json(os.path.join(ext, "plugin.json"))
        except ValueError as e:
            errors.append("{}/plugin.json: invalid JSON ({})".format(ext, e))
            continue

        version = (plugin.get("metadata") or {}).get("version")
        if not isinstance(version, int):
            errors.append("{}/plugin.json: metadata.version is not an int ({!r})".format(ext, version))
        else:
            for reg, d, reg_version in registry_versions:
                if d == ext and reg_version != version:
                    errors.append("{}: lists {} as version {!r} but {}/plugin.json is {}".format(
                        reg, ext, reg_version, ext, version))
            if has_zip:
                try:
                    with zipfile.ZipFile(os.path.join(ext, "plugin.zip")) as z:
                        zip_version = json.loads(z.read("plugin.json").decode("utf-8")).get("metadata", {}).get("version")
                except (KeyError, ValueError, zipfile.BadZipFile) as e:
                    errors.append("{}/plugin.zip: cannot read plugin.json ({})".format(ext, e))
                else:
                    if zip_version != version:
                        errors.append("{}/plugin.zip is version {!r} but plugin.json is {}; rebuild it".format(
                            ext, zip_version, version))

        src = os.path.join(ext, "src")
        if not os.path.isdir(src):
            warnings.append("{}: no src/ (artifact-only)".format(ext))
            continue

        present = set(os.listdir(src))
        for key, filename in (plugin.get("script") or {}).items():
            if filename not in present:
                errors.append("{}/src: script '{}' -> {} missing".format(ext, key, filename))

    # 3. API contract copies
    a, b = API_FILES
    if os.path.isfile(a) and os.path.isfile(b):
        with open(a, "rb") as fa, open(b, "rb") as fb:
            if fa.read() != fb.read():
                errors.append("{} and {} differ".format(a, b))
    else:
        errors.append("missing {}".format(a if not os.path.isfile(a) else b))

    for w in warnings:
        print("WARN  " + w)
    for e in errors:
        print("ERROR " + e)
    print("checked {} extension dir(s), {} registry entries".format(len(ext_dirs), len(registered)))
    print("OK" if not errors else "{} error(s)".format(len(errors)))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
