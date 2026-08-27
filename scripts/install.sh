#!/usr/bin/env bash
# @earendil-works/pi-coding-agent binary installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ranxianglei/@earendil-works/pi-coding-agent/master/scripts/install.sh | bash
#
# Downloads the latest @earendil-works/pi-coding-agent binary for the current OS/arch and installs it
# to ~/.local/bin/@earendil-works/pi-coding-agent. No Node.js required.
set -euo pipefail

REPO="ranxianglei/@earendil-works/pi-coding-agent"
INSTALL_DIR="${PI_STABLE_INSTALL_DIR:-$HOME/.local/bin}"
BINARY_NAME="@earendil-works/pi-coding-agent"

# --- detect latest tag ---
echo "==> Fetching latest @earendil-works/pi-coding-agent release..."
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  TAG="$(gh release view --repo "${REPO}" --json tagName --jq .tagName 2>/dev/null || true)"
fi
if [[ -z "${TAG:-}" ]]; then
  TAG="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep -m1 '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')"
fi
if [[ -z "${TAG:-}" ]]; then
  echo "::error::Could not determine latest @earendil-works/pi-coding-agent release tag." >&2
  exit 1
fi
echo "==> Latest release: ${TAG}"

# --- detect platform ---
OS="$(uname -s)"
ARCH="$(uname -m)"
case "${OS}/${ARCH}" in
  Darwin/arm64)   PLATFORM="darwin-arm64" ;;
  Darwin/x86_64)  PLATFORM="darwin-x64" ;;
  Linux/x86_64)   PLATFORM="linux-x64" ;;
  Linux/aarch64|Linux/arm64) PLATFORM="linux-arm64" ;;
  MINGW*|MSYS*|CYGWIN*/x86_64) PLATFORM="windows-x64"; BINARY_NAME="@earendil-works/pi-coding-agent.exe"; INSTALL_DIR="${PI_STABLE_INSTALL_DIR:-$USERPROFILE/.local/bin}" ;;
  *) echo "::error::Unsupported platform: ${OS}/${ARCH}" >&2; exit 1 ;;
esac
echo "==> Platform: ${PLATFORM}"

# --- determine archive extension ---
case "${PLATFORM}" in
  windows-*) EXT="zip" ;;
  *)         EXT="tar.gz" ;;
esac
ASSET="@earendil-works/pi-coding-agent-${PLATFORM}.${EXT}"
URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
echo "==> Downloading ${ASSET}..."

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
curl -fsSL -o "${TMP}/${ASSET}" "${URL}"

# --- verify checksum if available ---
SHA_URL="https://github.com/${REPO}/releases/download/${TAG}/SHA256SUMS"
if curl -fsSL -o "${TMP}/SHA256SUMS" "${SHA_URL}" 2>/dev/null; then
  echo "==> Verifying checksum..."
  (cd "${TMP}" && grep "${ASSET}" SHA256SUMS | sha256sum -c -)
else
  echo "==> (checksum file not available, skipping)"
fi

# --- extract ---
echo "==> Extracting..."
case "${EXT}" in
  zip) unzip -o -q "${TMP}/${ASSET}" -d "${TMP}/out" ;;
  tar.gz) mkdir -p "${TMP}/out" && tar -xzf "${TMP}/${ASSET}" -C "${TMP}/out" ;;
esac

# --- locate binary (may be in a wrapper dir) ---
BIN_FOUND="$(find "${TMP}/out" -type f -name "${BINARY_NAME}" -perm -u+x | head -1)"
if [[ -z "${BIN_FOUND}" ]]; then
  # On Windows/unix the binary may be at out/@earendil-works/pi-coding-agent or out/<platform>/@earendil-works/pi-coding-agent
  BIN_FOUND="$(find "${TMP}/out" -type f -name "${BINARY_NAME}" | head -1)"
fi
if [[ -z "${BIN_FOUND}" ]]; then
  echo "::error::${BINARY_NAME} not found in archive" >&2
  exit 1
fi

# --- install ---
mkdir -p "${INSTALL_DIR}"
cp "${BIN_FOUND}" "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null || true
echo "==> Installed ${BINARY_NAME} to ${INSTALL_DIR}"

# --- PATH check ---
case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    echo ""
    echo "::warning:${INSTALL_DIR} is not in your PATH." >&2
    echo "  Add this to your shell profile (~/.bashrc, ~/.zshrc):" >&2
    echo "    export PATH=\"${INSTALL_DIR}:\$PATH\"" >&2
    ;;
esac

echo ""
echo "==> Done. Run '${BINARY_NAME}' to start."
echo "==> Config dir: ~/.pi/ (reused from pi; zero migration)"
