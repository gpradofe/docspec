import React from "react";

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-surface-tertiary text-text-secondary",
  primary: "bg-primary-50 text-primary-500",
  success: "bg-emerald-950 text-emerald-400",
  warning: "bg-amber-950 text-amber-400",
  error: "bg-red-950 text-red-400",
  info: "bg-blue-950 text-blue-400",
};

const HTTP_METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-950 text-emerald-400 border-emerald-800",
  POST: "bg-blue-950 text-blue-400 border-blue-800",
  PUT: "bg-amber-950 text-amber-400 border-amber-800",
  DELETE: "bg-red-950 text-red-400 border-red-800",
  PATCH: "bg-purple-950 text-purple-400 border-purple-800",
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
