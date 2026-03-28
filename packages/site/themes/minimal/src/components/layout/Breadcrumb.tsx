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
          {i > 0 && <span className="text-text-tertiary">/</span>}
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
