import React from "react";

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-surface-tertiary text-text-secondary",
  primary: "bg-primary-50 text-primary-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

const HTTP_METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  PATCH: "bg-purple-50 text-purple-700 border-purple-200",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_STYLES;
  httpMethod?: string;
  className?: string;
}

export function Badge({ children, variant = "default", httpMethod, className = "" }: BadgeProps) {
  const style = httpMethod
    ? HTTP_METHOD_STYLES[httpMethod] || VARIANT_STYLES.default
    : VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style} ${className}`}
    >
      {children}
    </span>
  );
}
