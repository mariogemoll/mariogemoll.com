// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD


export function pick<K, V>(map: Map<K, V>, keys: K[]): Map<K, V> {
  const result = new Map<K, V>();
  for (const k of keys) {
    if (map.has(k)) {
      const value = map.get(k);
      if (value !== undefined) {
        result.set(k, value);
      }
    }
  }
  return result;
}

export function omit<K, V>(map: Map<K, V>, keys: K[]): Map<K, V> {
  const result = new Map<K, V>();
  for (const [k, v] of map.entries()) {
    if (!keys.includes(k)) {
      result.set(k, v);
    }
  }
  return result;
}
