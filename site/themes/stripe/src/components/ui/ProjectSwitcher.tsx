"use client";

import React, { useState } from "react";

interface ProjectOption {
  label: string;
  slug: string;
  color?: string;
}

interface ProjectSwitcherProps {
  projects: ProjectOption[];
  current?: string;
}

export function ProjectSwitcher({ projects, current }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);

  if (projects.length <= 1) return null;

  const activeProject = projects.find((p) => p.slug === current) || projects[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-tertiary text-sm text-text-secondary"
      >
        {activeProject.color && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeProject.color }}
          />
        )}
        {activeProject.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
          {projects.map((project) => (
            <a
              key={project.slug}
              href={`/${project.slug}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-tertiary ${
                project.slug === current ? "text-primary-600 font-medium" : "text-text-secondary"
              }`}
            >
              {project.color && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              {project.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
