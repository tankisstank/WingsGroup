import datetime
import json
import pathlib
import shutil
import subprocess


def command(*arguments):
    return subprocess.check_output(arguments, text=True).strip()


root = pathlib.Path('/home/ubuntu/wings-travel')
cache = pathlib.Path('/root/.cache/pip')
assert cache.is_dir() and not cache.is_symlink()
assert cache.resolve() == pathlib.Path('/root/.cache/pip')
for process in pathlib.Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        arguments = (process / 'cmdline').read_bytes().split(b'\0')
    except (OSError, ProcessLookupError):
        continue
    executable = pathlib.Path(arguments[0].decode(errors='replace')).name if arguments else ''
    tokens = [argument.decode(errors='replace') for argument in arguments]
    if executable == 'docker' and any(token in ('build', 'buildx', 'builder') for token in tokens[1:]):
        raise RuntimeError('Docker build/management process active; defer cleanup')
    if executable.startswith(('pip', 'python')) and 'install' in tokens:
        raise RuntimeError('Python package installation active; defer cleanup')

containers_before = command('docker', 'ps', '-q', '--no-trunc')
images_before = command('docker', 'image', 'ls', '-q', '--no-trunc')
current_before = str((root / 'current').resolve(strict=True))
free_before = shutil.disk_usage('/').free
pip_bytes = command('du', '-s', '-B1', str(cache)).split()[0]
print(json.dumps({'startedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'freeBytesBefore': free_before, 'pipDiskBytesBefore': int(pip_bytes)}, indent=2), flush=True)
subprocess.run(['docker', 'builder', 'prune', '--all', '--force'], check=True)
shutil.rmtree(cache)
assert command('docker', 'ps', '-q', '--no-trunc') == containers_before
assert command('docker', 'image', 'ls', '-q', '--no-trunc') == images_before
assert str((root / 'current').resolve(strict=True)) == current_before
free_after = shutil.disk_usage('/').free
print(json.dumps({'finishedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'freeBytesAfter': free_after, 'freeBytesDelta': free_after - free_before, 'runningContainersUnchanged': True, 'imageReferencesUnchanged': True, 'currentUnchanged': True, 'pipCacheRemoved': not cache.exists()}, indent=2), flush=True)
