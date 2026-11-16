"""Read-only publication guard: all reachable Git blobs plus current source files.

Reports locations/categories only, never secret values. This is a pattern and
private-file policy check, not a claim that arbitrary secrets are detectable.
"""
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
def git(*args):
    return subprocess.check_output(['git', '-C', str(root), *args])

patterns = {
    'GitHub token': rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})',
    'AWS access key': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'Google API key': rb'\bAIza[A-Za-z0-9_-]{35}\b',
    'private key': rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    'credential URL': rb'https?://[^\s/:@]+:[^\s/@]+@',
}
compiled = {label: re.compile(pattern) for label, pattern in patterns.items()}
findings = []

def inspect(path, data, source):
    name = PurePosixPath(path).name.lower()
    prohibited = (name.startswith('.env') and name != '.env.example') or name in ('id_rsa', 'id_ed25519')
    prohibited |= path.lower().endswith(('.csv', '.csv.gz', '.parquet', '.p12', '.pfx', '.pem', '.key', '.zip'))
    prohibited |= '/approved-snapshot/' in '/' + path.lower() or path.lower().startswith('runs/')
    if prohibited:
        findings.append({'source': source, 'path': path, 'category': 'private-file policy'})
    if b'\x00' not in data[:8192]:
        for label, pattern in compiled.items():
            if pattern.search(data):
                findings.append({'source': source, 'path': path, 'category': label})

objects = git('rev-list', '--objects', '--all').decode().splitlines()
checked = 0
# One cat-file process avoids spawning a Git process per historical object.
reader = subprocess.Popen(['git', '-C', str(root), 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
try:
    for entry in objects:
        parts = entry.split(' ', 1)
        if len(parts) != 2:
            continue
        oid, path = parts
        reader.stdin.write((oid + '\n').encode()); reader.stdin.flush()
        header = reader.stdout.readline().split()
        if len(header) != 3:
            raise RuntimeError('Could not inspect a reachable Git object')
        size = int(header[2]); data = reader.stdout.read(size)
        assert len(data) == size and reader.stdout.read(1) == b'\n'
        if header[1] == b'blob':
            inspect(path, data, 'reachable history')
            checked += 1
finally:
    reader.stdin.close(); reader.stdout.close(); reader.wait()
inspect('staged-diff', git('diff', '--cached', '--binary'), 'index diff')
current = set(git('ls-files', '-z').decode().split('\x00') + git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\x00'))
for path in sorted(current - {''}):
    file = root / path
    if file.is_file():
        inspect(path, file.read_bytes(), 'working tree')
print(json.dumps({'history_blobs_checked': checked, 'working_paths_checked': len(current - {''}), 'findings': findings}, indent=2))
sys.exit(1 if findings else 0)
