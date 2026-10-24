import datetime
import json
import pathlib
import subprocess

names = (
    'app_postgres_data',
    'app_redis_data',
    'wingstravel-rollback-probe_postgres_data',
    'wingstravel-rollback-probe_redis_data',
)
results = []
for name in names:
    inventory = json.loads(subprocess.check_output(['docker', 'volume', 'inspect', name], text=True))
    assert len(inventory) == 1 and inventory[0]['Name'] == name
    record = inventory[0]
    assert record['Driver'] == 'local' and not record.get('Options')
    mountpoint = pathlib.Path(record['Mountpoint'])
    assert mountpoint == pathlib.Path('/var/lib/docker/volumes') / name / '_data'
    assert not mountpoint.is_symlink() and mountpoint.is_dir()
    assert not list(mountpoint.iterdir()), 'Volume contains data; preserve it'
    references = subprocess.check_output(['docker', 'ps', '--all', '--quiet', '--filter', 'volume=' + name], text=True).strip()
    assert not references, 'Volume acquired a container reference; preserve it'
    subprocess.run(['docker', 'volume', 'rm', name], check=True)
    remaining = subprocess.check_output(['docker', 'volume', 'ls', '--format', '{{.Name}}'], text=True).splitlines()
    assert name not in remaining
    results.append({'name': name, 'emptyBeforeDeletion': True, 'noContainerReferences': True, 'removed': True})
print(json.dumps({'timestampUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'volumes': results}, indent=2))
