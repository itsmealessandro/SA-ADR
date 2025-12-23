# Kafka Data Flow Documentation

## Overview

The State Manager uses Kafka for real-time data ingestion from the city-simulator and state distribution. It acts as a central hub that:
- **Consumes** real-time sensor data from edge managers via 3 topic types (speed, weather, camera)
- **Processes** and aggregates data into a unified digital twin state organized by district and edge
- **Publishes** complete state snapshots and incremental updates for downstream consumers

---

## Kafka Consumer (`consumer.ts`)

### Purpose
Ingests real-time sensor data from city-simulator edge managers, updates an in-memory cache, and periodically flushes to Redis for persistence.

### Architecture
```
[City-Simulator Edge Managers] → [Kafka Topics] → [Consumer] → [In-Memory Cache] → [Redis] → [Snapshots]
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

## Consumed Topics (City-Simulator)

The state-manager now consumes from 3 topics published by the city-simulator edge managers:

### 1. `city-speed-sensors`
**Purpose**: Aggregated speed sensor data from edge locations

**Source**: EdgeManager → SpeedSensorSimulator

**Data Format**:
```json
{
  "district_id": "district-centro",
  "edge_id": "edge-centro-1",
  "sensor_type": "speed",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "latitude": 42.3506,
  "longitude": 13.3992,
  "speed_kmh": 45.67,
  "sensor_count": 2,
  "sensor_readings": [
    {
      "sensor_id": "speed-centro-1a",
      "speed_kmh": 48.23,
      "latitude": 42.3507,
      "longitude": 13.3993
    },
    {
      "sensor_id": "speed-centro-1b",
      "speed_kmh": 43.11,
      "latitude": 42.3505,
      "longitude": 13.3993
    }
  ],
  "sample_count": 10
}
```

**Field Descriptions**:
- `district_id`: District identifier from city configuration
- `edge_id`: Edge location identifier (unique per edge)
- `sensor_type`: Always "speed" for this topic
- `timestamp`: ISO 8601 timestamp when data was generated
- `latitude/longitude`: Edge center coordinates
- `speed_kmh`: Edge-level aggregated speed (temporal + spatial smoothing)
- `sensor_count`: Number of physical speed sensors at this edge
- `sensor_readings`: Individual sensor readings before aggregation
- `sample_count`: Number of samples in moving average window (up to 10)

**Update Logic**: 
- Creates or updates sensor with ID `speed-{edge_id}`
- Stores in district's sensors array
- Includes metadata with individual sensor readings

---

### 2. `city-weather-sensors`
**Purpose**: Aggregated weather data from edge locations

**Source**: EdgeManager → WeatherSensorSimulator

**Data Format**:
```json
{
  "district_id": "district-centro",
  "edge_id": "edge-centro-1",
  "sensor_type": "weather",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "latitude": 42.3506,
  "longitude": 13.3992,
  "temperature_c": 15.42,
  "humidity": 67.5,
  "weather_conditions": "cloudy",
  "sensor_count": 1,
  "sensor_readings": [
    {
      "sensor_id": "weather-centro-1a",
      "temperature_c": 15.42,
      "humidity": 67.5,
      "latitude": 42.3506,
      "longitude": 13.3992
    }
  ],
  "sample_count": 8
}
```

**Field Descriptions**:
- `district_id`: District identifier
- `edge_id`: Edge location identifier
- `sensor_type`: Always "weather" for this topic
- `timestamp`: ISO 8601 timestamp
- `latitude/longitude`: Edge center coordinates
- `temperature_c`: Aggregated temperature in Celsius (temporal smoothing applied)
- `humidity`: Aggregated humidity percentage
- `weather_conditions`: One of: "clear", "cloudy", "rainy", "foggy", "snowy"
- `sensor_count`: Number of weather stations at this edge
- `sensor_readings`: Individual sensor readings
- `sample_count`: Number of samples in temperature moving average

**Update Logic**:
- Creates or updates weather station with ID `weather-{edge_id}`
- Stores in district's weatherStations array
- Includes metadata with individual sensor readings

---

### 3. `city-camera-sensors`
**Purpose**: Edge analytics from traffic cameras (road condition detection)

**Source**: EdgeManager → CameraSensorSimulator

**Data Format**:
```json
{
  "district_id": "district-centro",
  "edge_id": "edge-centro-1",
  "sensor_type": "camera",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "latitude": 42.3506,
  "longitude": 13.3992,
  "road_condition": "clear",
  "confidence": 0.92,
  "vehicle_count": 15,
  "sensor_count": 3,
  "sensor_readings": [
    {
      "sensor_id": "camera-centro-1a",
      "road_condition": "clear",
      "confidence": 0.94,
      "vehicle_count": 5,
      "latitude": 42.3508,
      "longitude": 13.3992
    },
    {
      "sensor_id": "camera-centro-1b",
      "road_condition": "clear",
      "confidence": 0.89,
      "vehicle_count": 6,
      "latitude": 42.3504,
      "longitude": 13.3992
    },
    {
      "sensor_id": "camera-centro-1c",
      "road_condition": "clear",
      "confidence": 0.93,
      "vehicle_count": 4,
      "latitude": 42.3506,
      "longitude": 13.3994
    }
  ]
}
```

**Field Descriptions**:
- `district_id`: District identifier
- `edge_id`: Edge location identifier
- `sensor_type`: Always "camera" for this topic
- `timestamp`: ISO 8601 timestamp
- `latitude/longitude`: Edge center coordinates
- `road_condition`: Aggregated condition (most critical across cameras)
  - Criticality order: accident > flooding > obstacles > congestion > clear
- `confidence`: Average confidence score (0.75-0.98)
- `vehicle_count`: Total vehicles detected across all cameras
- `sensor_count`: Number of cameras at this edge
- `sensor_readings`: Individual camera detections

**Road Condition Distribution** (simulated):
- 50% - clear (normal traffic)
- 25% - congestion (traffic jam)
- 10% - obstacles (debris/obstacles)
- 10% - flooding (water on road)
- 5% - accident

**Update Logic**:
- Creates or updates sensor with ID `camera-{edge_id}`
- Stores in district's sensors array
- Calculates congestion status from road condition:
  - clear → free_flow
  - congestion → congested
  - accident → blocked
  - obstacles → slow
  - flooding → blocked

---

## City-Simulator Architecture

The city-simulator is the primary data source for the state-manager. It simulates a complete city infrastructure:

### Components
```
[City Config JSON] → [CitySimulator] → [EdgeManagers] → [Kafka Topics]
                           │                  │
                    Loads districts      One per edge
                    and edges           (separate threads)
                           │                  │
                    Shared Kafka         Sensor Simulators:
                    Producer             - SpeedSensorSimulator
                                        - WeatherSensorSimulator
                                        - CameraSensorSimulator
