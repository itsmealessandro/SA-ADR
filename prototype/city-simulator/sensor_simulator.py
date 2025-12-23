"""
Sensor Simulator Module

This module contains the logic for simulating different types of sensors:
- Speed sensors: Monitor vehicle speed on roads
- Weather sensors: Monitor temperature, humidity, and weather conditions  
- Camera sensors: Perform edge analytics on road conditions

Each sensor type generates realistic data with proper aggregation from
multiple physical sensors at the same location.
"""

import random
from collections import deque
from typing import Any, Dict, List, Optional


class SensorSimulator:
    """
    Base class for sensor simulation.
    
    Handles common functionality like data buffers and GPS coordinate calculations.
    Subclasses implement specific sensor logic.
    """
    
    def __init__(self, location: Dict[str, float]):
        """
        Initialize sensor simulator.
        
        Args:
            location: Dict with 'latitude' and 'longitude' keys for base location
        """
        self.location = location
    
    def calculate_sensor_gps(self, sensor_config: Dict) -> tuple:
        """
        Calculate GPS coordinates for a specific sensor with offset.
        
        Uses actual edge coordinates from graph data if available (stored in base_location),
        otherwise falls back to gateway location with offset.
        
        Args:
            sensor_config: Sensor configuration with optional offset_lat, offset_lon,
                          and base_location (actual edge coordinates from graph)
            
        Returns:
            Tuple of (latitude, longitude) rounded to 6 decimal places
        """
        # Use actual edge location if available, otherwise use gateway location
        base_location = sensor_config.get('base_location')
        if base_location:
            lat = base_location['latitude'] + sensor_config.get('offset_lat', 0)
            lon = base_location['longitude'] + sensor_config.get('offset_lon', 0)
        else:
            lat = self.location['latitude'] + sensor_config.get('offset_lat', 0)
            lon = self.location['longitude'] + sensor_config.get('offset_lon', 0)
        
        return round(lat, 6), round(lon, 6)


