---
status: proposed
date: 2025-12-22
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Use of Redis for Digital Twin State Management

## Context and Problem Statement

The "State Manager" component needs to maintain the current state of thousands of entities (vehicles, sensors, buildings) and serve this state to the Dashboard and Analyzer with millisecond latency. The state is highly volatile, with vehicles updating positions every second. Using a traditional relational database (RDBMS) for this high-write/high-read workload would create a bottleneck and introduce latency. We need a storage solution that can handle this "Speed Layer" workload effectively.

## Decision Drivers

*   **Performance** – Ultra-low latency for reads and writes is critical for real-time sync.
*   **Data Structure Support** – Ability to store complex objects (JSON) or geospatial data natively.
*   **Volatility Management** – Ability to automatically expire stale data (e.g., if a sensor stops reporting).
*   **Scalability** – Ability to handle high throughput of concurrent updates.
*   **Persistence** – While speed is primary, some level of persistence is needed to recover state after a crash.

## Considered Options

*   **Option 1**: Redis (In-memory Key-Value Store)
*   **Option 2**: PostgreSQL (Relational DB)
*   **Option 3**: MongoDB (Document DB)
*   **Option 4**: In-memory variable (Node.js heap)

## Decision Outcome

Chosen option: "**Option 1: Redis**", because its in-memory nature ensures sub-millisecond access times, which is critical for keeping the Digital Twin synchronized. We utilize Redis features like TTL (Time-To-Live) to automatically handle data aging (e.g., removing stale vehicles) and Pub/Sub for inter-service messaging if needed.

### Consequences

*   Good, because it provides extremely high performance for real-time state updates (sub-millisecond).
*   Good, because built-in support for TTLs simplifies "liveness" management (auto-cleanup of dead sensors).
*   Good, because simple key-value model fits the "Entity ID -> State" pattern perfectly.
*   Good, because it supports Pub/Sub, allowing the State Manager to broadcast updates to other services.
*   Bad, because data must fit in RAM, which can be expensive for very large datasets (though acceptable for current scope).
*   Bad, because persistence configuration (RDB/AOF) needs tuning to balance performance vs durability.
*   Bad, because limited querying capabilities compared to SQL (though RedisJSON/RediSearch modules exist).

## Pros and Cons of the Options

### Option 2: PostgreSQL (Relational DB)

A powerful, open-source object-relational database system.

*   Good, because guarantees ACID compliance and strong data consistency.
*   Good, because powerful query language (SQL) and PostGIS for geospatial queries.
*   Good, because excellent durability and reliability.
*   Bad, because disk-based I/O introduces latency that may exceed our real-time requirements under high load.
*   Bad, because rigid schema requires migrations for every change in sensor data structure.
*   Bad, because overhead of transaction management is unnecessary for ephemeral state updates.

### Option 3: MongoDB (Document DB)

A source-available cross-platform document-oriented database program.

*   Good, because flexible schema (JSON-like documents) fits our data model well.
*   Good, because good performance for write-heavy workloads.
*   Bad, because typically slower than Redis (memory vs disk/memory mapped).
*   Bad, because eventual consistency model can lead to temporary stale reads in some configurations.
*   Bad, because operational complexity of sharding for high scale.

### Option 4: In-memory variable (Node.js heap)

Storing the state directly in the memory of the Node.js process (e.g., a JavaScript Map).

*   Good, because fastest possible access (nanoseconds).
*   Good, because zero infrastructure cost or complexity.
*   Bad, because the state is lost if the process crashes (no persistence).
*   Bad, because the state is locked to a single instance, making horizontal scaling impossible (state is not shared between replicas).
*   Bad, because garbage collection pauses can impact performance as the heap grows.

## More Information

**Related Decisions:**
*   ADR-0006: Polyglot Microservices Strategy (Redis acts as the glue between Python and Node.js services).
