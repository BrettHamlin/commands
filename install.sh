#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Ensure target directories exist
mkdir -p "$CLAUDE_DIR/commands"
mkdir -p "$CLAUDE_DIR/bin"

# Symlink commands
for f in "$REPO_DIR/commands/"*; do
  name="$(basename "$f")"
  target="$CLAUDE_DIR/commands/$name"
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    echo "WARNING: $target exists and is not a symlink, skipping (back it up first)"
    continue
  fi
  ln -s "$f" "$target"
  echo "Linked commands/$name"
done

# Symlink bin scripts
for f in "$REPO_DIR/bin/"*; do
  name="$(basename "$f")"
  target="$CLAUDE_DIR/bin/$name"
  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    echo "WARNING: $target exists and is not a symlink, skipping (back it up first)"
    continue
  fi
  ln -s "$f" "$target"
  echo "Linked bin/$name"
done

echo "Done. Commands installed to $CLAUDE_DIR"
