import { Link } from "react-router";

export interface BreadcrumbCrumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 font-display text-[10px] uppercase tracking-label text-muted">
        {items.map((item, idx) => (
          <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-2">
            {idx > 0 && <span aria-hidden="true" className="text-gray">/</span>}
            {item.to ? (
              <Link to={item.to} className="hover:text-ink transition-colors">
                {item.label}
              </Link>
            ) : (
              <span aria-current={idx === items.length - 1 ? "page" : undefined} className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
