#!/usr/bin/env bash
# Creates HARD LINKS from hash-named files to their original paths based on TSV manifest.
# TSV format: "path<TAB>size<TAB>hash<TAB>description"
# Optional directory mapping can remap top-level directories in paths.

set -euo pipefail

usage() { echo "Usage: $0 <TSV_FILE> <SRC_DIR> <DST_DIR> [MAP_TSV]"; exit 2; }

# --- args ---
[[ $# -ge 3 ]] || usage
tsv_file="$1"
src="$(cd "$2" && pwd -P)"
dst="$(cd "$3" && pwd -P)"
map_file="${4:-}"

[[ -f "$tsv_file" ]] || { echo "ERROR: TSV file not found: $tsv_file" >&2; exit 1; }
[[ -d "$src"      ]] || { echo "ERROR: not a directory: $src" >&2; exit 1; }
[[ -d "$dst"      ]] || { echo "ERROR: not a directory: $dst" >&2; exit 1; }
[[ "$src" != "$dst" ]] || { echo "ERROR: SRC and DST must differ" >&2; exit 1; }

# --- read mapping into parallel arrays (bash 3.x friendly) ---
map_from=()
map_to=()
if [[ -n "$map_file" && -f "$map_file" ]]; then
  while IFS=$'\t' read -r from to extra; do
    [ -z "${from:-}" ] && continue
    [ "${from:0:1}" = "#" ] && continue
    [ -z "${to:-}" ] && { echo "ERROR: malformed mapping (missing 'to') for '$from'" >&2; exit 1; }
    from="${from#./}"; from="${from%/}"
    to="${to#./}";     to="${to%/}"
    map_from+=("$from")
    map_to+=("$to")
  done < "$map_file"
fi

# --- helpers ---
find_map_idx() {
  local key="$1" i=0
  while [ $i -lt ${#map_from[@]} ]; do
    [ "$key" = "${map_from[$i]}" ] && { echo "$i"; return; }
    i=$((i+1))
  done
  echo "-1"
}

apply_mapping() {
  local path="$1"
  case "$path" in
    */*) local topdir="${path%%/*}"; local rest="${path#*/}" ;;
    *)   local topdir=""; local rest="$path" ;;
  esac

  local idx="$(find_map_idx "$topdir")"
  if [ "$idx" -ge 0 ]; then
    echo "${map_to[$idx]}/$rest"
  else
    echo "$path"
  fi
}

# --- read TSV and create hard links ---
while IFS=$'\t' read -r path size hash description; do
  [ -z "${path:-}" ] && continue
  [ "${path:0:1}" = "#" ] && continue
  [ -z "${hash:-}" ] && { echo "ERROR: malformed TSV entry for '$path'" >&2; exit 1; }

  # Apply directory mapping if configured
  if [ ${#map_from[@]} -gt 0 ]; then
    mapped_path="$(apply_mapping "$path")"
  else
    mapped_path="$path"
  fi

  src_file="$src/$hash"
  dest_file="$dst/$mapped_path"
  dest_dir="$(dirname "$dest_file")"

  # Check source file exists
  if [ ! -f "$src_file" ]; then
    echo "ERROR: source file not found: $src_file (for $path)" >&2
    exit 1
  fi

  # Create destination directory if needed
  if [ ! -d "$dest_dir" ]; then
    mkdir -p "$dest_dir" || { echo "ERROR: failed to create directory: $dest_dir" >&2; exit 1; }
  fi

  # Do not overwrite
  if [ -e "$dest_file" ] || [ -L "$dest_file" ]; then
    echo "ERROR: target already exists: $dest_file" >&2
    exit 1
  fi

  # Create HARD link
  if ! out=$(ln "$src_file" "$dest_file" 2>&1); then
    case "$out" in
      *"cross-device"*|*"EXDEV"*|*"Invalid cross-device link"*)
        echo "ERROR: hard link failed (different filesystems?): $src_file -> $dest_file" >&2
        ;;
      *)
        echo "ERROR: ln failed: $out" >&2
        ;;
    esac
    exit 1
  fi

  echo "Linked: $hash -> $mapped_path"
done < "$tsv_file"

echo "All hard links created."
