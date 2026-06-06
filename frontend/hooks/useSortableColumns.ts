import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export type AriaSort = 'ascending' | 'descending' | 'none';

export interface UseSortableColumnsOptions<K extends string> {
  /** Column key selected on first render. */
  initialKey: K;
  /** Sort direction on first render. Defaults to 'desc'. */
  initialDir?: SortDir;
  /**
   * Keys that start descending the first time they are selected (e.g. score
   * columns, where "highest first" is the natural default). Defaults to the
   * initial key.
   */
  descFirstKeys?: readonly K[];
}

export interface SortableColumns<K extends string> {
  sortKey: K;
  sortDir: SortDir;
  /** Toggles direction when the active column is reselected, otherwise switches column. */
  handleSort: (key: K) => void;
  /** aria-sort value for a column header `<th>`. */
  getAriaSort: (key: K) => AriaSort;
}

/**
 * Shared sortable-table-header state: tracks the active column and direction,
 * and provides the click handler + aria-sort helper used by `SortableTh`.
 */
export function useSortableColumns<K extends string>({
  initialKey,
  initialDir = 'desc',
  descFirstKeys = [initialKey],
}: UseSortableColumnsOptions<K>): SortableColumns<K> {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  function handleSort(key: K) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(descFirstKeys.includes(key) ? 'desc' : 'asc');
    }
  }

  function getAriaSort(key: K): AriaSort {
    if (key !== sortKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  return { sortKey, sortDir, handleSort, getAriaSort };
}
