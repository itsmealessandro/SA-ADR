#!/usr/bin/env python3
"""
Monitor Python - Kafka Consumer and InfluxDB Writer
Consumes sensor data from Kafka, validates, transforms, and writes to InfluxDB.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add parent directory to path to import common module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from kafka import KafkaConsumer
from kafka.errors import KafkaError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'city-sensor-data')  # Updated for city component
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'city-monitor-group')
INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN', '')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'emergency-mgmt')
INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'city_metrics')  # Updated for city component


class MonitorConsumer:
    """Consumes sensor data from Kafka and writes to InfluxDB."""
    
    def __init__(self):
        self.kafka_consumer = self._init_kafka_consumer()
        self.influx_client = self._init_influxdb_client()
        self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
        
        # Statistics
        self.messages_processed = 0
        self.messages_validated = 0
        self.messages_written = 0
        self.validation_errors = 0
        
        logger.info("Monitor Consumer initialized")
    
    def _init_kafka_consumer(self) -> KafkaConsumer:
        """Initialize Kafka consumer with retry logic for gateway topic."""
        from common.kafka_utils import create_multi_topic_consumer

        # Use the unified gateway topic
        topics = [
            os.getenv('KAFKA_TOPIC_GATEWAY', 'city-gateway-data')
        ]
        
        return create_multi_topic_consumer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            topics=topics,
            group_id=KAFKA_GROUP_ID
        )
    
    def _init_influxdb_client(self) -> InfluxDBClient:
        """Initialize InfluxDB client with retry logic."""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                client = InfluxDBClient(
                    url=INFLUXDB_URL,
                    token=INFLUXDB_TOKEN,
                    org=INFLUXDB_ORG
                )
                # Test connection
                client.ping()
                logger.info(f"Connected to InfluxDB: {INFLUXDB_URL}")
                return client
            except Exception as e:
                logger.warning(f"InfluxDB connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise
    
    def validate_message(self, message: Dict[str, Any]) -> bool:
        """Validate gateway message structure and required fields."""
        # Required fields for gateway payload
        # Note: edge_id is NOT required at gateway level - it's a property of individual sensors
        required_fields = ['gateway_id', 'district_id', 'last_updated', 'location', 'metadata', 'sensors']
        
        # Check required fields
        for field in required_fields:
            if field not in message:
                logger.error(f"Validation error: Missing required field '{field}'")
                return False
        
        # Validate location
        if 'latitude' not in message['location'] or 'longitude' not in message['location']:
            logger.error("Validation error: Missing latitude/longitude in location")
            return False
        
        # Validate coordinate ranges
        lat = message['location']['latitude']
        lon = message['location']['longitude']
        if not (-90 <= lat <= 90):
            logger.error(f"Validation error: 'latitude' must be between -90 and 90, got {lat}")
            return False
        if not (-180 <= lon <= 180):
            logger.error(f"Validation error: 'longitude' must be between -180 and 180, got {lon}")
            return False
        
        # Validate timestamp format
        try:
            datetime.fromisoformat(message['last_updated'].replace('Z', '+00:00'))
        except ValueError:
            logger.error(f"Validation error: Invalid timestamp format '{message['last_updated']}'")
            return False
        
        # Validate sensors array
        if not isinstance(message['sensors'], list):
            logger.error("Validation error: 'sensors' must be an array")
            return False
        
        # Validate each sensor
        for sensor in message['sensors']:
            if not self.validate_sensor(sensor):
                return False
        
        return True
    
    def validate_sensor(self, sensor: Dict[str, Any]) -> bool:
        """Validate individual sensor in gateway payload."""
        required_fields = ['sensor_id', 'sensor_type', 'gateway_id', 'edge_id', 'latitude', 'longitude', 'status']
        
        for field in required_fields:
            if field not in sensor:
                logger.error(f"Sensor validation error: Missing required field '{field}'")
                return False
        
        # Validate sensor type
        if sensor['sensor_type'] not in ['speed', 'weather', 'camera']:
            logger.error(f"Sensor validation error: Invalid sensor_type '{sensor['sensor_type']}'")
            return False
        
        # Validate sensor-specific fields
        if sensor['sensor_type'] == 'speed':
            if 'speed_kmh' not in sensor:
                logger.error("Sensor validation error: Missing 'speed_kmh' for speed sensor")
                return False
        
        if sensor['sensor_type'] == 'weather':
            if 'temperature_c' not in sensor or 'humidity' not in sensor:
                logger.error("Sensor validation error: Missing weather fields")
                return False
        
        if sensor['sensor_type'] == 'camera':
            if 'road_condition' not in sensor:
                logger.error("Sensor validation error: Missing 'road_condition' for camera sensor")
                return False
            valid_conditions = ['clear', 'congestion', 'accident', 'obstacles', 'flooding']
            if sensor['road_condition'] not in valid_conditions:
                logger.error(f"Sensor validation error: Invalid road_condition '{sensor['road_condition']}'")
                return False
        
        return True
    
    def transform_to_influx_point(self, message: Dict[str, Any]) -> Optional[Point]:
        """Transform validated gateway message to InfluxDB Point."""
        try:
            # Parse timestamp
            timestamp = datetime.fromisoformat(message['last_updated'].replace('Z', '+00:00'))
            
            # Create point for gateway metadata
            # Note: edge_id is NOT included at gateway level - sensors have their own edge_id
            gateway_point = Point("gateway_status")
            gateway_point.tag('gateway_id', message['gateway_id'])
            gateway_point.tag('district_id', message['district_id'])
            gateway_point.tag('gateway_name', message['metadata']['name'])
            gateway_point.field('sensor_count', len(message['sensors']))
            gateway_point.field('latitude', float(message['location']['latitude']))
            gateway_point.field('longitude', float(message['location']['longitude']))
            gateway_point.time(timestamp, WritePrecision.NS)
            
            return gateway_point
            
        except Exception as e:
            logger.error(f"Transform error: {e}")
            return None
    
    def transform_sensors_to_influx_points(self, message: Dict[str, Any]) -> List[Point]:
        """Transform gateway sensors to individual InfluxDB Points."""
        points = []
        try:
            timestamp = datetime.fromisoformat(message['last_updated'].replace('Z', '+00:00'))
            
            for sensor in message['sensors']:
                sensor_type = sensor['sensor_type']
                measurement = f"sensor_{sensor_type}"
                point = Point(measurement)
                
                # Common tags
                point.tag('district_id', message['district_id'])
                point.tag('gateway_id', sensor['gateway_id'])
                point.tag('edge_id', sensor['edge_id'])
                point.tag('sensor_id', sensor['sensor_id'])
                point.tag('status', sensor.get('status', 'active'))
                
                # Location fields
                point.field('latitude', float(sensor['latitude']))
                point.field('longitude', float(sensor['longitude']))
                
                # Sensor-specific fields
                if sensor_type == 'speed':
                    if 'speed_kmh' in sensor:
                        point.field('speed_kmh', float(sensor['speed_kmh']))
                
                elif sensor_type == 'weather':
                    if 'temperature_c' in sensor:
                        point.field('temperature_c', float(sensor['temperature_c']))
                    if 'humidity' in sensor:
                        point.field('humidity', float(sensor['humidity']))
                    if 'weather_conditions' in sensor:
                        point.tag('weather_conditions', sensor['weather_conditions'])
                
                elif sensor_type == 'camera':
                    if 'road_condition' in sensor:
                        point.tag('road_condition', sensor['road_condition'])
                    if 'confidence' in sensor:
                        point.field('confidence', float(sensor['confidence']))
                    if 'vehicle_count' in sensor and sensor['vehicle_count'] is not None:
                        point.field('vehicle_count', int(sensor['vehicle_count']))
                
                point.time(timestamp, WritePrecision.NS)
                points.append(point)
            
        except Exception as e:
            logger.error(f"Transform sensors error: {e}")
        
        return points
    
    def write_to_influxdb(self, point: Point) -> bool:
        """Write point to InfluxDB."""
        try:
            self.write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
            return True
        except Exception as e:
            logger.error(f"InfluxDB write error: {e}")
            return False
    
    def write_points_to_influxdb(self, points: List[Point]) -> int:
        """Write multiple points to InfluxDB. Returns count of successful writes."""
        written = 0
        for point in points:
            if self.write_to_influxdb(point):
                written += 1
        return written
    
    def process_message(self, message: Dict[str, Any]):
        """Process a single gateway message: validate, transform, and write."""
        self.messages_processed += 1
        
        # Validate
        if not self.validate_message(message):
            self.validation_errors += 1
            logger.warning(f"Skipping invalid message from gateway: {message.get('gateway_id', 'unknown')}")
            return
        
        self.messages_validated += 1
        
        # Transform gateway metadata
        gateway_point = self.transform_to_influx_point(message)
        if gateway_point:
            self.write_to_influxdb(gateway_point)
        
        # Transform and write individual sensor points
        sensor_points = self.transform_sensors_to_influx_points(message)
        written = self.write_points_to_influxdb(sensor_points)
        
        self.messages_written += written
        logger.info(
            f"Written {written} sensor points from gateway "
            f"{message['gateway_id']} ({message['district_id']})"
        )
    
    def log_statistics(self):
        """Log processing statistics."""
        logger.info(
            f"Statistics - Processed: {self.messages_processed}, "
            f"Validated: {self.messages_validated}, "
            f"Written: {self.messages_written}, "
            f"Errors: {self.validation_errors}"
        )
    
    def run(self):
        """Main loop: consume messages from Kafka and process them."""
        logger.info("Starting monitor consumer loop")
        
        try:
            for message in self.kafka_consumer:
                try:
                    self.process_message(message.value)
                    
                    # Log statistics every 50 messages
                    if self.messages_processed % 50 == 0:
                        self.log_statistics()
                        
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    continue
                    
        except KeyboardInterrupt:
            logger.info("Shutting down monitor consumer...")
        finally:
            self.log_statistics()
            self.kafka_consumer.close()
            self.influx_client.close()
            logger.info("Monitor consumer stopped")


if __name__ == '__main__':
    consumer = MonitorConsumer()
    consumer.run()
