#!/bin/sh
set -eu

extension_id=${1:?Usage: install_macos.sh CHROME_EXTENSION_ID}
case "$(uname -m)" in
  arm64) helper_asset="rwthonline_native_host_macos_arm64.zip" ;;
  x86_64) helper_asset="rwthonline_native_host_macos_x86_64.zip" ;;
  *) printf '%s\n' "Unsupported Mac processor: $(uname -m)" >&2; exit 1 ;;
esac
release_url="https://github.com/leonhartkun/rwthonline-auto-login/releases/latest/download/$helper_asset"
install_dir="$HOME/Library/Application Support/RWTHonlineAutoLogin"
manifest_dir="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

mkdir -p "$install_dir" "$manifest_dir"
archive_path="$install_dir/rwthonline_native_host.zip"
rm -rf "$install_dir/rwthonline_native_host"
curl -fsSL "$release_url" -o "$archive_path"
ditto -x -k "$archive_path" "$install_dir"
rm -f "$archive_path"
helper_path="$install_dir/rwthonline_native_host/rwthonline_native_host"
chmod 700 "$helper_path"
cat > "$manifest_dir/com.rwthonline.auto_login.json" <<EOF
{"name":"com.rwthonline.auto_login","description":"RWTHonline Auto Login credential helper","path":"$helper_path","type":"stdio","allowed_origins":["chrome-extension://$extension_id/"]}
EOF
printf '%s\n' 'RWTHonline helper installed. Return to the extension settings page.'
