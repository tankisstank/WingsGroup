import datetime
import json
import os
import pathlib
import subprocess

root = pathlib.Path('/home/ubuntu/wings-travel')
releases = (root / 'releases').resolve(strict=True)
current = (root / 'current').resolve(strict=True)
assert current == releases / 'release-rainbow-643a40d', 'Active release changed; re-audit'
target = pathlib.Path((current / 'PREVIOUS_RELEASE').read_text().strip()).resolve(strict=True)
assert target.parent == releases and target != current
assert (target / 'docker-compose.production.yml').is_file()
previous_image = (current / 'PREVIOUS_IMAGE_ID').read_text().strip()
assert previous_image == 'sha256:6ff0106b45f4eba6a5019e502891903a7103105ca893a65602bbabac5e1a8f27'
ops_image = (target / 'OPS_IMAGE_ID').read_text().strip()
for image in (previous_image, ops_image):
    assert image.startswith('sha256:')
    inspected = subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{.Id}}', image], text=True).strip()
    assert inspected == image

previous = root / 'previous'
assert previous.is_symlink(), 'Do not replace a real directory or unexpected object'
old_target = os.readlink(previous)
temporary = root / ('previous.repair-20261024-' + str(os.getpid()))
try:
    temporary.symlink_to(target, target_is_directory=True)
    assert (root / 'current').resolve(strict=True) == current
    os.replace(temporary, previous)
finally:
    if temporary.is_symlink():
        temporary.unlink()

assert previous.resolve(strict=True) == target
assert (root / 'current').resolve(strict=True) == current
print(json.dumps({'timestampUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'oldTarget': old_target, 'newTarget': str(target), 'current': str(current), 'rollbackAppImage': previous_image, 'rollbackOpsImage': ops_image, 'atomicReplacement': True}, indent=2))
