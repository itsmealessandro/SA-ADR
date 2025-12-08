# Kafka Data Flow Documentation

## Overview

The State Manager uses Kafka for real-time data ingestion and state distribution. It acts as a central hub that:
- **Consumes** real-time sensor data, traffic updates, and system events from 9 different topics
- **Processes** and aggregates data into a unified digital twin state
- **Publishes** complete state snapshots and incremental updates for downstream consumers

---

## Kafka Consumer (`consumer.ts`)

### Purpose
Ingests real-time data from multiple city systems, updates an in-memory cache, and periodically flushes to Redis for persistence.

### Architecture
```
[City Systems] → [Kafka Topics] → [Consumer] → [In-Memory Cache] → [Redis] → [Snapshots]
                                       ↓
                                [Batch Processing]
                                [Group by District]
                                [Flush Every 1s]
```

### Performance Strategy
- **Batch Processing**: Processes up to 1000 messages per batch
- **Parallel Districts**: Processes different districts in parallel to avoid race conditions
- **In-Memory Cache**: No Redis I/O per message (only periodic flush)
- **Periodic Flush**: Flushes cache to Redis every 1 second using pipeline
- **Manual Offset Management**: Commits offsets after successful batch processing

---

## Consumed Topics

### 1. `sensors.environmental`
**Purpose**: Environmental sensor readings (air quality, noise, temperature)

**Data Format**:
```json
{
  "districtId": "district-01",
  "sensorId": "env-sensor-001",
  "type": "air_quality" | "noise" | "temperature",
  "value": 45.2,
  "unit": "AQI" | "dB" | "°C",
  "status": "active" | "inactive" | "maintenance",
  "lastUpdated": "2025-12-08T10:30:00.000Z",
  "location": {
    "latitude": 42.35,
    "longitude": 13.40
  },
  "metadata": {
    "manufacturer": "SensorTech",
    "model": "AQ-2000"
  }
}
```

**Update Logic**: 
- Updates existing sensor if `sensorId` exists in district
- Creates new sensor if not found
- Preserves location and metadata if not provided in update

---

### 2. `sensors.traffic`
**Purpose**: Traffic sensor readings (vehicle count, average speed)

**Data Format**:
```json
{
  "districtId": "district-02",
  "sensorId": "traffic-sensor-005",
  "type": "traffic_flow",
  "value": 150,
  "unit": "vehicles/hour",
  "status": "active",
  "lastUpdated": "2025-12-08T10:30:00.000Z",
  "location": {
    "latitude": 42.36,
    "longitude": 13.41
  },
  "metadata": {
    "road": "Via Roma",
    "direction": "northbound"
  }
}
```

**Update Logic**: Same as environmental sensors

---

### 3. `buildings.occupancy`
**Purpose**: Real-time building occupancy updates

