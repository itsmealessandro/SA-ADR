// Utility functions to convert Digital Twin state to GeoJSON

/**
 * Generate GeoJSON FeatureCollection for district boundaries
 * @param {Array} districts - Array of district objects from digital twin
 * @returns {Object} GeoJSON FeatureCollection
 */
function generateDistrictGeoJSON(districts) {
  return {
    "type": "FeatureCollection",
    "features": districts.map(district => ({
      "type": "Feature",
      "properties": {
        "districtId": district.districtId,
        "name": district.name,
        "centerLatitude": district.location.centerLatitude,
        "centerLongitude": district.location.centerLongitude
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [district.location.boundaries.west, district.location.boundaries.north],
          [district.location.boundaries.east, district.location.boundaries.north],
          [district.location.boundaries.east, district.location.boundaries.south],
          [district.location.boundaries.west, district.location.boundaries.south],
          [district.location.boundaries.west, district.location.boundaries.north]
        ]]
      }
    }))
  };
}

/**
 * Generate GeoJSON FeatureCollection for roads with traffic congestion
 * @param {Array} edges - Array of edge objects from cityGraph
 * @returns {Object} GeoJSON FeatureCollection with congestion styling
 */
function generateRoadCongestionGeoJSON(edges) {
  return {
    "type": "FeatureCollection",
    "features": edges.map(edge => ({
      "type": "Feature",
      "properties": {
        "edgeId": edge.edgeId,
        "roadSegmentId": edge.roadSegmentId,
        "name": edge.name,
        "fromNode": edge.fromNode,
        "toNode": edge.toNode,
        "distance": edge.distance,
        "speedLimit": edge.speedLimit,
        "lanes": edge.lanes,
        "direction": edge.direction,
        // Traffic data
        "averageSpeed": edge.trafficConditions.averageSpeed,
        "congestionLevel": edge.trafficConditions.congestionLevel,
        "vehicleCount": edge.trafficConditions.vehicleCount,
        "travelTime": edge.trafficConditions.travelTime,
        "hasIncidents": edge.trafficConditions.incidents.length > 0,
        "incidentCount": edge.trafficConditions.incidents.length,
        // Color coding for congestion
        "strokeColor": getCongestionColor(edge.trafficConditions.congestionLevel),
        "strokeWidth": getCongestionWidth(edge.trafficConditions.congestionLevel),
        "lastUpdated": edge.lastUpdated
      },
      "geometry": edge.geometry
    }))
  };
}

/**
 * Generate GeoJSON FeatureCollection for all sensors
 * @param {Array} districts - Array of district objects from digital twin
 * @returns {Object} GeoJSON FeatureCollection
 */
function generateSensorGeoJSON(districts) {
  const features = [];
  
  districts.forEach(district => {
    district.sensors.forEach(sensor => {
      features.push({
        "type": "Feature",
        "properties": {
          "sensorId": sensor.sensorId,
          "type": sensor.type,
          "value": sensor.value,
          "unit": sensor.unit,
          "status": sensor.status,
          "districtId": district.districtId,
          "districtName": district.name,
          "lastUpdated": sensor.lastUpdated,
          // For traffic cameras, include metadata
          ...(sensor.metadata && {
            "avgSpeed": sensor.metadata.avgSpeed,
            "vehicleCount": sensor.metadata.vehicleCount,
            "congestionStatus": sensor.metadata.congestionStatus
          })
        },
        "geometry": {
          "type": "Point",
          "coordinates": [sensor.location.longitude, sensor.location.latitude]
        }
      });
    });
  });
  
  return {
    "type": "FeatureCollection",
    "features": features
  };
}

/**
 * Generate GeoJSON FeatureCollection for buildings
 * @param {Array} districts - Array of district objects from digital twin
 * @returns {Object} GeoJSON FeatureCollection
 */
