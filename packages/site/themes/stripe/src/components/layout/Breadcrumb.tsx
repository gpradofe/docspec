import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-tertiary mb-6">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          )}
          {item.href ? (
            <a href={item.href} className="hover:text-text-secondary transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-text-primary font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
