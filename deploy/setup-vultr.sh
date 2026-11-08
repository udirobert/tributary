#!/usr/bin/env bash
# Provision Tributary on a fresh Vultr Cloud Compute VM (Ubuntu/Debian).
#
#   curl -fsSL <this script> | bash           # or: bash setup-vultr.sh <repo-url>
#
# Installs Docker + Node 22, clones the repo, pulls the sandbox image, and
# starts the control plane under systemd on :8787. Point DNS at the VM (or
# front it with Caddy/nginx) for the public demo URL.
set -euo pipefail

REPO_URL="${1:-https://github.com/udirobert/tributary.git}"
APP_DIR=/opt/tributary

# --- Docker (the sandbox runtime) -------------------------------------------
if ! command -v docker >/dev/null; then
	curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker pull node:22-alpine # image the sandbox gate spawns per merge

# --- Node 22 (the control plane) --------------------------------------------
if ! command -v node >/dev/null; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
	apt-get install -y nodejs
fi

# --- App ---------------------------------------------------------------------
git clone "$REPO_URL" "$APP_DIR" 2>/dev/null || git -C "$APP_DIR" pull
cd "$APP_DIR"
npm ci --ignore-scripts

# Vultr Serverless Inference key for the resolver — write it to
# /etc/tributary.env before starting (optional; resolver degrades without it).
if [ ! -f /etc/tributary.env ]; then
	cat >/etc/tributary.env <<'EOF'
# VULTR_INFERENCE_API_KEY=...
# VULTR_INFERENCE_MODEL=vultr/glm-5.3-flash
PORT=8787
TRIBUTARY_SANDBOX=docker
TRIBUTARY_DB=/var/lib/tributary/state.db
EOF
	mkdir -p /var/lib/tributary
fi

cat >/etc/systemd/system/tributary.service <<EOF
[Unit]
Description=Tributary control plane (node/vultr mode)
After=docker.service
Requires=docker.service

[Service]
EnvironmentFile=/etc/tributary.env
WorkingDirectory=$APP_DIR
ExecStart=$(command -v npx) tsx server/index.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now tributary
systemctl --no-pager status tributary || true
echo
echo "Tributary is on http://$(hostname -I | awk '{print $1}'):8787 — dashboard at /"
