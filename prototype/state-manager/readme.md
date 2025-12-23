# Digital Twin State Manager Microservice

## Overview

The Digital Twin State Manager microservice is responsible for maintaining a real-time virtual representation of a smart city. It ingests data from various sources (sensors, GPS trackers, buildings, weather stations, etc.) via Kafka topics and reconstructs the physical world as a comprehensive digital twin. The service calculates incremental state changes, ensuring efficient data transmission and low-latency updates.

The State Manager Microservice reads data from various data streams, processes it, and constructs a virtual model of the city, effectively recreating the real world [FR1]. It does so by loading a static graph map of the city and incorporating coordinates from data streams, traffic conditions, and other dynamic information.

There will be only one replica of this service to prevent inconsistencies between different versions of the virtual model, ensuring a single, authoritative source of truth [NFR2].

## Role-Based Access

The Digital Twin State Manager supports two primary user roles with different access levels:

### **City Manager Role**
- **Full City Access**: Can view and manage the complete city digital twin
- **All Districts**: Has access to all district data, sensors, buildings, and traffic graphs
- **Cross-District Analytics**: Can perform city-wide analysis and comparisons
- **API Endpoints**: Can access all endpoints without district filtering

### **District Operator Role**
- **Single District Access**: Limited to viewing and managing only their assigned district
- **District-Scoped Data**: Access restricted to sensors, buildings, weather stations, and traffic graph within their district
- **Localized Operations**: Can only perform operations within district boundaries
- **API Endpoints**: Must use district-specific endpoints (e.g., `/state/districts/{districtId}`)

### Data Model Design for Role-Based Access

Each district in the city is self-contained with its own:
- **Sensors**: Environmental, traffic, and parking sensors
- **Buildings**: With occupancy and embedded sensors
- **Weather Stations**: District-specific weather readings
- **District Graph**: Road network (nodes and edges) within district boundaries

This district-centric data model enables:
- **Efficient Authorization**: Simply check user's assigned district(s)
- **Data Isolation**: District operators cannot access other districts' data
- **Parallel Processing**: Each district can be processed independently
- **Scalable Access Control**: Easy to add new districts or operators

## Architecture Components

### 1. **State Manager API**

RESTful API that provides access to the current city state and related operations.

**Endpoints:**
- `GET /health` - Health check endpoint (returns service status)
- `GET /state` - Returns the complete current state of the digital twin as JSON (City Manager only)
- `GET /state/districts` - Returns all districts with their sensors, buildings, and weather stations (City Manager only)
- `GET /state/districts/:districtId` - Returns a specific district state (City Manager or assigned District Operator)
- `GET /state/districts/:districtId/sensors` - Returns all sensor readings within a district
- `GET /state/districts/:districtId/buildings` - Returns all buildings with occupancy within a district
- `GET /state/districts/:districtId/weather` - Returns weather stations within a district
- `GET /state/vehicles` - Returns all vehicles data (ambulances, fire trucks, etc.)
- `GET /state/graph` - Returns city-wide road graph with traffic conditions
- `GET /snapshots/latest` - Returns the most recent state snapshot
- `GET /snapshots/:id` - Returns a specific snapshot by ID

### 2. **WebSocket Connection**

Real-time bi-directional communication channel that pushes incremental state updates to connected clients.

**Features:**
- **Initial Full State**: On connection, sends the complete city state
- **Incremental Updates**: Subsequently sends only the differences (deltas) from the previous state [NFR3] [NFR7]
- **Efficient Bandwidth Usage**: Reduces network traffic by transmitting only changed data
- **Real-time Synchronization**: Keeps client dashboards synchronized with minimal latency

**Update Types:**
- Sensor value changes
- Traffic condition updates
- Building occupancy changes
- Emergency incident updates
- Weather station readings
- Public transport location updates

### 3. **In-Memory State (Redis)**

High-performance Redis database storing the current authoritative state of the digital twin.

