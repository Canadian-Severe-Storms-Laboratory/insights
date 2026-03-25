# Data Flow

This document illustrates how data moves through the Insights application, particularly focusing on background processing tasks which form the core of the severe storm analysis features.

## General Job Processing Flow

Below is the standard sequence for how the system handles heavy processing operations (e.g., point cloud processing, image blurring, or hailpad analysis):

```mermaid
sequenceDiagram
    actor User
    participant Client as Client<br/>(React)
    participant Server as Server<br/>(Hono API)
    participant Postgres as PostgreSQL<br/>(Drizzle)
    participant Redis as Redis<br/>(BullMQ)
    participant Worker as Background Worker<br/>(Main / Point Cloud)

    User->>Client: Uploads survey data / initiates action
    Client->>Server: API Request (e.g., POST data/files)
    
    rect rgb(232, 245, 233)
    Server->>Postgres: 1. Create initial database record (Status: Pending)
    Server->>Redis: 2. Enqueue Background Task (e.g. point-cloud-queue)
    end
    
    Server-->>Client: 3. Return Job ID / Pending Status
    Client-->>User: Show loading state / upload successful
    
    rect rgb(255, 243, 224)
    Worker->>Redis: 4. Dequeue pending task
    Worker->>Worker: 5. Perform heavy processing<br/>(e.g. PotreeConverter, AI hailpad analysis)
    Worker->>Postgres: 6. Update database record with results (Status: Completed)
    end

    loop Client Polling / Refresh
        Client->>Server: Check status of Job ID or refresh data
        Server->>Postgres: Query latest state
        Postgres-->>Server: Return updated record
        Server-->>Client: Return completed status and results
        Client-->>User: Display processed 3D model / Hailpad dents
    end
```

## Queue Specializations

The `Server` delegates workloads into specific Redis queues managed by the `@insights/shared` package. These queues dictate which worker nodes pick up the data:

1. **`point-cloud-queue`**: Exclusively consumed by `@insights/worker-point-cloud`. Used to parse raw LiDAR `.las`/`.laz` files into OGC 3D Tiles / Potree formats.
2. **`hailpad-analysis-queue`**: Consumed by `@insights/worker`. Uses AI/CV tools to classify dents on uploaded hailpad models.
3. **`blur-queue`**: Consumed by `@insights/worker`. Handles privacy blurring algorithm execution for 360-degree street-view panoramas.
4. **`depth-map-queue`** & **`google-queue`**: Additional processing queues within the main worker instance.
