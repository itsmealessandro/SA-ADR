#!/usr/bin/env python3
"""
Vehicles Monitor - Kafka Consumer and InfluxDB Writer
Consumes vehicle sensor data from Kafka, validates, transforms, and writes to InfluxDB.
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from kafka import KafkaConsumer
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
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'vehicles-sensor-data')
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'vehicles-monitor-group')
INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN', '')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'emergency-mgmt')
INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'vehicles_metrics')


class VehiclesMonitorConsumer:
    """Consumes vehicle sensor data from Kafka and writes to InfluxDB."""
    
    def __init__(self):
        self.kafka_consumer = self._init_kafka_consumer()
        self.influx_client = self._init_influxdb_client()
        self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
        
        self.messages_processed = 0
        self.messages_validated = 0
        self.messages_written = 0
        self.validation_errors = 0
        
        logger.info("Vehicles Monitor Consumer initialized")
    
    def _init_kafka_consumer(self):
        """Initialize Kafka consumer with retry logic."""
        for attempt in range(10):
            try:
                consumer = KafkaConsumer(
                    KAFKA_TOPIC,
                    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                    group_id=KAFKA_GROUP_ID,
                    auto_offset_reset='earliest',
                    enable_auto_commit=True,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
                )
                logger.info(f"Connected to Kafka topic: {KAFKA_TOPIC}")
                return consumer
            except Exception as e:
                logger.warning(f"Kafka connection attempt {attempt + 1}/10 failed: {e}")
                if attempt < 9:
                    time.sleep(5)
                else:
                    raise
    
    def _init_influxdb_client(self):
        """Initialize InfluxDB client with retry logic."""
        for attempt in range(10):
            try:
                client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
                client.ping()
                logger.info(f"Connected to InfluxDB: {INFLUXDB_URL}")
                return client
            except Exception as e:
                logger.warning(f"InfluxDB connection attempt {attempt + 1}/10 failed: {e}")
                if attempt < 9:
                    time.sleep(5)
                else:
                    raise
    
    def validate_message(self, message: Dict[str, Any]) -> bool:
        """Validate vehicle sensor message."""
        required_fields = ['vehicle_id', 'vehicle_type', 'timestamp', 'gps_position', 'movement', 
                           'managed_resources', 'sensors']
        
        for field in required_fields:
            if field not in message:
                logger.error(f"Validation error: Missing field '{field}'")
                return False
        
        # Validate GPS position
        if not all(k in message['gps_position'] for k in ['latitude', 'longitude']):
            logger.error("Validation error: Invalid GPS position")
            return False
        
        # Validate movement data
        if not all(k in message['movement'] for k in ['speed_kmh', 'direction_degrees']):
            logger.error("Validation error: Invalid movement data")
            return False
        
        return True
    
    def transform_to_influx_point(self, message: Dict[str, Any]) -> Optional[Point]:
        """Transform vehicle message to InfluxDB Point."""
        try:
            timestamp = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
            
            point = Point("vehicle_data")
            point.tag('vehicle_id', message['vehicle_id'])
            point.tag('vehicle_type', message['vehicle_type'])
            
            # GPS and movement
            gps = message['gps_position']
            point.field('latitude', float(gps['latitude']))
            point.field('longitude', float(gps['longitude']))
            
            movement = message['movement']
            point.field('speed_kmh', float(movement['speed_kmh']))
            point.field('direction_degrees', int(movement['direction_degrees']))
            point.tag('heading', movement.get('heading', 'unknown'))
            
            # Managed resources
            resources = message['managed_resources']
            point.field('battery_level_percent', float(resources['battery_level_percent']))
            point.tag('firmware_version', resources.get('firmware_version', 'unknown'))
            
            # Sensors (incident detection)
            accel = message['sensors'].get('accelerometer', {})
            point.field(' incidentdetected', accel.get('incident_detected', False))
            
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
        """Process a single message."""
        self.messages_processed += 1
        
        if not self.validate_message(message):
            self.validation_errors += 1
            return
        
        self.messages_validated += 1
        
        point = self.transform_to_influx_point(message)
        if point and self.write_to_influxdb(point):
            self.messages_written += 1
            logger.info(f"Written data for vehicle {message['vehicle_id']}")
    
    def run(self):
        """Main consumer loop."""
        logger.info("Starting vehicles monitor consumer loop")
        
        try:
            for message in self.kafka_consumer:
                try:
                    self.process_message(message.value)
                    
                    if self.messages_processed % 20 == 0:
                        logger.info(f"Stats - Processed: {self.messages_processed}, Written: {self.messages_written}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.kafka_consumer.close()
            self.influx_client.close()


if __name__ == '__main__':
    consumer = VehiclesMonitorConsumer()
    consumer.run()
