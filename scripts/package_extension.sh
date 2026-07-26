#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
extension_dir="$project_root/extension"
output_dir="$project_root/dist"
archive="$output_dir/rwthonline_auto_login.zip"

mkdir -p "$output_dir"
(
  cd "$extension_dir"
  zip -r -FS "$archive" . \
    -x 'tests/*' \
    -x '*.pem' \
    -x '*.log' \
    -x '*.map'
)

unzip -l "$archive"
