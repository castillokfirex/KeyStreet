import { Link } from "react-router";

export interface BreadcrumbCrumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        {items.map((item, idx) => (
          <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
            {idx > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to} className="hover:text-navy transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-navy">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
