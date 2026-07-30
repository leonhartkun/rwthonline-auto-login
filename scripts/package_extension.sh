#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
extension_dir="$project_root/extension"
output_dir="$project_root/dist"
archive="$output_dir/rwthonline_auto_login.zip"
reload_dir="$project_root/autologin"

mkdir -p "$output_dir"
mkdir -p "$reload_dir"
rsync -a --delete \
  --exclude 'tests/' \
  --exclude '*.pem' \
  --exclude '*.log' \
  --exclude '*.map' \
  "$extension_dir/" "$reload_dir/"
(
  cd "$extension_dir"
  zip -r -FS "$archive" . \
    -x 'tests/*' \
    -x '*.pem' \
    -x '*.log' \
    -x '*.map'
)

unzip -l "$archive"