**Characteristics:**
- **Low Latency**: Sub-millisecond read/write operations for fast state access [NFR3]
- **JSON Storage**: Stores the complete city state as a structured JSON document
- **Fast Updates**: Enables real-time state modifications as data streams arrive from Kafka
- **Single Source of Truth**: One replica ensures consistency [NFR2]

### 4. **State Snapshots (MongoDB)**

Document database for persisting historical snapshots of the city state at specific points in time, useful for simulations and historical visualization [NFR7].

**Use Cases:**
- Historical analysis and trend identification
- Time-travel debugging and replay
- Simulation scenarios based on past states
- Compliance and audit trails
- Disaster recovery and state reconstruction

**Snapshot Strategy:**
- Periodic snapshots (e.g., every 5 minutes)
- Event-triggered snapshots (major incidents, anomalies)
- Configurable retention policies

## Data Ingestion

The microservice consumes data from multiple Kafka topics, each representing different data sources in the city. Topics are partitioned by district to enable parallel processing and align with the role-based access model.

**Kafka Topics:**
- `city.gateways` - Gateway sensor data (speed, weather, camera sensors) partitioned by districtId
- `buildings.state` - Building state updates (air quality, acoustic, displays, resources) partitioned by districtId
- `vehicles.gps` - Real-time vehicle GPS locations and telemetry (cross-district)

**Partition Strategy:**
Each message includes a `districtId` field used as the partition key. This ensures:
- Messages for the same district are processed in order by the same consumer
- District-level state updates maintain consistency
- Parallel processing of different districts without coordination overhead

## State Reconstruction and Incremental Updates

### Reconstruction Process

The microservice recreates the real world from incoming data streams by:

1. **Load Static Data**: Initialize with city graph, district boundaries, fixed infrastructure
2. **Stream Processing**: Consume real-time data from Kafka topics
3. **State Merging**: Integrate new data into the current in-memory state (Redis)
4. **Diff Calculation**: Compute differences between previous and new state
5. **Update Distribution**: Push incremental changes via WebSocket to connected clients

### Incremental Update Algorithm

The service implements an efficient diff algorithm that calculates only the differences between the current state and the next state:
- Compares new sensor readings with previous values
- Identifies only the changed properties
- Generates minimal update payloads
- Preserves timestamp and metadata for each change

To optimize bandwidth, the Digital Twin initially sends the full state to operators via the API request (`GET /state`) and subsequently transmits only the differences from the previous state through the WebSocket connection, providing real-time updates to the user dashboard [NFR3] [NFR7].

## City Digital Twin Data Model

The digital twin represents a smart city with the following hierarchical structure:

### Districts

The city is divided into geographic districts (e.g., District Roio, District Centro, District Pettino), each containing:
- **Gateways**: Physical data collectors that aggregate sensor data from multiple road segments
- **Sensors**: Flattened sensor data (speed, weather, camera) extracted from gateways for convenience
- **Buildings**: Government, commercial, residential buildings with air quality, acoustic, and display sensors
- **Weather Stations**: Meteorological data collected by gateways

### City Graph

Road network representation with:
- **Nodes**: Intersections with traffic light states and cycle times
- **Edges**: Road segments with GeoJSON LineString geometry, traffic conditions (congestion level, speed, vehicle count), and incidents

### Vehicles

- **All Vehicles**: Real-time GPS location, movement data, battery/resources, sensors, and route planning for ambulances, fire trucks, police, taxis, and other monitored vehicles

See [`src/types/index.ts`](src/types/index.ts) for complete TypeScript interface definitions.

## Deployment and Scalability

**Single Instance with Parallel Consumer Strategy**: The service runs as a single instance with multiple internal Kafka consumers processing partitions in parallel, ensuring consistency while achieving concurrent processing [NFR2]:

### Internal Parallelization by District

Instead of deploying multiple replicas, the microservice achieves parallelism through:

**1. Kafka Partitioning by District**

Each Kafka topic is partitioned by district ID, ensuring all messages for a specific district go to the same partition:
- Partition key: `districtId`
- Partition assignment: `hash(districtId) % numPartitions`
- Ordering guarantee: All operations for a district are processed sequentially