```

### Edge Manager Behavior
- Each edge runs in a separate thread
- Rotates through sensor types: speed → weather → camera
- Sampling interval: 2.5-4.5 seconds (randomized to avoid synchronization)
- Local buffering for resilience when Kafka is unavailable

### Pre-Aggregation (Edge Computing)
The city-simulator demonstrates edge computing patterns:
1. **Multiple physical sensors** at each edge location
2. **Local aggregation** - averages, smoothing, condition detection
3. **Only aggregated data** sent to Kafka (reduces bandwidth)
4. **Individual readings** included in message for transparency

---

## Consumer Configuration

### Environment Variables
```bash
KAFKA_BROKERS=localhost:9092           # Kafka broker addresses (comma-separated)
KAFKA_CLIENT_ID=state-manager          # Client identifier
KAFKA_GROUP_ID=state-manager-group     # Consumer group ID
```

### Subscribed Topics
```typescript
const topics = [
  'city-speed-sensors',    // Speed sensor data from edge managers
  'city-weather-sensors',  // Weather sensor data from edge managers
  'city-camera-sensors',   // Camera analytics data from edge managers
];
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

**Message Format** (with city-simulator data):
```json
{
  "cityId": "laquila-dt-001",
  "name": "L'Aquila Digital Twin",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "districts": [
    {
      "districtId": "district-centro",
      "name": "Centro Storico",
      "location": {
        "centerLatitude": 42.3506,
        "centerLongitude": 13.3992,
        "boundaries": {
          "north": 0,
          "south": 0,
          "east": 0,
          "west": 0
        }
      },
      "sensors": [
        {
          "sensorId": "speed-edge-centro-1",
          "type": "speed",
          "edgeId": "edge-centro-1",
          "value": 45.67,
          "unit": "km/h",
          "status": "active",
          "lastUpdated": "2025-12-21T10:29:55.000Z",
          "location": {
            "latitude": 42.3506,
            "longitude": 13.3992
          },
          "metadata": {
            "avgSpeed": 45.67,
            "sensorCount": 2,
            "readings": [
              {
                "sensor_id": "speed-centro-1a",
                "speed_kmh": 48.23,
                "latitude": 42.3507,
                "longitude": 13.3993
              }
            ]
          }
        },
        {
          "sensorId": "camera-edge-centro-1",
          "type": "camera",
          "edgeId": "edge-centro-1",
          "value": 15,
          "unit": "vehicles",
          "status": "active",
          "lastUpdated": "2025-12-21T10:29:58.000Z",
          "location": {
            "latitude": 42.3506,
            "longitude": 13.3992
          },
          "metadata": {
            "roadCondition": "clear",
            "confidence": 0.92,
            "vehicleCount": 15,
            "sensorCount": 3,
            "congestionStatus": "free_flow",
            "readings": [
              {
                "sensor_id": "camera-centro-1a",
                "road_condition": "clear",
                "confidence": 0.94,
                "vehicle_count": 5
              }
            ]
          }
        }
      ],
      "buildings": [],
      "weatherStations": [
        {
          "stationId": "weather-edge-centro-1",
          "name": "Weather Station edge-centro-1",
          "edgeId": "edge-centro-1",
          "location": {
            "latitude": 42.3506,
            "longitude": 13.3992,
            "elevation": 0
          },
          "readings": {
            "temperature": 15.42,
            "humidity": 67.5,
            "weatherConditions": "cloudy",
            "pressure": 1013.25,
            "windSpeed": 0,
            "windDirection": 0,
            "precipitation": 0,
            "cloudCover": 0,
            "visibility": 10000,
            "uvIndex": 0,
            "units": {
              "temperature": "°C",
              "humidity": "%",
              "pressure": "hPa",
              "windSpeed": "m/s",
              "windDirection": "°",
              "precipitation": "mm",
              "cloudCover": "%",
              "visibility": "m"
            }
          },
          "status": "active",
          "lastUpdated": "2025-12-21T10:29:50.000Z",
          "metadata": {
            "sensorCount": 1,
            "readings": [
              {
                "sensor_id": "weather-centro-1a",
                "temperature_c": 15.42,
                "humidity": 67.5
              }
            ]
          }
        }
      ]
    }
  ],
  "publicTransport": {
    "buses": [],
    "stations": []
  },
  "emergencyServices": {
    "incidents": [],
    "units": []
  },
  "cityGraph": {
    "nodes": [],
    "edges": []
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