class SpeedSensorSimulator(SensorSimulator):
    """
    Speed Sensor Simulator
    
    Simulates multiple speed sensors (e.g., radar detectors) at a road section.
    Implements pre-aggregation with moving average to smooth out noise.
    """
    
    def __init__(self, location: Dict[str, float]):
        super().__init__(location)
        # Moving average window - stores last 10 aggregated readings
        self.speed_window = deque(maxlen=10)
    
    def generate_data(self, sensors_config: List[Dict], gateway_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Generate aggregated speed data from multiple speed sensors.
        
        Process:
        1. Simulate reading from each physical sensor (random 20-120 km/h)
        2. Calculate average across all sensors (current reading)
        3. Add to moving average window
        4. Calculate edge-level speed (average of window)
        
        Args:
            sensors_config: List of sensor configurations with IDs, positions,
                           and individual edge_id for each sensor
            gateway_id: ID of the gateway collecting this data
            
        Returns:
            Dict with aggregated speed data, or None if no sensors configured
        """
        if not sensors_config:
            return None
        
        # Step 1: Collect readings from each physical sensor
        sensor_readings = []
        for sensor in sensors_config:
            # Simulate speed reading (realistic range for city traffic)
            current_speed = random.uniform(20, 120)
            lat, lon = self.calculate_sensor_gps(sensor)
            
            # Each sensor has its own edge_id from config
            sensor_reading = {
                'sensor_id': sensor['sensor_id'],
                'sensor_type': 'speed',
                'gateway_id': gateway_id,
                'edge_id': sensor.get('edge_id'),  # Per-sensor edge_id
                'speed_kmh': round(current_speed, 2),
                'latitude': lat,
                'longitude': lon,
                'unit': 'km/h',
                'status': 'active'
            }
            sensor_readings.append(sensor_reading)
        
        # Step 2: Calculate instantaneous average across sensors
        avg_speed = sum(r['speed_kmh'] for r in sensor_readings) / len(sensor_readings)
        
        # Step 3: Add to moving average window (smoothing)
        self.speed_window.append(avg_speed)
        
        # Step 4: Calculate final edge-level speed (temporal smoothing)
        edge_avg_speed = sum(self.speed_window) / len(self.speed_window)
        
        return {
            'readings': sensor_readings,
            'aggregated': {
                'avg_speed_kmh': round(edge_avg_speed, 2),
                'sensor_count': len(sensor_readings),
                'sample_count': len(self.speed_window)
            }
        }


class WeatherSensorSimulator(SensorSimulator):
    """
    Weather Sensor Simulator
    
    Simulates weather stations measuring temperature, humidity, and conditions.
    Multiple sensors provide redundancy and better coverage of the area.
    """
    
    def __init__(self, location: Dict[str, float]):
        super().__init__(location)
        # Moving average window for temperature smoothing
        self.temp_window = deque(maxlen=10)
    
    def generate_data(self, sensors_config: List[Dict], gateway_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Generate aggregated weather data from multiple weather stations.
        
        Process:
        1. Simulate readings from each weather station
        2. Calculate spatial average (average across sensors)
        3. Apply temporal smoothing for temperature
        4. Weather conditions are assumed same for all sensors in area
        
        Args:
            sensors_config: List of weather sensor configurations with
                           individual edge_id for each sensor
            gateway_id: ID of the gateway collecting this data
            
        Returns:
            Dict with aggregated weather data, or None if no sensors
        """
        if not sensors_config:
            return None
        
        # Weather conditions (same for all sensors in this area)
        weather_conditions = random.choice([
            'clear', 'cloudy', 'rainy', 'foggy', 'snowy'
        ])
        
        # Step 1: Collect readings from each weather station
        sensor_readings = []
        for sensor in sensors_config:
            # Realistic temperature range for L'Aquila (-10°C to 40°C)
            current_temp = random.uniform(-10, 40)
            # Humidity range (30-95%)
            current_humidity = random.uniform(30, 95)
            lat, lon = self.calculate_sensor_gps(sensor)
            
            # Each sensor has its own edge_id from config
            sensor_reading = {
                'sensor_id': sensor['sensor_id'],
                'sensor_type': 'weather',
                'gateway_id': gateway_id,
                'edge_id': sensor.get('edge_id'),  # Per-sensor edge_id
                'temperature_c': round(current_temp, 2),
                'humidity': round(current_humidity, 2),
                'weather_conditions': weather_conditions,
                'latitude': lat,
                'longitude': lon,
                'unit': '°C',
                'status': 'active'
            }
            sensor_readings.append(sensor_reading)
        
        # Step 2: Calculate spatial averages
        avg_temp = sum(r['temperature_c'] for r in sensor_readings) / len(sensor_readings)
        avg_humidity = sum(r['humidity'] for r in sensor_readings) / len(sensor_readings)
        
        # Step 3: Apply temporal smoothing to temperature
        self.temp_window.append(avg_temp)
        edge_avg_temp = sum(self.temp_window) / len(self.temp_window)
        
        return {
            'readings': sensor_readings,
            'aggregated': {
                'avg_temperature_c': round(edge_avg_temp, 2),
                'avg_humidity': round(avg_humidity, 2),
                'weather_conditions': weather_conditions,
                'sensor_count': len(sensor_readings),
                'sample_count': len(self.temp_window)
            }
        }


class CameraSensorSimulator(SensorSimulator):
    """
    Camera Sensor Simulator with Edge Analytics
    
    Simulates traffic cameras that perform on-edge computer vision analysis.
    Instead of sending raw images/video, cameras analyze the scene locally and
    send only the analysis results (road condition, confidence, vehicle count).
    
    This is a key edge computing pattern: process data where it's generated
    to reduce bandwidth and latency.
    """
    
    def __init__(self, location: Dict[str, float]):
        super().__init__(location)
        # State tracking for realistic condition persistence
        # (real road conditions don't change every second)
        self.last_road_condition = 'clear'
        self.condition_persistence = 0  # Frames remaining with same condition
    
    def generate_data(self, sensors_config: List[Dict], gateway_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Generate aggregated camera analytics from multiple cameras.
        
        Edge Analytics Process:
        1. Each camera analyzes its view independently
        2. Detects road condition (clear, congestion, accident, etc.)
        3. Calculates confidence score for detection
        4. Counts vehicles if applicable
        5. Edge aggregates: reports most critical condition detected
        
        Criticality Priority: accident > flooding > obstacles > congestion > clear
        
        Args:
            sensors_config: List of camera sensor configurations with
                           individual edge_id for each sensor
            gateway_id: ID of the gateway collecting this data
            
        Returns:
            Dict with aggregated road condition analysis, or None if no cameras
        """
        if not sensors_config:
            return None
        
        # Probability distribution for road conditions
        # (realistic distribution for normal city traffic)
        road_conditions = [
            ('clear', 0.50),        # 50% - Normal traffic
            ('congestion', 0.25),   # 25% - Traffic jam
            ('accident', 0.05),     # 5%  - Accident
            ('obstacles', 0.10),    # 10% - Debris/obstacles
            ('flooding', 0.10)      # 10% - Water on road
        ]
        
        # Step 1: Each camera performs independent analysis
        sensor_readings = []
        for sensor in sensors_config:
            # Simulate computer vision detection
            conditions, probabilities = zip(*road_conditions)
            detected_condition = random.choices(conditions, probabilities)[0]
            
            # Confidence score (0.75-0.98 for good quality cameras)
            confidence = random.uniform(0.75, 0.98)
            
            # Vehicle counting (only relevant for clear/congestion)
            vehicle_count = None
            if detected_condition == 'clear':
                vehicle_count = random.randint(0, 15)  # Light traffic
            elif detected_condition == 'congestion':
                vehicle_count = random.randint(20, 80)  # Heavy traffic
            
            lat, lon = self.calculate_sensor_gps(sensor)
            
            # Each sensor has its own edge_id from config
            sensor_reading = {
                'sensor_id': sensor['sensor_id'],
                'sensor_type': 'camera',
                'gateway_id': gateway_id,
                'edge_id': sensor.get('edge_id'),  # Per-sensor edge_id
                'road_condition': detected_condition,
                'confidence': round(confidence, 3),
                'vehicle_count': vehicle_count,
                'latitude': lat,
                'longitude': lon,
                'unit': 'vehicles',
                'status': 'active'
            }
            sensor_readings.append(sensor_reading)
        
        # Step 2: Aggregate - use most critical condition detected
        # This is important for safety: if any camera sees an accident, report it
        condition_priority = {
            'accident': 5,
            'flooding': 4,
            'obstacles': 3,
            'congestion': 2,
            'clear': 1
        }
        
        most_critical = max(sensor_readings, 
                          key=lambda x: condition_priority[x['road_condition']])
        edge_road_condition = most_critical['road_condition']
        
        # Average confidence across cameras detecting the same condition
        same_condition_readings = [
            r for r in sensor_readings 
            if r['road_condition'] == edge_road_condition
        ]
        edge_confidence = sum(r['confidence'] for r in same_condition_readings) / len(same_condition_readings)
        
        # Step 3: Apply condition persistence (temporal coherence)
        # Real conditions persist for multiple iterations
        if self.condition_persistence > 0:
            self.condition_persistence -= 1
            edge_road_condition = self.last_road_condition
        else:
            self.last_road_condition = edge_road_condition
            # New condition will persist for 3-8 iterations
            self.condition_persistence = random.randint(3, 8)
        
        # Aggregate vehicle count if available
        edge_vehicle_count = None
        vehicle_counts = [
            r['vehicle_count'] for r in sensor_readings 
            if r['vehicle_count'] is not None
        ]
        if vehicle_counts:
            edge_vehicle_count = int(sum(vehicle_counts) / len(vehicle_counts))
        
        return {
            'readings': sensor_readings,
            'aggregated': {
                'road_condition': edge_road_condition,
                'confidence': round(edge_confidence, 3),
                'vehicle_count': edge_vehicle_count,
                'sensor_count': len(sensor_readings)
            }
        }
