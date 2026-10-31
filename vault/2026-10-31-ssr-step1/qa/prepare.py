# Run from the repository root after npm ci and npm run build:amethyst:ssr.
from pathlib import Path
import subprocess

base = '53c43d0bc2f8033066bb56aad2ecdbd1c91bf90f'
out = Path('.tmp-qa')
out.mkdir(exist_ok=True)
qa = Path('vault/2026-10-31-ssr-step1/qa')
for source, target in [
    ('generate.ts.txt', 'generate.ts'), ('server.cjs.txt', 'server.cjs'),
    ('capture-shifts.cjs.txt', 'stress.cjs'), ('measure-trade.cjs.txt', 'speed.cjs'),
    ('motion.cjs.txt', 'motion.cjs'), ('decorations.cjs.txt', 'decorations.cjs'),
    ('network-guard.cjs.txt', 'network-guard.cjs'),
]:
    (out / target).write_text((qa / source).read_text())

def git_file(name):
    return subprocess.check_output(['git', 'show', f'{base}:lib/amethyst/{name}']).decode()

source = git_file('page-first-paint.ts').replace("'./", "'../lib/amethyst/")
source = source.replace("'../lib/amethyst/lib/amethyst/generated/homepage-server.cjs'", "'./lib/amethyst/generated/homepage-server.cjs'")
for original, replacement in [
    ('hero-motion-config', 'before-hero-motion-config'),
    ('utility-page-fonts', 'before-utility-page-fonts'),
    ('generated/homepage-styles.json', 'before-styles.json'),
    ('generated/page-runtimes.json', 'before-runtimes.json'),
]:
    source = source.replace(f"'../lib/amethyst/{original}'", f"'./{replacement}'")
(out / 'before-first-paint.ts').write_text(source)
(out / 'before-hero-motion-config.ts').write_text(git_file('hero-motion-config.ts').replace("'./appearance-presets'", "'../lib/amethyst/appearance-presets'"))
(out / 'before-utility-page-fonts.ts').write_text(git_file('utility-page-fonts.ts').replace("'./generated/", "'../lib/amethyst/generated/"))
(out / 'before-styles.json').write_text(git_file('generated/homepage-styles.json'))
(out / 'before-runtimes.json').write_text(git_file('generated/page-runtimes.json'))
print('Prepared isolated synthetic fixture harness; baseline pinned to', base)
