import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

import type { SortableColumns, SortDir } from '@/hooks/useSortableColumns';

/** Direction indicator shown next to a sortable column label. */
export function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <ChevronsUpDown size={13} className="opacity-50" aria-hidden />;
  }
  return dir === 'asc' ? (
    <ChevronUp size={13} aria-hidden />
  ) : (
    <ChevronDown size={13} aria-hidden />
  );
}

interface SortableThProps<K extends string> {
  /** Column this header sorts by. */
  columnKey: K;
  label: string;
  sort: SortableColumns<K>;
  /** Classes for the `<th>` element (table-specific styling). */
  className?: string;
}

/** A table header cell whose label is a button that sorts the table by `columnKey`. */
export function SortableTh<K extends string>({
  columnKey,
  label,
  sort,
  className,
}: SortableThProps<K>) {
  const active = sort.sortKey === columnKey;
  return (
    <th aria-sort={sort.getAriaSort(columnKey)} className={className}>
      <button
        type="button"
        onClick={() => sort.handleSort(columnKey)}
        className="flex cursor-pointer items-center gap-1 hover:opacity-80"
      >
        {label}
        <SortIcon active={active} dir={sort.sortDir} />
      </button>
    </th>
  );
}
