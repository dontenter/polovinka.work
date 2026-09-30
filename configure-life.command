#!/bin/zsh
cd "${0:A:h}" || exit 1
python3 scripts/configure_life.py
printf '\nНажми Enter, чтобы закрыть окно.'
read
