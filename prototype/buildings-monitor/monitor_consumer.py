#!/usr/bin/env python3
"""
Buildings Monitor - Kafka Consumer and InfluxDB Writer
Consumes building sensor data from Kafka, validates, transforms, and writes to InfluxDB.
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
KAFKA_TOPIC = os.getenv('KAFKA_TOPIC_BUILDINGS', 'buildings-monitoring')
KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'buildings-monitor-group')
INFLUXDB_URL = os.getenv('INFLUXDB_URL', 'http://localhost:8086')
INFLUXDB_TOKEN = os.getenv('INFLUXDB_TOKEN', '')
INFLUXDB_ORG = os.getenv('INFLUXDB_ORG', 'emergency-mgmt')
INFLUXDB_BUCKET = os.getenv('INFLUXDB_BUCKET', 'buildings_metrics')


class BuildingsMonitorConsumer:
    """Consumes building sensor data from Kafka and writes to InfluxDB."""
    
    def __init__(self):
        self.kafka_consumer = self._init_kafka_consumer()
        self.influx_client = self._init_influxdb_client()
        self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
        
        self.messages_processed = 0
        self.messages_validated = 0
        self.messages_written = 0
        self.validation_errors = 0
        
        logger.info("Buildings Monitor Consumer initialized")
    
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
        """Validate building sensor message."""
        required_fields = ['building_id', 'building_name', 'building_type', 'timestamp', 
                           'location', 'sensors', 'managed_resources']
        
        for field in required_fields:
            if field not in message:
                logger.error(f"Validation error: Missing field '{field}'")
                return False
        
        # Validate location
        if not all(k in message['location'] for k in ['latitude', 'longitude']):
            logger.error("Validation error: Invalid location")
            return False
        
        return True
    
    def transform_to_influx_point(self, message: Dict[str, Any]) -> Optional[Point]:
        """Transform building message to InfluxDB Point."""
        try:
            timestamp = datetime.fromisoformat(message['timestamp'].replace('Z', '+00:00'))
            
            point = Point("building_data")
            point.tag('building_id', message['building_id'])
            point.tag('building_type', message['building_type'])
            
            # Location (fixed)
            loc = message['location']
            point.field('latitude', float(loc['latitude']))
            point.field('longitude', float(loc['longitude']))
            
            # Air quality sensors (aggregate)
            aq_sensors = message['sensors'].get('air_quality', [])
            if aq_sensors:
                avg_pm25 = sum(s['measurements'].get('pm25_ugm3', 0) for s in aq_sensors) / len(aq_sensors)
                point.field('avg_pm25_ugm3', float(avg_pm25))
            
            # Acoustic sensors (aggregate)
            acoustic_sensors = message['sensors'].get('acoustic', [])
            if acoustic_sensors:
                avg_noise = sum(s['measurements'].get('noise_level_db', 0) for s in acoustic_sensors) / len(acoustic_sensors)
                point.field('avg_noise_level_db', float(avg_noise))
            
            # Managed resources
            exits = message['managed_resources'].get('emergency_exits', [])
            elevators = message['managed_resources'].get('elevators', [])
            
            # Count operational exits and elevators
            operational_exits = sum(1 for e in exits if e.get('operational', False))
            operational_elevators = sum(1 for e in elevators if e.get('status') == 'operational')
            
            point.field('total_exits', len(exits))
            point.field('operational_exits', operational_exits)
            point.field('total_elevators', len(elevators))
            point.field('operational_elevators', operational_elevators)
            
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
            logger.info(f"Written data for building {message['building_id']}")
    
    def run(self):
        """Main consumer loop."""
        logger.info("Starting buildings monitor consumer loop")
        
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
    consumer = BuildingsMonitorConsumer()
    consumer.run()