function generateBuildingGeoJSON(districts) {
  const features = [];
  
  districts.forEach(district => {
    district.buildings.forEach(building => {
      features.push({
        "type": "Feature",
        "properties": {
          "buildingId": building.buildingId,
          "name": building.name,
          "type": building.type,
          "floors": building.floors,
          "totalCapacity": building.totalCapacity,
          "currentOccupancy": building.currentOccupancy,
          "occupancyRate": building.occupancyRate,
          "status": building.status,
          "districtId": district.districtId,
          "districtName": district.name,
          "address": building.location.address
        },
        "geometry": {
          "type": "Point",
          "coordinates": [building.location.longitude, building.location.latitude]
        }
      });
    });
  });
  
  return {
    "type": "FeatureCollection",
    "features": features
  };
}

/**
 * Generate GeoJSON FeatureCollection for weather stations
 * @param {Array} districts - Array of district objects from digital twin
 * @returns {Object} GeoJSON FeatureCollection
 */
function generateWeatherStationGeoJSON(districts) {
  const features = [];
  
  districts.forEach(district => {
    district.weatherStations.forEach(station => {
      features.push({
        "type": "Feature",
        "properties": {
          "stationId": station.stationId,
          "name": station.name,
          "temperature": station.readings.temperature,
          "humidity": station.readings.humidity,
          "pressure": station.readings.pressure,
          "windSpeed": station.readings.windSpeed,
          "windDirection": station.readings.windDirection,
          "precipitation": station.readings.precipitation,
          "cloudCover": station.readings.cloudCover,
          "visibility": station.readings.visibility,
          "uvIndex": station.readings.uvIndex,
          "districtId": district.districtId,
          "districtName": district.name,
          "status": station.status,
          "lastUpdated": station.lastUpdated
        },
        "geometry": {
          "type": "Point",
          "coordinates": [station.location.longitude, station.location.latitude]
        }
      });
    });
  });
  
  return {
    "type": "FeatureCollection",
    "features": features
  };
}

/**
 * Get color based on congestion level
 * @param {string} congestionLevel - Congestion level (light, moderate, heavy)
 * @returns {string} Hex color code
 */
function getCongestionColor(congestionLevel) {
  const colors = {
    "light": "#4CAF50",      // Green
    "moderate": "#FFC107",    // Yellow/Orange
    "heavy": "#F44336"        // Red
  };
  return colors[congestionLevel] || "#9E9E9E"; // Gray as default
}

/**
 * Get line width based on congestion level
 * @param {string} congestionLevel - Congestion level (light, moderate, heavy)
 * @returns {number} Line width in pixels
 */
function getCongestionWidth(congestionLevel) {
  const widths = {
    "light": 3,
    "moderate": 5,
    "heavy": 7
  };
  return widths[congestionLevel] || 3;
}

/**
 * Master function to generate all GeoJSON layers from digital twin state
 * @param {Object} digitalTwinState - Complete digital twin state object
 * @returns {Object} Object containing all GeoJSON layers
 */
function generateAllGeoJSON(digitalTwinState) {
  return {
    districts: generateDistrictGeoJSON(digitalTwinState.districts),
    roads: generateRoadCongestionGeoJSON(digitalTwinState.cityGraph.edges),
    sensors: generateSensorGeoJSON(digitalTwinState.districts),
    buildings: generateBuildingGeoJSON(digitalTwinState.districts),
    weatherStations: generateWeatherStationGeoJSON(digitalTwinState.districts)
  };
}

