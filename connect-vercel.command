#!/bin/zsh
set -e
cd "${0:A:h}"
# Keep the local Life settings if the CLI offers to pull project environment variables.
backup_file=""
if [[ -f .env.local ]]; then
  backup_file=$(mktemp)
  chmod 600 "$backup_file"
  cp .env.local "$backup_file"
fi
cleanup() {
  if [[ -n "$backup_file" && -f "$backup_file" ]]; then
    cp "$backup_file" .env.local
    chmod 600 .env.local
    rm "$backup_file"
  fi
}
trap cleanup EXIT
print 'Войди в Vercel через браузер.'
npx --yes vercel@latest login
print 'Выбери аккаунт/команду, затем существующий проект сайта polovinka.work.'
print 'Link to existing project? — Yes. Новый проект создавать не нужно.'
npx --yes vercel@latest link
print '\nПодключение завершено. Публикация не запускалась.'
print 'Вернись в Codex и напиши: Vercel подключён.'
read '?Нажми Enter, чтобы закрыть окно.'
