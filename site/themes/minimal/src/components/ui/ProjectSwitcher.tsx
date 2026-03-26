"use client";

import React, { useState } from "react";

interface ProjectOption { label: string; slug: string; color?: string; }
interface ProjectSwitcherProps { projects: ProjectOption[]; current?: string; }

export function ProjectSwitcher({ projects, current }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  if (projects.length <= 1) return null;
  const activeProject = projects.find((p) => p.slug === current) || projects[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-secondary text-sm text-text-secondary">
        {activeProject.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
          {projects.map((project) => (
            <a key={project.slug} href={`/${project.slug}`} onClick={() => setOpen(false)}
              className={`block px-3 py-2 text-sm hover:bg-surface-secondary ${project.slug === current ? "text-primary-500 font-medium" : "text-text-secondary"}`}>
              {project.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
