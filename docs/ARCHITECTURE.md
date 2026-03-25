# System Architecture

The Insights application is organized as a monorepo containing client applications, server APIs, background workers, and shared packages. It coordinates severe storms research tools like NTP 360, NTP LiDAR, and NHP Hailgen.

## Monorepo Structure

- **Apps** (`/apps`):
  - `@insights/client`: A React SPA built with Vite, utilizing Three.js and Potree for 3D visualization.
  - `@insights/server`: A Node.js API server built with Hono.
  - `@insights/worker`: A BullMQ background worker handling general tasks (e.g., blurring, Google Maps processing, hailpad analysis, depth maps).
  - `@insights/worker-point-cloud`: A specialized background worker dedicated to resource-intensive LiDAR point cloud processing using `PotreeConverter`.
- **Packages** (`/packages`):
  - `@insights/shared`: Contains shared Drizzle ORM database schemas, standard queue definitions (BullMQ), utilities, and TypeScript types used across all apps.
  - `@insights/transactional`: Manages transactional emails using Resend.

## Architecture Diagram

```mermaid
graph TD
    classDef clientApp fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;
    classDef serverApp fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    classDef workerApp fill:#fff3e0,stroke:#ff9800,stroke-width:2px;
    classDef db fill:#fce4ec,stroke:#e91e63,stroke-width:2px;
    classDef package fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px;

    Client["fa:fa-desktop Client App (React/Vite)"]:::clientApp
    Server["fa:fa-server Server App (Hono)"]:::serverApp
    MainWorker["fa:fa-cogs Main Worker (BullMQ)"]:::workerApp
    PCWorker["fa:fa-cloud Point Cloud Worker"]:::workerApp

    Postgres[("fa:fa-database PostgreSQL")]:::db
    Redis[("fa:fa-redis Redis (BullMQ queues)")]:::db

    Shared["fa:fa-cubes @insights/shared (Schema/Types)"]:::package
    TxPkg["fa:fa-envelope @insights/transactional (Email)"]:::package

    Client <-->|REST / RPC API| Server
    Server -->|Read/Write Data| Postgres
    Server -->|Enqueue Jobs| Redis
    Server -->|Send Emails| TxPkg

    MainWorker <-->|Consume Jobs| Redis
    PCWorker <-->|Consume Jobs| Redis
    
    MainWorker <-->|Read/Write Data| Postgres
    PCWorker <-->|Read/Write Data| Postgres

    Shared --> Server
    Shared --> MainWorker
    Shared --> PCWorker
    Shared --> Client
```

## Tech Stack Overview
- **Frontend**: React, Vite, Three.js, React-Three-Fiber, Potree Core, TailwindCSS, Radix UI.
- **Backend**: Hono, Drizzle ORM, Better Auth, BullMQ, Zod.
- **Data Layers**: PostgreSQL (primary store), Redis (job queues and caching).
