import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** Internal link target; omit for the current (last) page. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** Consistent admin navigation trail. The last item is the current page. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Ścieżka nawigacji">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-[var(--text-muted)] transition-colors hover:text-[var(--primary-blue)] hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast
                      ? 'font-semibold text-[var(--text-dark)]'
                      : 'text-[var(--text-muted)]'
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight
                  size={14}
                  className="text-[var(--text-muted)]"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