**2. Multiple Consumer Threads/Workers**

The single instance spawns multiple consumer workers (e.g., 3-10 depending on district count):
- Each worker is assigned specific partitions
- Workers process their assigned districts concurrently
- Thread-safe state updates to Redis per district

**3. District-Sharded State in Redis**

State is stored in Redis with district-level granularity for concurrent access:

```
district:DIST-001:state → Downtown District state (JSON)
district:DIST-002:state → Midtown District state (JSON)
district:DIST-003:state → Residential District state (JSON)
city:graph → City-wide road graph
city:publicTransport → Public transport state
city:emergencyServices → Emergency services state
```

**4. API State Aggregation**

API endpoints aggregate district states from Redis in parallel to construct the full city view:
- `GET /state` - Fetches all district keys and merges into complete city state
- `GET /state/districts/{districtId}` - Direct fetch from single Redis key
- Parallel Redis queries minimize response time


### Failure Recovery

**Process Restart:**
- State restored from Redis (current state)
- MongoDB snapshot provides last known good state
- Kafka offset management: Consumers resume from last committed offset per partition

**Recovery Steps:**
1. Load latest snapshot from MongoDB (if Redis is empty)
2. Connect consumers to Kafka with stored offsets
3. Replay uncommitted messages from Kafka
4. Resume normal operation

**Recovery Time:**
- Cold start (empty Redis): < 60 seconds
- Warm start (Redis populated): < 10 seconds
- No data loss: Kafka retention + offset tracking


## Performance Characteristics

- **State Update Latency**: < 100ms from Kafka ingestion to WebSocket push [NFR3]
- **API Response Time**: < 50ms for `GET /state` (from Redis)
- **WebSocket Update Size**: 80-95% smaller than full state (incremental updates only)
- **Snapshot Write**: Async, non-blocking operation to MongoDB
- **Memory Footprint**: ~500MB - 2GB depending on city size and sensor density

## Visualization and Integration

The microservice provides data in GeoJSON-compatible format for mapping libraries:
- **District boundaries** as Polygon geometries
- **Road segments** with LineString geometries for traffic visualization
- **Sensors, buildings, weather stations** as Point features
- **Traffic congestion** color-coded visualization (green=light, yellow=moderate, red=heavy)

Utility files for visualization:
- `geojson-generator.js` - Converts digital twin state to GeoJSON FeatureCollections
- `map-visualization.html` - Interactive map using Leaflet.js with layer controls

## Technology Stack

- **In-Memory Store**: Redis 7+
- **Document Store**: MongoDB 6+
- **Message Broker**: Apache Kafka
- **Containerization**: Docker
- **Orchestration**: Kubernetes

**Note**: Programming language and frameworks to be determined based on project requirements.

## Files in this Directory

- `mock/city-digital-twin.json` - Sample digital twin state representing a smart city
- `mock/type.ts` - Type definitions for the entire digital twin data model
- `geojson-generator.js` - Utility functions to convert state to GeoJSON format
- `map-visualization.html` - Interactive web map for visualizing the digital twin
- `docker-compose.yml` - Docker composition for local development

## Implementation Considerations

### Kafka Consumer Implementation

Each consumer worker should:
- Subscribe to specific partition(s) based on worker ID
- Process messages sequentially within partition
- Commit offsets after successful Redis write
- Handle errors with retry logic and dead-letter queue
- Monitor lag and processing rate

### Redis Update Pattern

For thread-safe concurrent updates:
- Use district-specific keys to avoid lock contention
- Implement optimistic locking with WATCH/MULTI/EXEC for critical updates
- Use Redis pipelines for batch operations
- Set appropriate TTL for cached aggregations

### WebSocket Update Distribution

- Aggregate changes from all consumer workers
- Buffer updates (e.g., 100ms window) to reduce message frequency
- Push incremental diffs grouped by district
- Handle client reconnection with state synchronization
