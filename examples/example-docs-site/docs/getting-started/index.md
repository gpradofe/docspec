---
title: Getting Started
order: 1
---

# Getting Started with DocSpec Examples

This documentation site showcases two example projects built with DocSpec:

## Waypoint Engine

An AI-powered curriculum generation engine that demonstrates:

- **Flows**: Multi-step AI curriculum generation pipeline
- **Data Models**: CurriculumEntity, LearningObjective with JPA mappings
- **Events**: Curriculum generation lifecycle events
- **Error Handling**: Structured error catalog with retry policies
- **Operations**: Scheduled jobs and manual triggers

## Spring Boot Bookstore

A zero-configuration Spring Boot REST API that demonstrates:

- **Auto-detection**: REST endpoints automatically discovered
- **Data Models**: Author/Book entities with bidirectional relationships
- **Contexts**: Application runtime context with configuration

## Running Locally

```bash
# From the repository root
cd examples/example-docs-site
npx docspec dev
```

The dev server will start at `http://localhost:3000`.
