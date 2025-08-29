#!/usr/bin/env bash
# Creates HARD LINKS in DST for files in SRC with optional top-level dir mapping.
# Mapping TSV: "from<TAB>to" (top-level dir names). No directories are created.

set -euo pipefail

usage() { echo "Usage: $0 <MAP_TSV> <SRC_DIR> <DST_DIR>"; exit 2; }

# --- args ---
[[ $# -eq 3 ]] || usage
map_file="$1"
src="$(cd "$2" && pwd -P)"
dst="$(cd "$3" && pwd -P)"

[[ -f "$map_file" ]] || { echo "ERROR: mapping file not found: $map_file" >&2; exit 1; }
[[ -d "$src"      ]] || { echo "ERROR: not a directory: $src" >&2; exit 1; }
[[ -d "$dst"      ]] || { echo "ERROR: not a directory: $dst" >&2; exit 1; }
[[ "$src" != "$dst" ]] || { echo "ERROR: SRC and DST must differ" >&2; exit 1; }

# --- read mapping into parallel arrays (bash 3.x friendly) ---
map_from=()
map_to=()
while IFS=$'\t' read -r from to extra; do
  [ -z "${from:-}" ] && continue
  [ "${from:0:1}" = "#" ] && continue
  [ -z "${to:-}" ] && { echo "ERROR: malformed mapping (missing 'to') for '$from'"; exit 1; }
  from="${from#./}"; from="${from%/}"
  to="${to#./}";     to="${to%/}"
  map_from+=("$from")
  map_to+=("$to")
done < "$map_file"

# --- helpers ---
find_map_idx() {
  local key="$1" i=0
  while [ $i -lt ${#map_from[@]} ]; do
    [ "$key" = "${map_from[$i]}" ] && { echo "$i"; return; }
    i=$((i+1))
  done
  echo "-1"
}
parent_dir() { case "$1" in */*) echo "${1%/*}";; *) echo ".";; esac; }

# --- walk source and create hard links ---
cd "$src"
find . -type f -print0 | while IFS= read -r -d '' f; do
  rel="${f#./}"

  case "$rel" in
    */*) topdir="${rel%%/*}"; rest="${rel#*/}" ;;
    *)   topdir="";            rest="$rel"      ;;
  esac

  idx="$(find_map_idx "$topdir")"
  if [ "$idx" -ge 0 ]; then
    dest_rel="${map_to[$idx]}/$rest"
  else
    dest_rel="$rel"
  fi

  dest_path="$dst/$dest_rel"
  pdir="$(parent_dir "$dest_path")"

  # Require parent dir to exist
  [ -d "$pdir" ] || { echo "ERROR: destination directory missing: $pdir" >&2; exit 1; }

  # Do not overwrite
  if [ -e "$dest_path" ] || [ -L "$dest_path" ]; then
    echo "ERROR: target already exists: $dest_path" >&2
    exit 1
  fi

  # Create HARD link; capture error to detect cross-device issues
  if ! out=$(ln "$src/$rel" "$dest_path" 2>&1); then
    case "$out" in
      *"cross-device"*|*"EXDEV"*|*"Invalid cross-device link"*)
        echo "ERROR: hard link failed (different filesystems?): $src/$rel -> $dest_path" >&2
        ;;
      *)
        echo "ERROR: ln failed: $out" >&2
        ;;
    esac
    exit 1
  fi
done

echo "All hard links created."
