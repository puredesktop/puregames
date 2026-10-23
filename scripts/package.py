"""Package compiled assets only, using the shell's runtime package format."""
from pathlib import Path
import io, json, zipfile
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'plugin.json').read_text())
assert manifest['entrypoint']['kind'] == 'built-static'
assert (root / 'dist/index.html').is_file(), 'Run npm run build first'
payload = io.BytesIO()
with zipfile.ZipFile(payload, 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.write(root / 'plugin.json', 'plugin.json')
    for file in (root / 'dist').rglob('*'):
        if file.is_file(): archive.write(file, str(file.relative_to(root)))
target = root.parent / 'PureGames-runtime.pureapp'
target.write_bytes(b'PUREDESKTOP_APP_RUNTIME_V1\n' + payload.getvalue())
print(target)
