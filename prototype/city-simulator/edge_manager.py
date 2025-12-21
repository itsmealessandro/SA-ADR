"""
Edge Manager Module (Gateway)

This module manages a single gateway location with its sensors.
Each gateway runs in a separate thread, simulating concurrent operations
at different physical locations in the city.

A gateway represents a physical data collector in an area that hosts multiple 
sensors of different types. Each sensor monitors a specific city graph edge.
The gateway aggregates all sensor data and sends it to Kafka as a unified payload.

Edge ID vs Gateway ID:
- gateway_id: Unique identifier for the gateway device (GW-XXXXX). The gateway is the 
  physical data collector/aggregator in an area.
- edge_id: Property of individual sensors. Each sensor has its own edge_id referring
  to the specific graph edge (E-00000 to E-03458) where that sensor is located.
  One gateway manages sensors across MULTIPLE graph edges.
"""

import logging
import random
import threading
import time
from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional

from sensor_simulator import (CameraSensorSimulator, SpeedSensorSimulator,
                              WeatherSensorSimulator)

logger = logging.getLogger(__name__)

# Gateway metadata
GATEWAY_VERSION = "1.0.0"
GATEWAY_FIRMWARE = "EdgeOS 2.1.3"


class EdgeManager:
    """
    Manages a single gateway with sensors across multiple graph edges.
    
    This class acts as a Gateway that gathers sensor data from all sensors
    in its coverage area and sends it to Kafka as a unified payload.
    Each sensor knows its own edge_id (which graph edge it monitors).
    
    Responsibilities:
    - Coordinate data generation from all sensors at this gateway
    - Aggregate all sensor data into a single gateway payload
    - Send gateway payload to Kafka message bus
    - Handle local buffering for resilience
    - Run in separate thread for concurrent operation
    
    Thread Safety:
    - Each EdgeManager has its own thread
    - Shares only the Kafka producer (which is thread-safe)
    - No shared state between gateways
    """
    
    def __init__(self, district_id: str, edge_config: Dict, 
                 kafka_producer: Any, kafka_topics: Dict[str, str], 
                 stop_event: threading.Event, sampling_interval: float = 3.0):
        """
        Initialize a Gateway Manager.
        
        Args:
            district_id: ID of the district this gateway belongs to
            edge_config: Configuration dict containing:
                - gateway_id: Unique gateway identifier
                - name: Human-readable gateway name
                - location: Dict with latitude/longitude
                - sensors: Dict mapping sensor types to list of sensor configs
                  Each sensor config includes its own edge_id
                - edge_range: Optional dict with start/end edges covered
            kafka_producer: Shared Kafka producer instance (thread-safe)
            kafka_topics: Dictionary mapping sensor types to topic names
            stop_event: Threading event to signal shutdown
            sampling_interval: Sampling interval in seconds from config
        """
        # Gateway identification
        self.district_id = district_id
        self.gateway_id = edge_config.get('gateway_id', 'unknown-gateway')
        self.gateway_name = edge_config.get('name', f"Gateway {self.gateway_id}")
        self.location = edge_config['location']
        self.sensors_config = edge_config.get('sensors', {})
        
        # Edge range info (for metadata)
        self.edge_range = edge_config.get('edge_range', {})
        
        # Kafka configuration
        self.kafka_producer = kafka_producer
        self.kafka_topics = kafka_topics
        self.stop_event = stop_event
        
        # Initialize sensor simulators
        # Each simulator maintains its own state (windows, persistence, etc.)
        self.speed_simulator = SpeedSensorSimulator(self.location)
        self.weather_simulator = WeatherSensorSimulator(self.location)
        self.camera_simulator = CameraSensorSimulator(self.location)
        
        # Local buffer for resilience
        self.local_buffer = deque(maxlen=1000)
        
        # Use configured sampling interval with small randomization (±10%) to avoid synchronization
        jitter = sampling_interval * 0.1
        self.sampling_interval = random.uniform(
            sampling_interval - jitter, 
            sampling_interval + jitter
        )
        
        # Log initialization
        speed_count = len(self.sensors_config.get('speed', []))
        weather_count = len(self.sensors_config.get('weather', []))
        camera_count = len(self.sensors_config.get('camera', []))
        total_sensors = speed_count + weather_count + camera_count
        
        logger.info(
            f"Gateway initialized: {self.gateway_id} ({self.gateway_name}) - "
            f"District: {district_id}, Sensors: {total_sensors} "
            f"({speed_count} speed, {weather_count} weather, {camera_count} camera)"
        )
    
    def generate_sensor_data(self, sensor_type: str) -> Optional[Dict[str, Any]]:
        """
        Generate data for a specific sensor type.
        
        Each sensor in the config has its own edge_id. The sensor simulator
        will use this edge_id when generating data for each sensor.
        
        Args:
            sensor_type: One of 'speed', 'weather', 'camera'
            
        Returns:
            Sensor data dict with readings, or None if no sensors
        """
        sensors_list = self.sensors_config.get(sensor_type, [])
        if not sensors_list:
            return None
        
        # Get sensor-specific data from appropriate simulator
        # Pass the full sensor configs (which include per-sensor edge_id)
        if sensor_type == 'speed':
            sensor_data = self.speed_simulator.generate_data(
                sensors_list,
                self.gateway_id
            )
        elif sensor_type == 'weather':
            sensor_data = self.weather_simulator.generate_data(
                sensors_list,
                self.gateway_id
            )
        elif sensor_type == 'camera':
            sensor_data = self.camera_simulator.generate_data(
                sensors_list,
                self.gateway_id
            )
        else:
            return None
        
        return sensor_data
    
    def generate_gateway_payload(self) -> Dict[str, Any]:
        """
        Generate the unified gateway payload containing all sensor data.
        
        This method aggregates data from all sensors at this gateway
        and returns a single payload ready for Kafka.
        
        Returns:
            Complete gateway payload with metadata and sensors array
        """
        # Collect sensor data from all sensor types
        sensors = []
        
        # Generate speed sensor data
        speed_data = self.generate_sensor_data('speed')
        if speed_data:
            sensors.extend(speed_data.get('readings', []))
        
        # Generate weather sensor data
        weather_data = self.generate_sensor_data('weather')
        if weather_data:
            sensors.extend(weather_data.get('readings', []))
        
        # Generate camera sensor data
        camera_data = self.generate_sensor_data('camera')
        if camera_data:
            sensors.extend(camera_data.get('readings', []))
        
        # Build the gateway payload
        # Note: edge_id is NOT included at gateway level - it's a property of individual sensors
        payload = {
            'gateway_id': self.gateway_id,
            'district_id': self.district_id,
            'location': {
                'latitude': self.location['latitude'],
                'longitude': self.location['longitude']
            },
            'last_updated': datetime.utcnow().isoformat() + 'Z',
            'metadata': {
                'name': self.gateway_name,
                'version': GATEWAY_VERSION,
                'firmware': GATEWAY_FIRMWARE,
                'sensor_counts': {
                    'speed': len(self.sensors_config.get('speed', [])),
                    'weather': len(self.sensors_config.get('weather', [])),
                    'camera': len(self.sensors_config.get('camera', []))
                }
            },
            'sensors': sensors
        }
        
        return payload
    
    def send_to_kafka(self, data: Dict[str, Any]) -> bool:
        """
        Send gateway data to Kafka with error handling.
        
        Implements resilience pattern:
        1. Try to send to Kafka
        2. On failure, buffer locally
        3. Retry buffered messages later
        
        Args:
            data: Gateway payload to send
            
        Returns:
            True if sent successfully, False if buffered
        """
        try:
            # Use the gateway topic for all gateway data
            topic = self.kafka_topics.get('gateway', 'city-gateway-data')
            
            logger.info(f"[{self.gateway_id}] 📤 Sending gateway data to {topic}...")
            
            # Async send with timeout and partition key
            # Using gateway_id as key ensures all data for this gateway goes to same partition
            future = self.kafka_producer.send(
                topic, 
                key=self.gateway_id,  # Partition key
                value=data
            )
            future.get(timeout=10)  # Wait max 10 seconds
            sensor_count = len(data.get('sensors', []))
            logger.info(f"[{self.gateway_id}] ✓ Sent gateway data ({sensor_count} sensors) to {topic}")
            return True
        except Exception as e:
            # Log error and buffer message for retry
            logger.error(f"[{self.gateway_id}] Kafka error: {e}. Buffering message.")
            self.local_buffer.append(data)
            return False
    
    def retry_buffered_messages(self):
        """
        Attempt to send buffered messages.
        
        Called periodically when Kafka might be available again.
        Implements simple retry logic without sophisticated backoff.
        """
        if not self.local_buffer:
            return
        
        logger.info(f"[{self.gateway_id}] Retrying {len(self.local_buffer)} buffered messages")
        
        # Try to send all buffered messages
        messages_to_retry = list(self.local_buffer)
        self.local_buffer.clear()
        
        for message in messages_to_retry:
            if not self.send_to_kafka(message):
                # Still failing, will be re-buffered
                break
    
    def run(self):
        """
        Main loop for this gateway: generate and send gateway data.
        
        Execution Flow:
        1. Generate unified gateway payload with all sensors
        2. Send to Kafka
        3. Wait for next interval
        4. Repeat until stop signal
        
        This method runs in a separate thread, one per gateway.
        """
        logger.info(f"[{self.gateway_id}] Starting gateway loop (interval: {self.sampling_interval:.1f}s)")
        
        iteration = 0
        while not self.stop_event.is_set():
            try:
                iteration += 1
                
                logger.info(f"[{self.gateway_id}] Iteration {iteration}: Generating gateway payload")
                
                # Generate unified gateway payload with all sensor data
                payload = self.generate_gateway_payload()
                
                # Send gateway payload to Kafka
                if payload.get('sensors'):
                    logger.info(f"[{self.gateway_id}] Payload generated with {len(payload['sensors'])} sensors, sending to Kafka...")
                    self.send_to_kafka(payload)
                else:
                    logger.info(f"[{self.gateway_id}] No sensors configured, skipping")
                
                # Periodically retry buffered messages
                if iteration % 10 == 0:
                    self.retry_buffered_messages()
                
                # Wait for next interval (interruptible sleep)
                self.stop_event.wait(timeout=self.sampling_interval)
                
            except Exception as e:
                # Log error but keep running (fault tolerance)
                logger.error(f"[{self.gateway_id}] Error in gateway loop: {e}")
                self.stop_event.wait(timeout=self.sampling_interval)
        
        logger.info(f"[{self.gateway_id}] Gateway loop stopped")