**Data Format**:
```json
{
  "districtId": "district-01",
  "buildingId": "building-001",
  "currentOccupancy": 250,
  "totalCapacity": 500,
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- Updates `currentOccupancy` for existing building
- Calculates `occupancyRate` = currentOccupancy / totalCapacity

---

### 4. `buildings.sensors`
**Purpose**: Building-specific sensor data (HVAC, energy consumption)

**Data Format**:
```json
{
  "districtId": "district-03",
  "sensorId": "building-sensor-010",
  "buildingId": "building-003",
  "type": "energy_consumption",
  "value": 125.5,
  "unit": "kWh",
  "status": "active",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**: Same as environmental sensors (stored in district.sensors array)

---

### 5. `weather.stations`
**Purpose**: Weather station readings

**Data Format**:
```json
{
  "districtId": "district-01",
  "stationId": "weather-station-01",
  "readings": {
    "temperature": 18.5,
    "humidity": 65,
    "pressure": 1013.25,
    "windSpeed": 12.5,
    "windDirection": 180,
    "precipitation": 0
  },
  "status": "active",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- Updates existing weather station readings by `stationId`
- Replaces entire `readings` object
- Updates `status` and `lastUpdated`

---

### 6. `traffic.graph`
**Purpose**: Real-time traffic conditions on road network edges

**Data Format**:
```json
{
  "edgeId": "E-00015",
  "trafficConditions": {
    "averageSpeed": 35.5,
    "congestionLevel": "moderate",
    "vehicleCount": 45,
    "travelTime": 8.2,
    "incidents": []
  },
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- Finds edge by `edgeId` in city graph
- Replaces `trafficConditions` object
- Updates `lastUpdated` timestamp

---

### 7. `transport.gps`
**Purpose**: Real-time GPS coordinates of public transport vehicles

**Data Format**:
```json
{
  "busId": "bus-101",
  "routeId": "route-A",
  "currentLocation": {
    "latitude": 42.35,
    "longitude": 13.40
  },
  "heading": 90,
  "speed": 25.5,
  "passengerCount": 35,
  "status": "in_service",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- Updates existing bus if `busId` exists in publicTransport.buses
- Creates new bus entry if not found
- Stored in shared `publicTransport` state (not district-specific)

---

### 8. `transport.stations`
**Purpose**: Public transport station status updates

**Data Format**:
```json
{
  "stationId": "station-05",
  "name": "Piazza Duomo",
  "location": {
    "latitude": 42.35,
    "longitude": 13.40
  },
  "waitingPassengers": 12,
  "nextArrivals": [
    {
      "busId": "bus-101",
      "routeId": "route-A",
      "estimatedArrival": "2025-12-08T10:35:00.000Z"
    }
  ],
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- Updates existing station if `stationId` exists in publicTransport.stations
- Creates new station entry if not found
- Stored in shared `publicTransport` state

---

### 9. `emergency.incidents`
**Purpose**: Emergency incidents and response unit updates

**Data Format**:
```json
{
  "incidentId": "incident-001",
  "type": "fire" | "medical" | "accident" | "security",
  "severity": "critical" | "high" | "medium" | "low",
  "location": {
    "latitude": 42.35,
    "longitude": 13.40
  },
  "description": "Fire reported in building",
  "status": "reported" | "dispatched" | "in_progress" | "resolved",
  "assignedUnits": ["unit-fire-01", "unit-ambulance-02"],
  "reportedAt": "2025-12-08T10:30:00.000Z",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Alternative Format (Response Units)**:
```json
{
  "unitId": "unit-fire-01",
  "type": "fire_truck" | "ambulance" | "police",
  "status": "available" | "dispatched" | "on_scene",
  "currentLocation": {
    "latitude": 42.35,
    "longitude": 13.40
  },
  "assignedIncident": "incident-001",
  "lastUpdated": "2025-12-08T10:30:00.000Z"
}
```

**Update Logic**:
- If `incidentId` present: Updates or creates incident in emergencyServices.incidents
- If `unitId` present: Updates or creates unit in emergencyServices.units
- Stored in shared `emergencyServices` state

---

## Consumer Configuration

### Environment Variables
```bash
KAFKA_BROKERS=localhost:9092           # Kafka broker addresses (comma-separated)
KAFKA_CLIENT_ID=state-manager          # Client identifier
KAFKA_GROUP_ID=state-manager-group     # Consumer group ID
```

### Performance Settings
- **Batch Size**: 1000 messages per batch
- **Flush Interval**: 1000ms (1 second)
- **Partitions Processed Concurrently**: 3
- **Max Bytes Per Partition**: 1MB
- **Session Timeout**: 30 seconds
- **Auto Commit**: Disabled (manual offset management)

---

## Kafka Publisher (`publisher.ts`)

### Purpose
Periodically publishes the complete city digital twin state and incremental updates to Kafka topics for consumption by visualization systems, analytics services, and external applications.

### Architecture
```
[Redis State] → [State Publisher] → [Calculate Diff] → [Kafka Topics]
                      ↓                     ↓
              [Full State: 60s]    [Incremental: 5s]
```

---

## Published Topics

### 1. `state.full`
**Purpose**: Complete digital twin state snapshot

**Publish Frequency**: Every 60 seconds (configurable via `FULL_STATE_PUBLISH_INTERVAL_MS`)

**Message Format**:
```json
{
  "cityId": "laquila-dt-001",
  "name": "L'Aquila Digital Twin",
  "timestamp": "2025-12-08T10:30:00.000Z",
  "districts": [
    {
      "districtId": "district-01",
      "name": "Centro Storico",
      "location": {
        "centerLatitude": 42.3498,
        "centerLongitude": 13.3995,
        "boundaries": {
          "north": 42.36,
          "south": 42.34,
          "east": 13.42,
          "west": 13.38
        }
      },
      "sensors": [
        {
          "sensorId": "env-sensor-001",
          "type": "air_quality",
          "value": 45.2,
          "unit": "AQI",
          "status": "active",
          "lastUpdated": "2025-12-08T10:29:55.000Z",
          "location": {
            "latitude": 42.35,
            "longitude": 13.40
          },
          "metadata": {
            "manufacturer": "SensorTech"
          }
        }
      ],
      "buildings": [
        {
          "buildingId": "building-001",
          "name": "Palazzo Comunale",
          "type": "government",
          "location": {
            "latitude": 42.35,
            "longitude": 13.40
          },
          "currentOccupancy": 250,
          "totalCapacity": 500,
          "occupancyRate": 0.5,
          "sensors": []
        }
      ],
      "weatherStations": [
        {
          "stationId": "weather-station-01",
          "location": {
            "latitude": 42.35,
            "longitude": 13.40
          },
          "readings": {
            "temperature": 18.5,
            "humidity": 65,
            "pressure": 1013.25,
            "windSpeed": 12.5,
            "windDirection": 180,
            "precipitation": 0
          },
          "status": "active",
          "lastUpdated": "2025-12-08T10:29:50.000Z"
        }
      ],
      "cityGraph": {
        "nodes": [
          {
            "nodeId": "N-00001",
            "type": "intersection",
            "location": {
              "latitude": 42.35,
              "longitude": 13.40
            }
          }
        ],
        "edges": [
          {
            "edgeId": "E-00015",
            "roadSegmentId": "RS-00015",
            "fromNode": "N-00001",
            "toNode": "N-00002",
            "name": "Via Roma",
            "class": "primary",
            "length": 150.5,
            "speedLimit": 50,
            "lanes": 2,
            "trafficConditions": {
              "averageSpeed": 35.5,
              "congestionLevel": "moderate",
              "vehicleCount": 45,
              "travelTime": 8.2,
              "incidents": []
            },
            "lastUpdated": "2025-12-08T10:29:58.000Z",
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [13.40, 42.35],
                [13.401, 42.351]
              ]
            }
          }
        ]
      }
    }
  ],
  "publicTransport": {
    "buses": [
      {
        "busId": "bus-101",
        "routeId": "route-A",
        "currentLocation": {
          "latitude": 42.35,
          "longitude": 13.40
        },
        "heading": 90,
        "speed": 25.5,
        "passengerCount": 35,
        "status": "in_service",
        "lastUpdated": "2025-12-08T10:29:55.000Z"
      }
    ],
    "stations": [
      {
        "stationId": "station-05",
        "name": "Piazza Duomo",
        "location": {
          "latitude": 42.35,
          "longitude": 13.40
        },
        "waitingPassengers": 12,
        "nextArrivals": []
      }
    ]
  },
  "emergencyServices": {
    "incidents": [
      {
        "incidentId": "incident-001",
        "type": "fire",
        "severity": "critical",
        "location": {
          "latitude": 42.35,
          "longitude": 13.40
        },
        "status": "in_progress",
        "assignedUnits": ["unit-fire-01"],
        "reportedAt": "2025-12-08T10:25:00.000Z"
      }
    ],
    "units": []
  }
}
```

**Message Headers**:
- `type`: "full-state"
- `version`: "1.0"

**Message Key**: City ID (e.g., "laquila-dt-001")

**Use Cases**:
- Initial state synchronization for new consumers
- Recovery after connection loss
- Periodic full refresh to ensure consistency
- Analytics and reporting systems

---

### 2. `state.incremental`
**Purpose**: Incremental state changes (delta/diff) since last publish

**Publish Frequency**: Every 5 seconds (configurable via `INCREMENTAL_STATE_PUBLISH_INTERVAL_MS`)

**Message Format**:
```json
{
  "cityId": "laquila-dt-001",
  "timestamp": "2025-12-08T10:30:05.000Z",
  "delta": {
    "districts": {
      "0": {
        "sensors": {
          "_t": "a",
          "0": [
            {
              "value": [45.2, 46.1],
              "lastUpdated": [
                "2025-12-08T10:29:55.000Z",
                "2025-12-08T10:30:05.000Z"
              ]
            }
          ]
        },
        "cityGraph": {
          "edges": {
            "_t": "a",
            "0": {
              "trafficConditions": {
                "averageSpeed": [35.5, 38.2],
                "vehicleCount": [45, 42]
              },
              "lastUpdated": [
                "2025-12-08T10:29:58.000Z",
                "2025-12-08T10:30:05.000Z"
              ]
            }
          }
        }
      }
    },
    "publicTransport": {
      "buses": {
        "_t": "a",
        "0": {
          "currentLocation": {
            "latitude": [42.35, 42.351],
            "longitude": [13.40, 13.401]
          },
          "speed": [25.5, 26.3]
        }
      }
    }
  }
}
```

**Delta Format** (jsondiffpatch):
- `[oldValue, newValue]` - Value changed
- `[newValue]` - Value added
- `[oldValue, 0, 0]` - Value deleted
- `{"_t": "a"}` - Array diff marker
- Only changed fields are included

**Message Headers**:
- `type`: "incremental-state"
- `version`: "1.0"
- `previousTimestamp`: Timestamp of previous state used for diff calculation

**Message Key**: City ID (e.g., "laquila-dt-001")

**Performance Benefits**:
- **Compression Ratio**: Typically 80-95% smaller than full state
- **Bandwidth Efficiency**: 5-20% of full state size
- **Low Latency**: Updates published every 5 seconds
- **High Frequency**: More responsive to state changes

**Use Cases**:
- Real-time visualization updates
- Low-latency monitoring dashboards
- Event-driven analytics
- Bandwidth-constrained consumers

---

## Publisher Configuration

### Environment Variables
```bash
KAFKA_BROKERS=localhost:9092                      # Kafka broker addresses
KAFKA_CLIENT_ID=state-manager                     # Client identifier
FULL_STATE_PUBLISH_INTERVAL_MS=60000              # Full state interval (default: 60s)
INCREMENTAL_STATE_PUBLISH_INTERVAL_MS=5000        # Incremental interval (default: 5s)
```

### Performance Settings
- **Transaction Timeout**: 30 seconds
- **Allow Auto Topic Creation**: Enabled
- **Retry Configuration**: 8 retries with exponential backoff

---

## Consumer Integration Guide

### Option 1: Full State Only
```typescript
// Simple consumer - always uses latest full state
consumer.subscribe({ topic: 'state.full' });
consumer.run({
  eachMessage: async ({ message }) => {
    const state = JSON.parse(message.value.toString());
    updateVisualization(state);
  }
});
```

### Option 2: Incremental Updates with Full State Fallback
```typescript
import * as jsondiffpatch from 'jsondiffpatch';

let currentState = null;
const differ = jsondiffpatch.create();

consumer.subscribe({ topics: ['state.full', 'state.incremental'] });
consumer.run({
  eachMessage: async ({ topic, message }) => {
    const data = JSON.parse(message.value.toString());
    
    if (topic === 'state.full') {
      // Replace entire state
      currentState = data;
    } else if (topic === 'state.incremental' && currentState) {
      // Apply delta to current state
      currentState = differ.patch(currentState, data.delta);
    }
    
    updateVisualization(currentState);
  }
});
```

### Option 3: High-Performance with Incremental Only
```typescript
// For bandwidth-sensitive applications
// Request full state via API on startup, then subscribe to incremental
const initialState = await fetch('http://state-manager/api/state').then(r => r.json());
let currentState = initialState;

consumer.subscribe({ topic: 'state.incremental' });
consumer.run({
  eachMessage: async ({ message }) => {
    const { delta } = JSON.parse(message.value.toString());
    currentState = differ.patch(currentState, delta);
    updateVisualization(currentState);
  }
});
```

---

## Data Flow Summary

```
┌─────────────────────┐
│   City Systems      │
│  (Sensors, IoT)     │
└──────────┬──────────┘
           │
           │ Publishes to 9 topics
           ▼
┌─────────────────────┐
│   Kafka Cluster     │
│  (Message Broker)   │
└──────────┬──────────┘
           │
           │ Consumes
           ▼
┌─────────────────────┐
│  Consumer Manager   │
│  - Batch Processing │
│  - In-Memory Cache  │
│  - Group by District│
└──────────┬──────────┘
           │
           │ Flushes every 1s
           ▼
┌─────────────────────┐
│   Redis Store       │
│  (State Storage)    │
└──────────┬──────────┘
           │
           │ Reads state
           ▼
┌─────────────────────┐
│  State Publisher    │
│  - Full: 60s        │
│  - Incremental: 5s  │
└──────────┬──────────┘
           │
           │ Publishes to 2 topics
           ▼
┌─────────────────────┐
│   Kafka Cluster     │
│  state.full         │
│  state.incremental  │
└──────────┬──────────┘
           │
           │ Consumed by
           ▼
┌─────────────────────┐
│  Visualization      │
│  Analytics          │
│  External Systems   │
└─────────────────────┘
```

---

## Performance Metrics

### Consumer Throughput
- **Target**: 10,000+ messages/second
- **Batch Size**: 1000 messages
- **Latency**: < 100ms per batch
- **Flush Interval**: 1 second

### Publisher Throughput
- **Full State Size**: ~500KB - 5MB (depending on city size)
- **Incremental Size**: ~25KB - 250KB (5-20% of full state)
- **Compression Ratio**: 80-95%
- **Bandwidth Savings**: 16x - 20x compared to full state only

### Example Metrics (L'Aquila Digital Twin)
- Districts: 5
- Sensors per District: 50
- Buildings per District: 100
- Graph Edges per District: 3000

**Full State**: ~2MB
**Incremental State**: ~100KB (95% reduction)
**Daily Bandwidth**: 
- Full only: 2.8GB
- Incremental + Full: 175MB (94% savings)

---

## Troubleshooting

### Consumer Lag
**Problem**: Consumer falling behind producers

**Solutions**:
- Increase `BATCH_SIZE` for more aggressive batching
- Reduce `FLUSH_INTERVAL_MS` if bottleneck is Redis
- Scale horizontally by adding more consumer instances
- Check Redis performance and network latency

### Missing Incremental Updates
**Problem**: Incremental state topic shows no changes

**Possible Causes**:
- No actual state changes between publishes
- State hasn't been updated by consumer
- Publisher not receiving updated state from Redis

**Debugging**:
```bash
# Check consumer activity
docker logs state-manager | grep "Processed batch"

# Check publisher activity  
docker logs state-manager | grep "Published incremental"

```

### Large Delta Size
**Problem**: Incremental updates approaching full state size

**Possible Causes**:
- Massive state changes (e.g., batch sensor updates)
- Array reordering causing diff to see all items as changed
- Missing or incorrect object identifiers for jsondiffpatch

**Solutions**:
- Ensure objects have stable `id` fields
- Configure jsondiffpatch `objectHash` properly
- Consider increasing full state publish frequency
