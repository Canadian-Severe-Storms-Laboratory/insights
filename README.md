# insights

Monorepo for Insights application comprising client, server, worker, and shared packages.

## Packages

- `@insights/client`: Client-side implementation for the Insights application.
- `@insights/server`: Server-side implementation for the Insights application.
- `@insights/worker`: Background worker application for the Insights platform.
- `@insights/shared`: Shared utilities, connections, and types for Insight applications.

## Getting Started

To get started with the Insights monorepo, follow these steps:

1. `bun install`
2. Setup .env files for each package as needed.
3. Start required services (e.g., databases, message brokers). A `docker-compose.yml` file was provided for convenience.
4. `bun run dev` to start all packages in development mode.
5. Access the client application at `http://localhost:5173`. This is the default port for Vite.
6. `bun run build` to build all packages for production.

## Development

### Running the applications

- Use `bun dev` to start all applications in development mode. (top level)
- `bun dev` can be used in each package directory to start individual applications.
- When in development mode, the `.env` & `.env.local` file is loaded from the root of the monorepo.

## FAQ

### How do I add a new package?

1. Create a new directory under the `apps` or `packages` folder.
2. Initialize a new Bun project using `bun init`.
3. Add the new package to the monorepo by updating the `bun.lock` file.
4. Update the root `package.json` scripts if necessary.
5. Install dependencies using `bun install`.

### Why is the point cloud worker separate from the main worker?

The point cloud worker can be resource-intensive and requires PotreeConverter to be installed on the system. Separating it allows for better resource management and scalability.

### How do I update the database schema?

The schema is located in the `@insights/shared` package under `src/db/schema/*`. Update the schema files as needed and ensure to run any necessary migrations on the database.

For more detailed database documentation, refer to the [drizzle-orm documentation](https://orm.drizzle.team/).
