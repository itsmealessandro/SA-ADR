#!/usr/bin/env python3
"""
City Simulator - Emergency Management System

Main entry point for the L'Aquila Emergency Management System simulator.

Architecture:
- Loads city configuration from JSON (districts, simulation settings)
- Creates a configurable number of gateways per instance
- Each gateway manages sensors spread across MULTIPLE city graph edges (E-00000 to E-03458)
- Sensors have individual edge_id based on which graph edge they monitor
- Supports horizontal scaling via INSTANCE_ID and TOTAL_INSTANCES env vars

Key Concepts:
- Gateway: Physical device that collects/aggregates sensor data in an area
- Edge (city graph): Road segment identified by E-XXXXX (E-00000 to E-03458)
- Sensor: Individual monitoring device placed on a specific graph edge

Horizontal Scaling:
- INSTANCE_ID: Current instance (0, 1, 2, ..., N-1)
- TOTAL_INSTANCES: Total number of instances
- Each instance creates `gateways_per_instance` gateways
- Edges are partitioned across all gateways in the system

Example with 3 instances, 5 gateways each (15 total gateways):
- 3459 edges / 15 gateways ≈ 231 edges per gateway
- Gateway GW-00000 monitors sensors on edges E-00000 to E-00230
- Gateway GW-00001 monitors sensors on edges E-00231 to E-00461
- etc.
"""

import json
import logging
import os
import random
import sys
import threading
import time
from typing import Any, Dict, List, Tuple

# Add parent directory to path to import common module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import common utilities
from common.kafka_utils import create_kafka_producer
# Import our modular components
from edge_manager import EdgeManager

# Initial logging configuration (will be updated from config)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(threadName)s] - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables for configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPICS = {
    'gateway': os.getenv('KAFKA_TOPIC_GATEWAY', 'city-gateway-data')
}
CITY_CONFIG_FILE = os.getenv('CITY_CONFIG_FILE', 
                              os.path.join(os.path.dirname(__file__), 'config', 'city_config.json'))
CITY_GRAPH_FILE = os.getenv('CITY_GRAPH_FILE',
                             os.path.join(os.path.dirname(__file__), 'config', 'laquila-city-graph-overture.json'))

# Horizontal scaling configuration
INSTANCE_ID = int(os.getenv('INSTANCE_ID', '0'))
TOTAL_INSTANCES = int(os.getenv('TOTAL_INSTANCES', '1'))

# Global graph data cache
_GRAPH_DATA = None
_EDGE_COORDS_MAP = None


