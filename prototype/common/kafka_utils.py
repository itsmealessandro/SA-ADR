#!/usr/bin/env python3
"""
Kafka Utilities - Shared Connection Logic

Provides reusable Kafka producer and consumer initialization with:
- Connection retry logic
- Consistent error handling
- Logging configuration
- Best practices for thread-safe operation

Used by all simulators and monitors to reduce code duplication.
"""

import os
import time
import json
import logging
from typing import Optional, List
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import NoBrokersAvailable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_kafka_producer(
    bootstrap_servers: str,
    max_retries: int = 5,
    retry_delay: int = 5
) -> KafkaProducer:
    """
    Create a Kafka producer with retry logic.
    
    Args:
        bootstrap_servers: Comma-separated list of Kafka broker addresses
        max_retries: Maximum number of connection attempts
        retry_delay: Seconds to wait between retries
    
    Returns:
        Connected KafkaProducer instance
    
    Raises:
        Exception: If connection fails after all retries
    """
    logger.info(f"🔄 Initializing Kafka producer (bootstrap: {bootstrap_servers})...")
    logger.info(f"Bootstrap servers: {bootstrap_servers.split(",")}")
    
    for attempt in range(1, max_retries + 1):
        try:
            producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers.split(','),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks=1,
                request_timeout_ms=30000,
                api_version=(2, 5, 0)
            )
            logger.info(f"✓ Kafka producer connected successfully")
            return producer
            
        except NoBrokersAvailable as e:
            if attempt < max_retries:
                logger.warning(
                    f"⚠ Kafka connection attempt {attempt}/{max_retries} failed. "
                    f"Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            else:
                logger.error(f"✗ Failed to connect to Kafka after {max_retries} attempts")
                raise Exception(f"Kafka connection failed: {e}")
    
    raise Exception("Kafka producer initialization failed")


def create_kafka_consumer(
    bootstrap_servers: str,
    topic: str,
    group_id: str,
    max_retries: int = 5,
    retry_delay: int = 5,
    auto_offset_reset: str = 'earliest'
) -> KafkaConsumer:
    """
    Create a Kafka consumer with retry logic.
    
    Args:
        bootstrap_servers: Comma-separated list of Kafka broker addresses
        topic: Kafka topic to subscribe to
        group_id: Consumer group identifier
        max_retries: Maximum number of connection attempts
        retry_delay: Seconds to wait between retries
        auto_offset_reset: Where to start reading ('earliest' or 'latest')
    
    Returns:
        Connected KafkaConsumer instance
    
    Raises:
        Exception: If connection fails after all retries
    """
    logger.info(
        f"🔄 Initializing Kafka consumer (topic: {topic}, group: {group_id})..."
    )
    
    for attempt in range(1, max_retries + 1):
        try:
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=bootstrap_servers.split(','),
                group_id=group_id,
                auto_offset_reset=auto_offset_reset,
                enable_auto_commit=True,
                value_deserializer=lambda m: m.decode('utf-8'),
                api_version=(2, 5, 0)
            )
            logger.info(f"✓ Kafka consumer connected successfully")
            return consumer
            
        except NoBrokersAvailable as e:
            if attempt < max_retries:
                logger.warning(
                    f"⚠ Kafka connection attempt {attempt}/{max_retries} failed. "
                    f"Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            else:
                logger.error(f"✗ Failed to connect to Kafka after {max_retries} attempts")
                raise Exception(f"Kafka connection failed: {e}")
    
    raise Exception("Kafka consumer initialization failed")


def get_kafka_config_from_env() -> dict:
    """
    Load Kafka configuration from environment variables.
    
    Standard environment variables:
    - KAFKA_BOOTSTRAP_SERVERS: Broker addresses (default: localhost:9092)
    - KAFKA_TOPIC: Topic name (component-specific)
    - KAFKA_GROUP_ID: Consumer group ID (monitor-specific)
    
    Returns:
        Dictionary with Kafka configuration
    """
    return {
        'bootstrap_servers': os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        'topic': os.getenv('KAFKA_TOPIC'),
        'group_id': os.getenv('KAFKA_GROUP_ID')
    }


def create_multi_topic_consumer(
    bootstrap_servers: str,
    topics: List[str],
    group_id: str,
    max_retries: int = 5,
    retry_delay: int = 5,
    auto_offset_reset: str = 'earliest'
) -> KafkaConsumer:
    """
    Create a Kafka consumer for multiple topics with retry logic.
    
    This function is designed for monitors that need to consume from multiple
    related topics (e.g., city-speed-sensors, city-weather-sensors, city-camera-sensors).
    
    Args:
        bootstrap_servers: Comma-separated list of Kafka broker addresses
        topics: List of topic names to subscribe to
        group_id: Consumer group identifier
        max_retries: Maximum number of connection attempts
        retry_delay: Seconds to wait between retries
        auto_offset_reset: Where to start reading ('earliest' or 'latest')
    
    Returns:
        Connected KafkaConsumer instance subscribed to all topics
    
    Raises:
        Exception: If connection fails after all retries
    """
    logger.info(
        f"🔄 Initializing Kafka multi-topic consumer (topics: {topics}, group: {group_id})..."
    )
    
    for attempt in range(1, max_retries + 1):
        try:
            consumer = KafkaConsumer(
                *topics,  # Expand topic list as positional arguments
                bootstrap_servers=bootstrap_servers.split(','),
                group_id=group_id,
                auto_offset_reset=auto_offset_reset,
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                api_version=(2, 5, 0)
            )
            logger.info(f"✓ Kafka multi-topic consumer connected successfully to {len(topics)} topics")
            return consumer
            
        except NoBrokersAvailable as e:
            if attempt < max_retries:
                logger.warning(
                    f"⚠ Kafka connection attempt {attempt}/{max_retries} failed. "
                    f"Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            else:
                logger.error(f"✗ Failed to connect to Kafka after {max_retries} attempts")
                raise Exception(f"Kafka connection failed: {e}")
    
    raise Exception("Kafka multi-topic consumer initialization failed")

