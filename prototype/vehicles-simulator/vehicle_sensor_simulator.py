"""
Vehicle Sensor Simulator Module

Simulates all sensor data for a single vehicle including:
- GPS position (with realistic movement)
- Speed and direction tracking
- Battery level monitoring
- Firmware version tracking
- Accelerometer for incident detection
- Route planning data
"""

import random
import math
from datetime import datetime
from typing import Dict, Any, List, Optional


class VehicleSensorSimulator:
    """
    Simulates all sensors for a vehicle.
    
    Generates realistic data for vehicle tracking, monitoring and emergency detection.
    """
    
    def __init__(self, vehicle_config: Dict[str, Any]):
        """
        Initialize vehicle sensor simulator.
        
        Args:
            vehicle_config: Complete vehicle configuration from vehicles.json
        """
        self.vehicle_id = vehicle_config['vehicle_id']
        self.vehicle_type = vehicle_config['type']
        
        # Current GPS position (will be updated during movement)
        self.current_position = vehicle_config['gps_position'].copy()
        
        # Movement parameters
        self.current_speed_kmh = vehicle_config['movement']['speed_kmh']
        self.current_direction = vehicle_config['movement']['direction_degrees']
        
        # Managed resources
        self.battery_level = vehicle_config['managed_resources']['battery_level_percent']
        self.firmware_version = vehicle_config['managed_resources']['firmware_version']
        
        # Sensors
        self.accelerometer_config = vehicle_config['sensors']['accelerometer']
        self.incident_detected = False
        
        # Route planning
        self.route_planning = vehicle_config.get('route_planning', {})
        
        # Movement simulation state
        self.time_since_last_update = 0
        self.stationary_probability = 0.3 if vehicle_config['movement']['speed_kmh'] == 0 else 0.05
    
    def _update_position(self, delta_time_seconds: float = 3.0):
        """
        Update GPS position based on current speed and direction.
        
        Uses simple geographic approximation for movement.
        
        Args:
            delta_time_seconds: Time elapsed since last update
        """
        if self.current_speed_kmh == 0:
            return  # Vehicle is stationary
        
        # Convert speed to meters per second
        speed_ms = self.current_speed_kmh / 3.6
        
        # Distance traveled in meters
        distance_m = speed_ms * delta_time_seconds
        
        # Convert direction to radians
        direction_rad = math.radians(self.current_direction)
        
        # Calculate displacement in meters (North and East components)
        delta_north = distance_m * math.cos(direction_rad)
        delta_east = distance_m * math.sin(direction_rad)
        
        # Convert to lat/lon changes (approximate)
        # 1 degree latitude ≈ 111,320 meters
        # 1 degree longitude ≈ 111,320 * cos(latitude) meters
        lat_current = self.current_position['latitude']
        
        delta_lat = delta_north / 111320.0
        delta_lon = delta_east / (111320.0 * math.cos(math.radians(lat_current)))
        
        # Update position
        self.current_position['latitude'] += delta_lat
        self.current_position['longitude'] += delta_lon
    
    def _simulate_speed_variation(self):
        """Simulate realistic speed variations (acceleration/deceleration)."""
        if random.random() < self.stationary_probability:
            # Come to a stop
            self.current_speed_kmh = 0
        elif self.current_speed_kmh == 0:
            # Start moving again
            if self.vehicle_type in ['ambulance', 'firetruck', 'police']:
                self.current_speed_kmh = random.uniform(20, 60)
            elif self.vehicle_type == 'bus':
                self.current_speed_kmh = random.uniform(10, 40)
            else:
                self.current_speed_kmh = random.uniform(10, 50)
        else:
            # Small speed variation
            variation = random.uniform(-5, 5)
            self.current_speed_kmh = max(0, min(120, self.current_speed_kmh + variation))
    
    def _simulate_direction_change(self):
        """Simulate realistic direction changes (turns)."""
        if random.random() < 0.1:  # 10% chance of direction change
            # Small turn
            direction_change = random.uniform(-30, 30)
            self.current_direction = (self.current_direction + direction_change) % 360
    
    def _simulate_battery_drain(self):
        """Simulate battery drain over time."""
        if self.current_speed_kmh > 0:
            # Battery drains when moving
            drain_rate = 0.05  # 0.05% per reading
            self.battery_level = max(0, self.battery_level - drain_rate)
        
        # Randomly recharge when stationary
        if self.current_speed_kmh == 0 and random.random() < 0.1:
            self.battery_level = min(100, self.battery_level + 5)
    
    def _check_incident_detection(self) -> bool:
        """
        Simulate accelerometer incident detection.
        
        Returns:
            True if incident detected, False otherwise
        """
        # Very low probability of incident (0.1%)
        if random.random() < 0.001:
            self.incident_detected = True
            return True
        
        # Reset after incident
        if self.incident_detected and random.random() < 0.05:
            self.incident_detected = False
        
        return self.incident_detected
    
    def _get_heading_description(self) -> str:
        """Convert direction degrees to cardinal direction."""
        directions = ['north', 'northeast', 'east', 'southeast', 
                      'south', 'southwest', 'west', 'northwest']
        index = int((self.current_direction + 22.5) / 45) % 8
        return directions[index]
    
    def generate_data(self) -> Dict[str, Any]:
        """
        Generate complete vehicle sensor data.
        
        Returns:
            Dictionary with all vehicle sensor readings and metadata
        """
        # Simulate movement and sensor changes
        self._update_position(delta_time_seconds=3.0)
        self._simulate_speed_variation()
        self._simulate_direction_change()
        self._simulate_battery_drain()
        incident_flag = self._check_incident_detection()
        
        # Build complete data payload
        data = {
            'vehicle_id': self.vehicle_id,
            'vehicle_type': self.vehicle_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            
            # GPS and movement
            'gps_position': {
                'latitude': round(self.current_position['latitude'], 6),
                'longitude': round(self.current_position['longitude'], 6),
                'altitude_m': self.current_position.get('altitude_m', 0)
            },
            'movement': {
                'speed_kmh': round(self.current_speed_kmh, 1),
                'direction_degrees': int(self.current_direction),
                'heading': self._get_heading_description()
            },
            
            # Managed resources
            'managed_resources': {
                'battery_level_percent': round(self.battery_level, 1),
                'firmware_version': self.firmware_version
            },
            
            # Sensors
            'sensors': {
                'accelerometer': {
                    'sensor_id': self.accelerometer_config['sensor_id'],
                    'incident_detected': incident_flag,
                    'threshold_g': self.accelerometer_config.get('threshold_g', 3.5),
                    'last_reading_timestamp': datetime.utcnow().isoformat() + 'Z'
                }
            },
            
            # Route planning
            'route_planning': {
                'current_destination': self.route_planning.get('current_destination'),
                'predicted_destinations': self.route_planning.get('predicted_destinations', []),
                'route_priority': self.route_planning.get('route_priority', 'normal')
            }
        }
        
        return data
