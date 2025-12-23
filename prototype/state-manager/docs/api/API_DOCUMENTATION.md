# State Manager API Documentation

## Overview

The State Manager API provides RESTful endpoints to query the digital twin state of L'Aquila city. The API offers access to real-time city data including districts, buildings, sensors, vehicles, and the city road graph.

**Base URL:** `http://localhost:3000/api`

**Version:** 1.0.0

---

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Get Complete State](#get-complete-state)
  - [Get Districts](#get-districts)
  - [Get District by ID](#get-district-by-id)
  - [Get District Sensors](#get-district-sensors)
  - [Get District Buildings](#get-district-buildings)
  - [Get District Weather](#get-district-weather)
  - [Get City Graph](#get-city-graph)
  - [Get Buildings](#get-buildings) (Not Implemented)
  - [Get Sensors](#get-sensors) (Not Implemented)
  - [Get Vehicles](#get-vehicles)
  - [Get State Snapshot](#get-state-snapshot)
  - [Get Latest Snapshot](#get-latest-snapshot)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)

---

## Authentication

Currently, the API does not require authentication. In production environments, implement appropriate authentication mechanisms (e.g., API keys, JWT tokens).

---

## Endpoints

### Health Check

Check if the API server is running and responsive.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T10:30:00.000Z",
  "services": {
    "redis": "connected",
    "mongodb": "connected"
  }
}
```

**Status Codes:**
- `200 OK`: All services are healthy
- `503 Service Unavailable`: One or more services are unhealthy

**Example:**
```bash
curl http://localhost:3000/api/health
```

---

### Get Complete State

Retrieve the complete current state of the city digital twin.

**Endpoint:** `GET /state`

**Response:**
```json
{
  "cityId": "laquila",
  "timestamp": "2024-12-08T10:30:00.000Z",
  "metadata": {
    "name": "L'Aquila",
    "version": "1.0.0",
    "lastUpdated": "2024-12-08T10:30:00.000Z"
  },
  "districts": [...],
  "vehicles": [...],
  "cityGraph": {...}
}
```

**Status Codes:**
- `200 OK`: State retrieved successfully
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state
```

---

### Get Districts

Retrieve all districts in the city.

**Endpoint:** `GET /state/districts`

**Response:**
```json
[
  {
    "districtId": "district-roio",
    "name": "District district-roio",
    "location": {
      "centerLatitude": 42.333603,
      "centerLongitude": 13.362390,
      "boundaries": {
        "north": 42.35,
        "south": 42.31,
        "east": 13.40,
        "west": 13.32
      }
    },
    "sensors": [...],
    "buildings": [...],
    "weatherStations": [...],
    "gateways": [
      {
        "gatewayId": "GW-00012",
        "name": "Gateway GW-00012 (230 edges)",
        "location": {
          "latitude": 42.333603,
          "longitude": 13.362390
        },
        "lastUpdated": "2025-12-21T10:30:00.000Z",
        "metadata": {
          "name": "Gateway GW-00012 (230 edges)",
          "version": "1.0.0",
          "firmware": "EdgeOS 2.1.3",
          "sensorCounts": {
            "speed": 230,
            "weather": 5,
            "camera": 46
          }
        },
        "sensors": [
          {
            "sensorId": "speed-E-00100",
            "sensorType": "speed",
            "gatewayId": "GW-00012",
            "edgeId": "E-00100",
            "latitude": 42.3345,
            "longitude": 13.3678,
            "unit": "km/h",
            "status": "active",
            "speedKmh": 45.5
          }
        ]
      }
    ]
  }
]
```

**Status Codes:**
- `200 OK`: Districts retrieved successfully
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/districts
```

---

### Get District by ID

Retrieve a specific district by its ID.

**Endpoint:** `GET /state/districts/:id`

**Parameters:**
- `id` (path parameter): District identifier

**Response:**
```json
{
  "districtId": "district-roio",
  "name": "District district-roio",
  "location": {
    "centerLatitude": 42.333603,
    "centerLongitude": 13.362390,
    "boundaries": {
      "north": 42.35,
      "south": 42.31,
      "east": 13.40,
      "west": 13.32
    }
  },
  "sensors": [...],
  "buildings": [...],
  "weatherStations": [...],
  "gateways": [
    {
      "gatewayId": "GW-00012",
      "name": "Gateway GW-00012 (230 edges)",
      "location": {
        "latitude": 42.333603,
        "longitude": 13.362390
      },
      "metadata": {
        "sensorCounts": {
          "speed": 230,
          "weather": 5,
          "camera": 46
        }
      },
      "sensors": [...]
    }
  ]
}
```

**Status Codes:**
- `200 OK`: District retrieved successfully
- `404 Not Found`: District not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/districts/district-roio
```

---

### Get District Sensors

Retrieve all sensors for a specific district.

**Endpoint:** `GET /state/districts/:districtId/sensors`

**Parameters:**
- `districtId` (path parameter): District identifier

**Response:**
```json
[
  {
    "sensorId": "speed-E-00100",
    "type": "speed",
    "edgeId": "E-00100",
    "gatewayId": "GW-00012",
    "value": 45.67,
    "unit": "km/h",
    "status": "active",
    "location": {
      "latitude": 42.3506,
      "longitude": 13.3992
    },
    "lastUpdated": "2024-12-08T10:30:00.000Z",
    "metadata": {
      "avgSpeed": 45.67,
      "sensorCount": 2
    }
  }
]
```

**Status Codes:**
- `200 OK`: Sensors retrieved successfully
- `404 Not Found`: District not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/districts/district-roio/sensors
```

---

### Get District Buildings

Retrieve all buildings for a specific district.

**Endpoint:** `GET /state/districts/:districtId/buildings`

**Parameters:**
- `districtId` (path parameter): District identifier

**Response:**
```json
[
  {
    "buildingId": "B-001",
    "name": "Municipal Building",
    "type": "government",
    "location": {
      "latitude": 42.3498,
      "longitude": 13.3995,
      "address": "Via XX Settembre, L'Aquila",
      "altitudeM": 721
    },
    "status": "operational",
    "lastUpdated": "2024-12-08T10:30:00.000Z",
    "airQuality": [...],
    "acoustic": [...],
    "displays": [...],
    "managedResources": {
      "emergencyExits": [...],
      "elevators": [...]
    }
  }
]
```

**Status Codes:**
- `200 OK`: Buildings retrieved successfully
- `404 Not Found`: District not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/districts/district-roio/buildings
```

---

### Get District Weather

Retrieve all weather stations for a specific district.

**Endpoint:** `GET /state/districts/:districtId/weather`

**Parameters:**
- `districtId` (path parameter): District identifier

**Response:**
```json
[
  {
    "stationId": "WS-001",
    "name": "Weather Station WS-001",
    "edgeId": "E-00100",
    "gatewayId": "GW-00012",
    "location": {
      "latitude": 42.3498,
      "longitude": 13.3995,
      "elevation": 721
    },
    "readings": {
      "temperature": 15.5,
      "humidity": 65,
      "weatherConditions": "clear",
      "units": {
        "temperature": "C",
        "humidity": "%"
      }
    },
    "status": "active",
    "lastUpdated": "2024-12-08T10:30:00.000Z"
  }
]
```

**Status Codes:**
- `200 OK`: Weather stations retrieved successfully
- `404 Not Found`: District not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/districts/district-roio/weather
```

---

### Get City Graph

Retrieve the road network graph for the entire city.

**Endpoint:** `GET /state/graph`

**Response:**
```json
{
  "nodes": [
    {
      "nodeId": "N-00001",
      "type": "intersection",
      "name": "Intersection N-00001",
      "location": {
        "latitude": 42.3498,
        "longitude": 13.3995
      },
      "trafficLight": {
        "status": "green",
        "timeRemaining": 30,
        "cycleTime": 90
      }
    }
  ],
  "edges": [
    {
      "edgeId": "E-00001",
      "roadSegmentId": "RS-001",
      "name": "Road E-00001",
      "fromNode": "N-00001",
      "toNode": "N-00002",
      "geometry": {
        "type": "LineString",
        "coordinates": [[13.3995, 42.3498], [13.4010, 42.3505]]
      },
      "distance": 150.5,
      "speedLimit": 50,
      "lanes": 2,
      "direction": "bidirectional",
      "trafficConditions": {
        "averageSpeed": 35,
        "congestionLevel": "moderate",
        "vehicleCount": 15,
        "travelTime": 15.5,
        "incidents": []
      },
      "lastUpdated": "2024-12-08T10:30:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Graph retrieved successfully
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/graph
```

---

### Get Buildings

**Note:** This endpoint is not implemented. Buildings are accessed through district-specific endpoints.

Use instead:
- `GET /state/districts/:districtId/buildings` - Get buildings for a specific district
- `GET /state/districts` - Get all districts with their buildings

**Status Codes:**
- `404 Not Found`: Endpoint not available

---

### Get Sensors

**Note:** This endpoint is not implemented. Sensors are accessed through district-specific endpoints.

Use instead:
- `GET /state/districts/:districtId/sensors` - Get sensors for a specific district
- `GET /state/districts` - Get all districts with their sensors

**Status Codes:**
- `404 Not Found`: Endpoint not available

---

### Get Vehicles

Retrieve all vehicles data including ambulances, fire trucks, police vehicles, and other monitored vehicles.

**Endpoint:** `GET /state/vehicles`

**Response:**
```json
[
  {
    "vehicleId": "ambulance-001",
    "type": "ambulance",
    "lastUpdated": "2025-12-21T10:30:00.000Z",
    "gpsPosition": {
      "latitude": 42.3498,
      "longitude": 13.3995,
      "altitudeM": 721
    },
    "movement": {
      "speedKmh": 45.5,
      "directionDegrees": 180,
      "heading": "south"
    },
    "managedResources": {
      "batteryLevelPercent": 85,
      "firmwareVersion": "v2.1.0"
    },
    "sensors": {
      "accelerometer": {
        "sensorId": "accel-ambulance-001",
        "incidentDetected": false,
        "thresholdG": 3.5,
        "lastReadingTimestamp": "2025-12-21T10:30:00.000Z"
      }
    },
    "routePlanning": {
      "currentDestination": {
        "latitude": 42.3512,
        "longitude": 13.4001,
        "locationName": "San Salvatore Hospital"
      },
      "predictedDestinations": [],
      "routePriority": "emergency"
    }
  }
]
```

**Status Codes:**
- `200 OK`: Vehicles retrieved successfully
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl http://localhost:3000/api/state/vehicles
```

---

### Get State Snapshot

Retrieve a specific historical state snapshot by ID.

**Endpoint:** `GET /snapshots/:id`

**Parameters:**
- `id` (path parameter): Snapshot identifier

**Response:**
```json
{
  "snapshot": {
    "_id": "snapshot-id",
    "state": {...},
    "timestamp": "2024-12-08T10:00:00.000Z",
    "version": 1
  }
}
```

**Status Codes:**
- `200 OK`: Snapshot retrieved successfully
- `404 Not Found`: Snapshot not found
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl http://localhost:3000/api/snapshots/snapshot-id
```

---

### Get Latest Snapshot

Retrieve the most recent state snapshot.

**Endpoint:** `GET /snapshots/latest`

**Response:**
```json
{
  "snapshot": {
    "_id": "snapshot-id",
    "state": {...},
    "timestamp": "2024-12-08T10:30:00.000Z",
    "version": 1
  }
}
```

**Status Codes:**
- `200 OK`: Latest snapshot retrieved successfully
- `404 Not Found`: No snapshots available
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl http://localhost:3000/api/snapshots/latest
```

---

## Data Models

### City State
```typescript
interface CityState {
  cityId: string;
  timestamp: string;
  metadata: CityMetadata;
  districts: District[];
  vehicles: Vehicle[];
  cityGraph: CityGraph;
}

interface CityMetadata {
  name: string;
  version: string;
  lastUpdated: string;
}
```

### Vehicle (from vehicles-simulator)
```typescript
interface Vehicle {
  vehicleId: string;
  type: string;                    // 'ambulance' | 'fire_truck' | 'police' | 'taxi' | etc.
  lastUpdated: string;
  gpsPosition: {
    latitude: number;
    longitude: number;
    altitudeM: number;
  };
  movement: {
    speedKmh: number;
    directionDegrees: number;
    heading: string;               // 'north' | 'south' | 'east' | 'west' | etc.
  };
  managedResources: {
    batteryLevelPercent: number;
    firmwareVersion: string;
  };
  sensors: {
    accelerometer: {
      sensorId: string;
      incidentDetected: boolean;
      thresholdG: number;
      lastReadingTimestamp: string;
    };
  };
  routePlanning: {
    currentDestination?: {
      latitude: number;
      longitude: number;
      locationName: string;
    };
    predictedDestinations: Array<{
      latitude: number;
      longitude: number;
      locationName: string;
      etaMinutes: number;
      probability: number;
    }>;
    routePriority: string;        // 'normal' | 'high' | 'emergency'
  };
}
```

### District
```typescript
interface District {
  districtId: string;
  name: string;
  location: {
    centerLatitude: number;
    centerLongitude: number;
    boundaries: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  sensors: Sensor[];              // Flattened list of all sensors (for backwards compatibility)
  buildings: Building[];
  weatherStations: WeatherStation[];
  gateways: Gateway[];            // Gateways that collect sensor data in this district
}
```

### Gateway (from city-simulator)
```typescript
// A Gateway is a physical data collector in an area that hosts multiple sensors.
// Each gateway aggregates sensor data from multiple graph edges and sends it as a unified payload.
interface Gateway {
  gatewayId: string;              // Unique gateway identifier (e.g., "GW-00012")
  name: string;                   // Human-readable name (e.g., "Gateway GW-00012 (230 edges)")
  location: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: string;
  metadata: {
    name: string;
    version: string;              // Gateway software version
    firmware: string;             // Gateway firmware version
    sensorCounts: {
      speed: number;              // Number of speed sensors
      weather: number;            // Number of weather sensors
      camera: number;             // Number of camera sensors
    };
  };
  sensors: GatewaySensor[];       // All sensors managed by this gateway
}

// Sensor data as reported by a gateway
interface GatewaySensor {
  sensorId: string;
  sensorType: string;             // 'speed' | 'weather' | 'camera'
  gatewayId: string;              // Gateway that collected this data
  edgeId: string;                 // Graph edge ID (E-00000 to E-03458) where sensor is located
  latitude: number;
  longitude: number;
  unit: string;
  status: string;
  // Speed sensor fields
  speedKmh?: number;
  // Weather sensor fields
  temperatureC?: number;
  humidity?: number;
  weatherConditions?: string;     // 'clear' | 'cloudy' | 'rainy' | 'foggy' | 'snowy'
  // Camera sensor fields
  roadCondition?: string;         // 'clear' | 'congestion' | 'accident' | 'obstacles' | 'flooding'
  confidence?: number;            // 0.0 - 1.0
  vehicleCount?: number;
}
```

### Sensor (from city-simulator)
```typescript
// Flattened sensor data (extracted from gateways for backwards compatibility)
interface Sensor {
  sensorId: string;
  type: 'speed' | 'camera' | string;  // Types from city-simulator
  edgeId?: string;                     // Edge ID from city-simulator
  gatewayId?: string;                  // Gateway ID that collected this sensor data
  value: number;
  unit: string;                        // 'km/h' for speed, 'vehicles' for camera
  status: 'active' | 'inactive' | 'error' | 'degraded';
  lastUpdated: string;
  location?: {
    latitude: number;
    longitude: number;
    elevation?: number;
  };
  metadata?: SensorMetadata;
}

// Metadata varies by sensor type
interface SensorMetadata {
  // Speed sensor metadata
  avgSpeed?: number;
  sensorCount?: number;
  readings?: SpeedSensorReading[] | CameraSensorReading[];
  
  // Camera sensor metadata
  roadCondition?: string;    // 'clear' | 'congestion' | 'accident' | 'obstacles' | 'flooding'
  confidence?: number;       // 0.0 - 1.0
  vehicleCount?: number;
  congestionStatus?: string; // 'free_flow' | 'congested' | 'blocked' | 'slow'
}


interface SpeedSensorReading {
  sensor_id: string;
  speed_kmh: number;
  latitude: number;
  longitude: number;
}

interface CameraSensorReading {
  sensor_id: string;
  road_condition: string;
  confidence: number;
  vehicle_count: number;
  latitude: number;
  longitude: number;
}
```

### Weather Station (from city-simulator)
```typescript
interface WeatherStation {
  stationId: string;
  name: string;
  edgeId?: string;          // Edge ID from city-simulator
  gatewayId?: string;       // Gateway ID that collected this sensor data
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  readings: {
    temperature: number;    // Celsius
    humidity: number;       // Percentage
    weatherConditions?: string;  // 'clear' | 'cloudy' | 'rainy' | 'foggy' | 'snowy'
    pressure: number;       // hPa
    windSpeed: number;      // m/s
    windDirection: number;  // degrees
    precipitation: number;  // mm
    cloudCover: number;     // percentage
    visibility: number;     // meters
    uvIndex: number;
    units: {
      temperature: string;
      humidity: string;
      pressure: string;
      windSpeed: string;
      windDirection: string;
      precipitation: string;
      cloudCover: string;
      visibility: string;
    };
  };
  status: string;
  lastUpdated: string;
  metadata?: {
    sensorCount: number;
    readings: WeatherSensorReading[];
  };
}

interface WeatherSensorReading {
  sensor_id: string;
  temperature_c: number;
  humidity: number;
  latitude: number;
  longitude: number;
}
```

### Building
```typescript
interface Building {
  buildingId: string;
  name: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  floors: number;
  totalCapacity: number;
  currentOccupancy: number;
  occupancyRate: number;
  sensors: Sensor[];
  status: string;
}
```

### City Graph
```typescript
interface CityGraph {
  nodes: Node[];
  edges: Edge[];
}

interface Node {
  nodeId: string;
  type: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  trafficLight?: TrafficLight;
}

interface Edge {
  edgeId: string;
  roadSegmentId: string;
  name: string;
  fromNode: string;
  toNode: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  distance: number;
  speedLimit: number;
  lanes: number;
  direction: string;
  trafficConditions?: TrafficConditions;
  lastUpdated: string;
}

interface TrafficConditions {
  averageSpeed: number;
  congestionLevel: string;
  vehicleCount: number;
  travelTime: number;
  incidents: Incident[];
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message description"
}
```

### Common Error Codes

- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Server-side error occurred

### Error Response Examples

**District Not Found:**
```json
{
  "error": "District not found"
}
```

**No State Available:**
```json
{
  "error": "No state available"
}
```

---

## Integration Examples

### JavaScript (Fetch API)

```javascript
// Get complete state
async function getCompleteState() {
  try {
    const response = await fetch('http://localhost:3000/api/state');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching state:', error);
    throw error;
  }
}

// Get specific district
async function getDistrict(districtId) {
  const response = await fetch(`http://localhost:3000/api/state/districts/${districtId}`);
  return response.json();
}

// Get sensors
async function getSensors() {
  const response = await fetch('http://localhost:3000/api/state/sensors');
  return response.json();
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useCityState() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchState() {
      try {
        const response = await fetch('http://localhost:3000/api/state');
        const data = await response.json();
        setState(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return { state, loading, error };
}
```

### Python Example

```python
import requests

BASE_URL = "http://localhost:3000/api"

def get_complete_state():
    """Get the complete city state"""
    response = requests.get(f"{BASE_URL}/state")
    response.raise_for_status()
    return response.json()

def get_district(district_id):
    """Get a specific district"""
    response = requests.get(f"{BASE_URL}/state/districts/{district_id}")
    response.raise_for_status()
    return response.json()

def get_sensors():
    """Get all sensors"""
    response = requests.get(f"{BASE_URL}/state/sensors")
    response.raise_for_status()
    return response.json()

# Usage
try:
    state = get_complete_state()
    print(f"City: {state['city']['name']}")
    print(f"Districts: {len(state['city']['districts'])}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
```

### cURL Examples

```bash
# Health check
curl http://localhost:3000/api/health

# Get complete state
curl http://localhost:3000/api/state

# Get specific district
curl http://localhost:3000/api/state/districts/district-1

# Get city graph
curl http://localhost:3000/api/state/graph

# Get all sensors
curl http://localhost:3000/api/state/sensors

# Get all vehicles
curl http://localhost:3000/api/state/vehicles

# Get latest snapshot
curl http://localhost:3000/api/snapshots/latest
```

---

## WebSocket Alternative

For real-time updates, consider using the WebSocket endpoint instead of polling:

**WebSocket URL:** `ws://localhost:3000`

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('State update:', update);
};
```

---
