#!/usr/bin/env python3
"""
Monitor Python - Kafka Consumer and InfluxDB Writer
Consumes sensor data from Kafka, validates, transforms, and writes to InfluxDB.
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from kafka import KafkaConsumer
from kafka.errors import KafkaError
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'sensor-data')
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'monitor-consumer-group')
INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN', '')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'emergency-mgmt')
INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'sensor_metrics')


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
        """Initialize Kafka consumer with retry logic."""
        max_retries = 10
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                consumer = KafkaConsumer(
                    KAFKA_TOPIC,
                    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                    group_id=KAFKA_GROUP_ID,
                    auto_offset_reset='earliest',  # Start from beginning if no offset
                    enable_auto_commit=True,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
                )
                logger.info(f"Connected to Kafka topic: {KAFKA_TOPIC}")
                return consumer
            except Exception as e:
                logger.warning(f"Kafka connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise
    
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
        """Validate message structure and required fields."""
        required_fields = ['district_id', 'edge_id', 'sensor_type', 'timestamp', 'latitude', 'longitude']
        
        # Check required fields
        for field in required_fields:
            if field not in message:
                logger.error(f"Validation error: Missing required field '{field}'")
                return False
        
        # Validate sensor type
        if message['sensor_type'] not in ['speed', 'weather', 'camera']:
            logger.error(f"Validation error: Invalid sensor_type '{message['sensor_type']}'")
            return False
        
        # Validate speed sensor data
        if message['sensor_type'] == 'speed':
            if 'speed_kmh' not in message:
                logger.error("Validation error: Missing 'speed_kmh' for speed sensor")
                return False
            if not isinstance(message['speed_kmh'], (int, float)):
                logger.error("Validation error: 'speed_kmh' must be numeric")
                return False
        
        # Validate weather sensor data
        if message['sensor_type'] == 'weather':
            required_weather_fields = ['temperature_c', 'humidity', 'weather_conditions']
            for field in required_weather_fields:
                if field not in message:
                    logger.error(f"Validation error: Missing '{field}' for weather sensor")
                    return False
        
        # Validate camera sensor data
        if message['sensor_type'] == 'camera':
            # Required fields for camera sensors
            if 'road_condition' not in message:
                logger.error("Validation error: Missing 'road_condition' for camera sensor")
                return False
            
            # Validate road_condition value
            valid_conditions = ['clear', 'congestion', 'accident', 'obstacles', 'flooding']
            if message['road_condition'] not in valid_conditions:
                logger.error(f"Validation error: Invalid road_condition '{message['road_condition']}'")
                return False
            
            # Validate confidence_score
            if 'confidence_score' not in message:
                logger.error("Validation error: Missing 'confidence_score' for camera sensor")
                return False
            if not isinstance(message['confidence_score'], (int, float)):
                logger.error("Validation error: 'confidence_score' must be numeric")
                return False
            if not (0.0 <= message['confidence_score'] <= 1.0):
                logger.error(f"Validation error: 'confidence_score' must be between 0 and 1, got {message['confidence_score']}")
                return False
            
            # Optional: Validate vehicle_count if present
            if 'vehicle_count' in message:
                if not isinstance(message['vehicle_count'], int) or message['vehicle_count'] < 0:
                    logger.error("Validation error: 'vehicle_count' must be a non-negative integer")
                    return False
        
        # Validate GPS coordinates (all sensor types)
        if 'latitude' not in message:
            logger.error("Validation error: Missing 'latitude'")
            return False
        if 'longitude' not in message:
            logger.error("Validation error: Missing 'longitude'")
            return False
        
        # Validate coordinate ranges
        if not isinstance(message['latitude'], (int, float)):
            logger.error("Validation error: 'latitude' must be numeric")
            return False
        if not isinstance(message['longitude'], (int, float)):
            logger.error("Validation error: 'longitude' must be numeric")
            return False
        
        if not (-90 <= message['latitude'] <= 90):
            logger.error(f"Validation error: 'latitude' must be between -90 and 90, got {message['latitude']}")
            return False
        if not (-180 <= message['longitude'] <= 180):
            logger.error(f"Validation error: 'longitude' must be between -180 and 180, got {message['longitude']}")
            return False
        
        # Validate timestamp format
        try:
            datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
        except ValueError:
            logger.error(f"Validation error: Invalid timestamp format '{message['timestamp']}'")
            return False
        
        return True
    
    def transform_to_influx_point(self, message: Dict[str, Any]) -> Optional[Point]:
        """Transform validated message to InfluxDB Point."""
        try:
            # Parse timestamp
            timestamp = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
            
            # Create point with measurement name based on sensor type
            measurement = f"sensor_{message['sensor_type']}"
            point = Point(measurement)
            
            # Add tags (indexed fields for querying)
            point.tag('district_id', message['district_id'])
            point.tag('edge_id', message['edge_id'])
            point.tag('sensor_type', message['sensor_type'])
            
            # Add GPS coordinates as fields (numeric values for aggregation/filtering)
            point.field('latitude', float(message['latitude']))
            point.field('longitude', float(message['longitude']))
            
            # Add fields (actual data values)
            if message['sensor_type'] == 'speed':
                point.field('speed_kmh', float(message['speed_kmh']))
                if 'sample_count' in message:
                    point.field('sample_count', int(message['sample_count']))
            
            elif message['sensor_type'] == 'weather':
                point.field('temperature_c', float(message['temperature_c']))
                point.field('humidity', float(message['humidity']))
                point.tag('weather_conditions', message['weather_conditions'])
                if 'sample_count' in message:
                    point.field('sample_count', int(message['sample_count']))
            
            elif message['sensor_type'] == 'camera':
                # Tag for road condition (categorical - good for grouping/filtering)
                point.tag('road_condition', message['road_condition'])
                
                # Fields for numeric data
                point.field('confidence_score', float(message['confidence_score']))
                
                # Optional vehicle count
                if 'vehicle_count' in message:
                    point.field('vehicle_count', int(message['vehicle_count']))
            
            # Set timestamp with nanosecond precision
            point.time(timestamp, WritePrecision.NS)
            
            return point
            
        except Exception as e:
            logger.error(f"Transform error: {e}")
            return None
    
    def write_to_influxdb(self, point: Point) -> bool:
        """Write point to InfluxDB."""
        try:
            self.write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
            return True
        except Exception as e:
            logger.error(f"InfluxDB write error: {e}")
            return False
    
    def process_message(self, message: Dict[str, Any]):
        """Process a single message: validate, transform, and write."""
        self.messages_processed += 1
        
        # Validate
        if not self.validate_message(message):
            self.validation_errors += 1
            logger.warning(f"Skipping invalid message: {message}")
            return
        
        self.messages_validated += 1
        
        # Transform
        point = self.transform_to_influx_point(message)
        if not point:
            logger.warning(f"Failed to transform message: {message}")
            return
        
        # Write to InfluxDB
        if self.write_to_influxdb(point):
            self.messages_written += 1
            logger.info(
                f"Written {message['sensor_type']} data from "
                f"{message['district_id']}/{message['edge_id']}"
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