def load_city_graph() -> Dict[str, Dict[str, float]]:
    """
    Load city graph from JSON file and build edge coordinate map.
    Uses global cache to avoid reloading.
    
    Returns:
        Dict mapping edge_id to {latitude, longitude} for O(1) lookups
    """
    global _GRAPH_DATA, _EDGE_COORDS_MAP
    
    if _EDGE_COORDS_MAP is not None:
        return _EDGE_COORDS_MAP
    
    try:
        logger.info(f"Loading city graph from {CITY_GRAPH_FILE}...")
        with open(CITY_GRAPH_FILE, 'r', encoding='utf-8') as f:
            _GRAPH_DATA = json.load(f)
        
        # Build edge coordinate map for fast O(1) lookups
        _EDGE_COORDS_MAP = {}
        edges = _GRAPH_DATA.get('edges', [])
        
        for edge in edges:
            edge_id = edge.get('edgeId')
            geometry = edge.get('geometry', {})
            coordinates = geometry.get('coordinates', [])
            
            if edge_id and coordinates and len(coordinates) > 0:
                # Get first point: [longitude, latitude]
                lon, lat = coordinates[0]
                _EDGE_COORDS_MAP[edge_id] = {'latitude': lat, 'longitude': lon}
        
        edge_count = len(_EDGE_COORDS_MAP)
        node_count = len(_GRAPH_DATA.get('nodes', []))
        logger.info(f"✓ Loaded city graph: {node_count} nodes, {edge_count} edges with coordinates")
        return _EDGE_COORDS_MAP
    except FileNotFoundError:
        logger.error(f"✗ City graph file not found: {CITY_GRAPH_FILE}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"✗ Invalid JSON in city graph file: {e}")
        raise


def get_edge_coordinates(edge_id: str, edge_coords_map: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    """
    Get coordinates for a specific edge from the pre-built map.
    
    Args:
        edge_id: Edge ID in format E-XXXXX
        edge_coords_map: Pre-built map of edge_id -> {latitude, longitude}
        
    Returns:
        Dict with 'latitude' and 'longitude', or None if edge not found
    """
    coords = edge_coords_map.get(edge_id)
    
    if coords is None:
        logger.warning(f"Edge {edge_id} not found in graph, using fallback coordinates")
    
    return coords


def load_city_config() -> Dict[str, Any]:
    """
    Load city configuration from JSON file.
    
    Returns:
        Dict with complete city configuration
    """
    try:
        with open(CITY_CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"✓ Loaded city configuration: {config['city']['name']}")
        return config
    except FileNotFoundError:
        logger.error(f"✗ City configuration file not found: {CITY_CONFIG_FILE}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"✗ Invalid JSON in city configuration file: {e}")
        raise


def generate_edge_id(index: int) -> str:
    """Generate city graph edge ID in format E-XXXXX."""
    return f"E-{index:05d}"


def generate_gateway_id(gateway_index: int) -> str:
    """Generate gateway ID in format GW-XXXXX."""
    return f"GW-{gateway_index:05d}"


def find_district_for_edge(districts: List[Dict], edge_index: int) -> Dict:
    """
    Find which district an edge belongs to based on edge ranges.
    
    Args:
        districts: List of district configurations with edge_range
        edge_index: Edge index (0-3458)
        
    Returns:
        District configuration dict, or first district as fallback
    """
    for district in districts:
        edge_range = district.get('edge_range', {})
        start = edge_range.get('start', 0)
        end = edge_range.get('end', 0)
        if start <= edge_index <= end:
            return district
    return districts[0] if districts else None


def calculate_gateway_edge_range(
    total_edges: int,
    total_gateways: int,
    gateway_global_index: int
) -> Tuple[int, int]:
    """
    Calculate which city graph edges a gateway is responsible for.
    
    Distributes edges evenly across all gateways in the system.
    
    Args:
        total_edges: Total number of city graph edges (3459)
        total_gateways: Total gateways across all instances
        gateway_global_index: This gateway's global index (0 to total_gateways-1)
        
    Returns:
        Tuple of (start_edge_index, end_edge_index) inclusive
    """
    edges_per_gateway = total_edges // total_gateways
    remainder = total_edges % total_gateways
    
    if gateway_global_index < remainder:
        start = gateway_global_index * (edges_per_gateway + 1)
        end = start + edges_per_gateway
    else:
        start = gateway_global_index * edges_per_gateway + remainder
        end = start + edges_per_gateway - 1
    
    return start, min(end, total_edges - 1)


def generate_sensors_for_gateway(
    gateway_id: str,
    edge_start: int,
    edge_end: int,
    sensors_per_edge: Dict[str, int],
    gateway_location: Dict[str, float],
    weather_stations_count: int = 3,
    edge_coords_map: Dict[str, Dict[str, float]] = None
) -> Dict[str, List[Dict]]:
    """
    Generate sensor configurations for a gateway covering multiple edges.
    
    Each sensor is assigned to a specific city graph edge within the gateway's range.
    Weather stations are limited to a fixed number per gateway (they cover larger areas).
    Sensor coordinates are extracted from the actual city graph data.
    
    Args:
        gateway_id: The gateway ID (GW-XXXXX)
        edge_start: First edge index this gateway covers
        edge_end: Last edge index this gateway covers (inclusive)
        sensors_per_edge: Dict with sensor count per type per edge (excludes weather)
        gateway_location: Gateway's base location for calculating sensor positions
        weather_stations_count: Fixed number of weather stations per gateway
        edge_coords_map: Pre-built map of edge_id -> {latitude, longitude}
        
    Returns:
        Dict mapping sensor types to list of sensor configs with edge_id
    """
    sensors = {'speed': [], 'weather': [], 'camera': []}
    total_edges = edge_end - edge_start + 1
    
    # Generate weather stations (limited number, spread across gateway's edge range)
    if weather_stations_count > 0:
        # Distribute weather stations evenly across the edge range
        weather_edge_step = max(1, total_edges // weather_stations_count)
        for i in range(weather_stations_count):
            # Pick edges spread across the range
            weather_edge_index = edge_start + min(i * weather_edge_step, total_edges - 1)
            weather_edge_id = generate_edge_id(weather_edge_index)
            sensor_id = f"weather-{gateway_id}-{chr(97 + i)}"
            
            # Get coordinates from map if available, otherwise use offset
            edge_coords = get_edge_coordinates(weather_edge_id, edge_coords_map) if edge_coords_map else None
            
            if edge_coords:
                # Use exact edge coordinates
                offset_lat = 0.0
                offset_lon = 0.0
            else:
                # Fallback to offset-based positioning
                offset_factor = i / max(1, weather_stations_count - 1) if weather_stations_count > 1 else 0.5
                offset_lat = (offset_factor * 0.02 - 0.01) + random.uniform(-0.002, 0.002)
                offset_lon = (offset_factor * 0.02 - 0.01) + random.uniform(-0.002, 0.002)
            
            sensors['weather'].append({
                'sensor_id': sensor_id,
                'edge_id': weather_edge_id,
                'location': f"Weather station {i+1} near {weather_edge_id}",
                'offset_lat': round(offset_lat, 6),
                'offset_lon': round(offset_lon, 6),
                'base_location': edge_coords  # Store actual edge location if available
            })
    
    # Generate other sensors per edge (speed, camera, etc.)
    for edge_index in range(edge_start, edge_end + 1):
        edge_id = generate_edge_id(edge_index)
        
        # Get actual coordinates for this edge from the map (O(1) lookup)
        edge_coords = get_edge_coordinates(edge_id, edge_coords_map) if edge_coords_map else None
        
        for sensor_type, count in sensors_per_edge.items():
            # Skip weather - already handled above
            if sensor_type == 'weather':
                continue
                
            for i in range(count):
                sensor_id = f"{sensor_type}-{edge_id}-{chr(97 + i)}"
                
                # For cameras: MANDATORY to use exact edge coordinates
                # For other sensors: prefer edge coordinates, fallback to offset
                if sensor_type == 'camera' and edge_coords:
                    # Use exact edge coordinates for cameras (no offset)
                    offset_lat = 0.0
                    offset_lon = 0.0
                elif edge_coords:
                    # Use edge coordinates with small random offset for multiple sensors
                    offset_lat = random.uniform(-0.0001, 0.0001)
                    offset_lon = random.uniform(-0.0001, 0.0001)
                else:
                    # Fallback to calculated offset from gateway location
                    edge_offset = (edge_index - edge_start) / max(1, edge_end - edge_start)
                    offset_lat = random.uniform(-0.01, 0.01) + (edge_offset * 0.02 - 0.01)
                    offset_lon = random.uniform(-0.01, 0.01) + (edge_offset * 0.02 - 0.01)
                
                sensors[sensor_type].append({
                    'sensor_id': sensor_id,
                    'edge_id': edge_id,  # Each sensor knows which graph edge it monitors
                    'location': f"{sensor_type.capitalize()} on {edge_id}",
                    'offset_lat': round(offset_lat, 6),
                    'offset_lon': round(offset_lon, 6),
                    'base_location': edge_coords  # Store actual edge location if available
                })
    
    return sensors


class CitySimulator:
    """
    Main City Simulator with Horizontal Scaling Support
    
    Creates gateways that each manage sensors across multiple city graph edges.
    Supports splitting workload across multiple instances.
    """
    
    def __init__(self):
        """Initialize the city simulator."""
        self.city_config = load_city_config()
        self.city_name = self.city_config['city']['name']
        
        # Load city graph and build edge coordinate map for fast lookups
        self.edge_coords_map = load_city_graph()
        
        # Configuration
        self.graph_config = self.city_config.get('graph', {})
        self.simulation_config = self.city_config.get('simulation', {})
        
        # Gateway and sensor configuration
        self.gateways_per_instance = self.simulation_config.get('gateways_per_instance', 5)
        self.sampling_interval = self.simulation_config.get('sampling_interval_seconds', 3)
        self.sensors_per_edge = self.simulation_config.get('sensors_per_edge', {
            'speed': 1,
            'camera': 1
        })
        # Fallback to sensors_per_gateway if sensors_per_edge not defined
        if 'sensors_per_edge' not in self.simulation_config:
            self.sensors_per_edge = self.simulation_config.get('sensors_per_gateway', {
                'speed': 1,
                'camera': 1
            })
        # Total weather stations for the entire city (distributed across gateways)
        self.total_weather_stations = self.simulation_config.get('total_weather_stations', 15)
        
        # Apply logging configuration from config
        managed_resources = self.city_config.get('managed_resources', {})
        logging_config = managed_resources.get('logging', {})
        log_level = logging_config.get('level', 'INFO')
        logging.getLogger().setLevel(getattr(logging, log_level, logging.INFO))
        
        # Calculate totals
        self.total_edges = self.graph_config.get('total_edges', 3459)
        self.total_gateways = self.gateways_per_instance * TOTAL_INSTANCES
        
        # Calculate this instance's gateway range
        self.gateway_start = INSTANCE_ID * self.gateways_per_instance
        self.gateway_end = self.gateway_start + self.gateways_per_instance - 1
        
        # Initialize Kafka
        self.kafka_producer = self._init_kafka_producer()
        
        # Threading
        self.stop_event = threading.Event()
        self.gateways = []
        self.gateway_threads = []
        
        # Initialize gateways
        self._initialize_gateways()
        
        logger.info(f"✓ CitySimulator initialized for {self.city_name}")
        logger.info(f"  Instance: {INSTANCE_ID + 1} of {TOTAL_INSTANCES}")
        logger.info(f"  Gateways: {self.gateways_per_instance} (global: GW-{self.gateway_start:05d} to GW-{self.gateway_end:05d})")
        logger.info(f"  Total edges in city: {self.total_edges}")
        logger.info(f"  Edges per gateway: ~{self.total_edges // self.total_gateways}")
    
    def _init_kafka_producer(self):
        """Initialize Kafka producer."""
        producer = create_kafka_producer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            max_retries=10,
            retry_delay=5
        )
        logger.info(f"✓ Kafka producer ready (topics: {list(KAFKA_TOPICS.values())})")
        return producer
    
    def _initialize_gateways(self):
        """
        Initialize gateways for this instance.
        
        Each gateway manages sensors across a range of city graph edges.
        Weather stations are distributed across all gateways based on total_weather_stations.
        """
        districts = self.city_config.get('districts', [])
        
        # Calculate weather stations distribution across all gateways in the city
        # Each gateway gets a share based on its global index
        weather_stations_per_gateway = self.total_weather_stations // self.total_gateways
        weather_stations_remainder = self.total_weather_stations % self.total_gateways
        
        for local_idx in range(self.gateways_per_instance):
            gateway_global_idx = self.gateway_start + local_idx
            gateway_id = generate_gateway_id(gateway_global_idx)
            
            # Calculate weather stations for this specific gateway
            # First 'remainder' gateways get one extra station
            if gateway_global_idx < weather_stations_remainder:
                gateway_weather_count = weather_stations_per_gateway + 1
            else:
                gateway_weather_count = weather_stations_per_gateway
            
            # Calculate which edges this gateway covers
            edge_start, edge_end = calculate_gateway_edge_range(
                self.total_edges,
                self.total_gateways,
                gateway_global_idx
            )
            
            # Find primary district for this gateway (based on middle edge)
            middle_edge = (edge_start + edge_end) // 2
            district = find_district_for_edge(districts, middle_edge)
            district_id = district['district_id'] if district else 'district-unknown'
            district_center = district.get('center', {'latitude': 42.35, 'longitude': 13.40}) if district else {'latitude': 42.35, 'longitude': 13.40}
            
            # Gateway location (near district center with small offset)
            location = {
                'latitude': district_center['latitude'] + random.uniform(-0.005, 0.005),
                'longitude': district_center['longitude'] + random.uniform(-0.005, 0.005)
            }
            
            # Generate sensors for all edges this gateway covers
            sensors = generate_sensors_for_gateway(
                gateway_id,
                edge_start,
                edge_end,
                self.sensors_per_edge,
                location,
                gateway_weather_count,
                self.edge_coords_map
            )
            
            # Build gateway configuration
            gateway_config = {
                'gateway_id': gateway_id,
                'name': f"Gateway {gateway_id} ({edge_end - edge_start + 1} edges)",
                'location': location,
                'sensors': sensors,
                'edge_range': {'start': edge_start, 'end': edge_end}
            }
            
            # Create EdgeManager (Gateway)
            gateway = EdgeManager(
                district_id=district_id,
                edge_config=gateway_config,
                kafka_producer=self.kafka_producer,
                kafka_topics=KAFKA_TOPICS,
                stop_event=self.stop_event,
                sampling_interval=self.sampling_interval
            )
            
            self.gateways.append(gateway)
            
            # Log gateway info
            total_sensors = sum(len(s) for s in sensors.values())
            logger.info(f"  {gateway_id}: edges E-{edge_start:05d} to E-{edge_end:05d}, {total_sensors} sensors")
        
        logger.info(f"  Initialized {len(self.gateways)} gateways")
    
    def start_gateways(self):
        """Start all gateways in separate threads."""
        logger.info("Starting all gateways...")
        
        for gateway in self.gateways:
            thread = threading.Thread(
                target=gateway.run,
                name=f"{gateway.gateway_id}",
                daemon=True
            )
            thread.start()
            self.gateway_threads.append(thread)
        
        logger.info(f"✓ Started {len(self.gateway_threads)} gateway threads")
    
    def run(self):
        """Run the city simulator."""
        logger.info("=" * 70)
        logger.info(f"🏙️  {self.city_name} Emergency Management System")
        logger.info("=" * 70)
        logger.info(f"📊 Configuration:")
        logger.info(f"   Instance: {INSTANCE_ID + 1} of {TOTAL_INSTANCES}")
        logger.info(f"   Gateways this instance: {len(self.gateways)}")
        logger.info(f"   Total gateways (all instances): {self.total_gateways}")
        logger.info(f"   City graph edges: {self.total_edges}")
        logger.info(f"   Sensors per edge: {self.sensors_per_edge}")
        logger.info(f"   Total weather stations (city): {self.total_weather_stations}")
        logger.info(f"   Kafka Topics: {KAFKA_TOPICS}")
        logger.info("=" * 70)
        
        try:
            self.start_gateways()
            logger.info("✓ System running. Press Ctrl+C to stop.")
            
            while not self.stop_event.is_set():
                time.sleep(1)
            
        except KeyboardInterrupt:
            logger.info("\n⚠ Shutdown requested...")
        finally:
            self.stop()
    
    def stop(self):
        """Stop all gateways and cleanup."""
        logger.info("Stopping all gateways...")
        self.stop_event.set()
        
        for thread in self.gateway_threads:
            thread.join(timeout=5)
        
        self.kafka_producer.close()
        logger.info("✓ City simulator stopped cleanly")


if __name__ == '__main__':
    try:
        simulator = CitySimulator()
        simulator.run()
    except Exception as e:
        logger.error(f"✗ Fatal error: {e}")
        sys.exit(1)
