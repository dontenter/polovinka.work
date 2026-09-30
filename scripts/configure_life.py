"""Configure local Life secrets without printing them or altering Lab credentials."""
import getpass
import hashlib
import json
import os
import re
import secrets
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    if not os.isatty(0):
        raise SystemExit('Запусти файл подключения в Terminal.')
    print('Supabase: Project URL — в Connect; Secret key — в Settings → API Keys.')
    url = input('Project URL (https://...supabase.co): ').strip().rstrip('/')
    if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co', url):
        raise SystemExit('Нужен HTTPS Project URL вида https://...supabase.co')
    key = getpass.getpass('Secret key sb_secret_... (ввод скрыт): ').strip()
    if not key.startswith('sb_secret_') or any(c.isspace() for c in key):
        raise SystemExit('Используй Secret key, а не Publishable key.')
    password = getpass.getpass('Новый отдельный пароль Life (не менее 12 символов): ')
    if len(password) < 12 or len(password) > 1024:
        raise SystemExit('Пароль должен содержать 12–1024 символа.')
    if password != getpass.getpass('Повтори пароль Life: '):
        raise SystemExit('Пароли не совпали.')
    salt = secrets.token_hex(16)
    settings = {
        'SUPABASE_URL': url, 'SUPABASE_SECRET_KEY': key,
        'LIFE_PASSWORD_SALT': salt,
        'LIFE_PASSWORD_HASH': hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex(),
        'LIFE_SECRET': secrets.token_hex(32), 'LIFE_INGEST_SECRET': secrets.token_hex(32),
    }
    env = ROOT / '.env.local'
    existing = env.read_text() if env.exists() else ''
    obsolete = set(settings) | {'LIFE_BLOB_READ_WRITE_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'}
    lines = [line for line in existing.splitlines() if line.split('=',1)[0].strip() not in obsolete]
    lines += [''] + [k + '=' + json.dumps(v) for k,v in settings.items()]
    os.umask(0o077)
    fd, temp = tempfile.mkstemp(dir=ROOT, prefix='.env.', suffix='.local')
    try:
        with os.fdopen(fd, 'w') as stream: stream.write('\n'.join(lines) + '\n')
        os.replace(temp, env)
    finally:
        if os.path.exists(temp): os.unlink(temp)
    print('Сохранено в .env.local. Пароль Lab не изменён. Сам пароль Life не хранится.')
    print('Напиши в Codex: Life настроен. На Vercel настройки ещё не отправлены.')

if __name__ == '__main__':
    try: main()
    except (EOFError, KeyboardInterrupt): print('\nОтменено.')
