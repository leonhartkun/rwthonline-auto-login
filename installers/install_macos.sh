#!/bin/sh
set -eu

extension_id=${1:?Usage: install_macos.sh CHROME_EXTENSION_ID}
release_url="https://github.com/leonhartkun/rwthonline-auto-login/releases/latest/download/rwthonline_native_host_macos"
install_dir="$HOME/Library/Application Support/RWTHonlineAutoLogin"
manifest_dir="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

mkdir -p "$install_dir" "$manifest_dir"
curl -fsSL "$release_url" -o "$install_dir/rwthonline_native_host"
chmod 700 "$install_dir/rwthonline_native_host"
cat > "$manifest_dir/com.rwthonline.auto_login.json" <<EOF
{"name":"com.rwthonline.auto_login","description":"RWTHonline Auto Login credential helper","path":"$install_dir/rwthonline_native_host","type":"stdio","allowed_origins":["chrome-extension://$extension_id/"]}
EOF
printf '%s\n' 'RWTHonline helper installed. Return to the extension settings page.'