// Example usage with Leaflet.js
const leafletExample = `
// Load the digital twin state
fetch('city-digital-twin.json')
  .then(response => response.json())
  .then(digitalTwinState => {
    // Generate GeoJSON layers
    const geoJsonLayers = generateAllGeoJSON(digitalTwinState);
    
    // Initialize Leaflet map
    const map = L.map('map').setView([40.7128, -74.0060], 13);
    
    // Add base map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add district boundaries
    L.geoJSON(geoJsonLayers.districts, {
      style: {
        color: '#2196F3',
        weight: 2,
        fillOpacity: 0.1
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(\`<b>\${feature.properties.name}</b><br>ID: \${feature.properties.districtId}\`);
      }
    }).addTo(map);
    
    // Add roads with congestion coloring
    L.geoJSON(geoJsonLayers.roads, {
      style: (feature) => ({
        color: feature.properties.strokeColor,
        weight: feature.properties.strokeWidth,
        opacity: 0.8
      }),
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(\`
          <b>\${props.name}</b><br>
          Congestion: \${props.congestionLevel}<br>
          Avg Speed: \${props.averageSpeed} km/h<br>
          Vehicles: \${props.vehicleCount}<br>
          Travel Time: \${props.travelTime} min
          \${props.hasIncidents ? '<br><span style="color:red">⚠️ Incident</span>' : ''}
        \`);
      }
    }).addTo(map);
    
    // Add sensors as markers
    L.geoJSON(geoJsonLayers.sensors, {
      pointToLayer: (feature, latlng) => {
        const icon = getSensorIcon(feature.properties.type);
        return L.marker(latlng, { icon: icon });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(\`
          <b>\${props.type}</b><br>
          ID: \${props.sensorId}<br>
          Value: \${props.value} \${props.unit}<br>
          District: \${props.districtName}
        \`);
      }
    }).addTo(map);
    
    // Add buildings
    L.geoJSON(geoJsonLayers.buildings, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#FF6F00',
          color: '#FFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(\`
          <b>\${props.name}</b><br>
          Type: \${props.type}<br>
          Occupancy: \${props.currentOccupancy}/\${props.totalCapacity} (\${(props.occupancyRate * 100).toFixed(1)}%)<br>
          Floors: \${props.floors}
        \`);
      }
    }).addTo(map);
  });

function getSensorIcon(sensorType) {
  // Return appropriate Leaflet icon based on sensor type
  const iconColors = {
    'trafficCamera': 'blue',
    'pm25': 'purple',
    'noise': 'orange',
    'vehicleCount': 'green',
    'parkingOccupancy': 'red'
  };
  
  return L.divIcon({
    className: 'sensor-icon',
    html: \`<div style="background: \${iconColors[sensorType] || 'gray'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>\`
  });
}
`;

// Example usage with Mapbox GL JS
const mapboxExample = `
// Load the digital twin state
fetch('city-digital-twin.json')
  .then(response => response.json())
  .then(digitalTwinState => {
    const geoJsonLayers = generateAllGeoJSON(digitalTwinState);
    
    mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN';
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.0060, 40.7128],
      zoom: 13
    });
    
    map.on('load', () => {
      // Add district boundaries
      map.addSource('districts', {
        type: 'geojson',
        data: geoJsonLayers.districts
      });
      
      map.addLayer({
        id: 'district-fills',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': '#2196F3',
          'fill-opacity': 0.1
        }
      });
      
      map.addLayer({
        id: 'district-borders',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#2196F3',
          'line-width': 2
        }
      });
      
      // Add roads with congestion-based coloring
      map.addSource('roads', {
        type: 'geojson',
        data: geoJsonLayers.roads
      });
      
      map.addLayer({
        id: 'road-congestion',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': ['get', 'strokeWidth'],
          'line-opacity': 0.8
        }
      });
      
      // Add click interaction for roads
      map.on('click', 'road-congestion', (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(\`
            <h3>\${props.name}</h3>
            <p>Congestion: <strong>\${props.congestionLevel}</strong></p>
            <p>Avg Speed: \${props.averageSpeed} km/h</p>
            <p>Vehicles: \${props.vehicleCount}</p>
            <p>Travel Time: \${props.travelTime} min</p>
          \`)
          .addTo(map);
      });
      
      // Add sensors
      map.addSource('sensors', {
        type: 'geojson',
        data: geoJsonLayers.sensors
      });
      
      map.addLayer({
        id: 'sensor-points',
        type: 'circle',
        source: 'sensors',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'type'],
            'trafficCamera', '#2196F3',
            'pm25', '#9C27B0',
            'noise', '#FF9800',
            'vehicleCount', '#4CAF50',
            'parkingOccupancy', '#F44336',
            '#9E9E9E'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFF'
        }
      });
    });
  });
`;

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateDistrictGeoJSON,
    generateRoadCongestionGeoJSON,
    generateSensorGeoJSON,
    generateBuildingGeoJSON,
    generateWeatherStationGeoJSON,
    generateAllGeoJSON,
    getCongestionColor,
    getCongestionWidth,
    leafletExample,
    mapboxExample
  };
}
