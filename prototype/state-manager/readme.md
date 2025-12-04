# Digital Twin State Manager Microservice

## Overview

The Digital Twin State Manager microservice is responsible for maintaining a real-time virtual representation of a smart city. It ingests data from various sources (sensors, GPS trackers, buildings, weather stations, etc.) via Kafka topics and reconstructs the physical world as a comprehensive digital twin. The service calculates incremental state changes, ensuring efficient data transmission and low-latency updates.

The State Manager Microservice reads data from various data streams, processes it, and constructs a virtual model of the city, effectively recreating the real world [FR1]. It does so by loading a static graph map of the city and incorporating coordinates from data streams, traffic conditions, and other dynamic information.

There will be only one replica of this service to prevent inconsistencies between different versions of the virtual model, ensuring a single, authoritative source of truth [NFR2].

## Architecture Components

### 1. **State Manager API**

RESTful API that provides access to the current city state and related operations.

**Endpoints:**
- `GET /state` - Returns the complete current state of the digital twin as JSON
- `GET /state/districts` - Returns all districts with their sensors, buildings, and weather stations
- `GET /state/districts/{districtId}` - Returns a specific district state
- `GET /state/cityGraph` - Returns the city road graph with traffic conditions
- `GET /state/sensors` - Returns all sensor readings across the city
- `GET /state/buildings` - Returns all buildings with occupancy and embedded sensors
- `GET /health` - Health check endpoint

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

The microservice consumes data from multiple Kafka topics, each representing different data sources in the city:

**Kafka Topics:**
- `sensors.environmental` - PM2.5, noise, air quality sensors
- `sensors.traffic` - Traffic cameras, vehicle counters, parking occupancy
- `buildings.occupancy` - Building occupancy, HVAC, energy consumption
- `buildings.sensors` - Temperature, humidity, water, security sensors
- `weather.stations` - Weather readings from distributed stations
- `transport.gps` - Real-time bus and vehicle GPS locations
- `transport.stations` - Metro and transit station data
- `emergency.incidents` - Emergency service incidents and responses
- `traffic.graph` - Road segment traffic conditions and incidents

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

The city is divided into geographic districts (e.g., Downtown District, Midtown District, Residential District), each containing:
- **Sensors**: Environmental (PM2.5, noise), traffic (cameras, vehicle counters), parking occupancy
- **Buildings**: Government, commercial, residential buildings with embedded sensors (temperature, humidity, energy, occupancy, water, security)
- **Weather Stations**: Comprehensive meteorological data (temperature, humidity, wind, precipitation, pressure)

### City Graph

Road network representation with:
- **Nodes**: Intersections with traffic light states and cycle times
- **Edges**: Road segments with GeoJSON LineString geometry, traffic conditions (congestion level, speed, vehicle count), and incidents

### Public Transport

- **Buses**: Real-time GPS location, occupancy, route information, next stop
- **Stations**: Metro stations with crowd density sensors

### Emergency Services

- **Incidents**: Active emergencies with location, priority, and responding units
- **Units**: Ambulances, fire trucks, police with real-time positions and status

See `mock/type.ts` for complete TypeScript interface definitions and `mock/city-digital-twin.json` for a sample state representation.

## Deployment and Scalability

**Single Replica Strategy**: The service runs as a single instance to ensure:
- Consistency of the virtual model [NFR2]
- Single authoritative source of truth
- Simplified state management without synchronization overhead

**High Availability Considerations:**
- Redis persistence (AOF/RDB) for state recovery
- MongoDB replica sets for snapshot durability
- Kubernetes liveness/readiness probes
- Fast failover with state restoration from latest snapshot + event replay from Kafka

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

- **Runtime**: Node.js / TypeScript
- **In-Memory Store**: Redis 7+
- **Document Store**: MongoDB 6+
- **Message Broker**: Apache Kafka
- **API Framework**: Express.js / FastAPI / Spring Boot
- **WebSocket**: Socket.io / native WebSocket
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## Files in this Directory

- `mock/city-digital-twin.json` - Sample digital twin state representing a smart city
- `mock/type.ts` - TypeScript interfaces for the entire digital twin data model
- `geojson-generator.js` - Utility functions to convert state to GeoJSON format
- `map-visualization.html` - Interactive web map for visualizing the digital twin
- `docker-compose.yml` - Docker composition for local development
