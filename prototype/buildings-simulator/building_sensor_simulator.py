"""
Building Sensor Simulator Module

Simulates all sensor data for a single building including:
- Air quality sensors (PM2.5, PM10, NO2, CO, O3, VOC)
- Acoustic sensors (noise levels)
- Display sensors (messages and status)
- Emergency exit monitoring
- Elevator status simulation
"""

import random
from datetime import datetime
from typing import Dict, Any, List


class BuildingSensorSimulator:
    """
    Simulates all sensors for a building.
    
    Generates realistic data for building safety, environmental monitoring,
    and emergency management systems.
    """
    
    def __init__(self, building_config: Dict[str, Any]):
        """
        Initialize building sensor simulator.
        
        Args:
            building_config: Complete building configuration from buildings.json
        """
        self.building_id = building_config['building_id']
        self.building_name = building_config['name']
        self.building_type = building_config['type']
        self.location = building_config['location']
        
        # Managed resources
        self.emergency_exits = building_config['managed_resources']['emergency_exits']
        self.elevators = building_config['managed_resources']['elevators']
        
        # Sensors configuration
        self.sensors_config = building_config['sensors']
    
    def _simulate_air_quality_reading(self, aq_sensor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate air quality sensor reading with realistic variations.
        
        Args:
            aq_sensor: Air quality sensor configuration
            
        Returns:
            Updated sensor data with new measurements
        """
        sensor_type = aq_sensor.get('type', 'outdoor')
        base_measurements = aq_sensor['measurements']
        
        # Add small random variations to create realistic data
        new_measurements = {}
        for key, base_value in base_measurements.items():
            # ±10% variation
            variation = random.uniform(-0.1, 0.1)
            new_value = base_value * (1 + variation)
            new_measurements[key] = round(new_value, 1)
        
        return {
            'sensor_id': aq_sensor['sensor_id'],
            'location': aq_sensor['location'],
            'type': sensor_type,
            'measurements': new_measurements,
            'last_reading': datetime.utcnow().isoformat() + 'Z',
            'status': 'operational'
        }
    
    def _simulate_acoustic_reading(self, acoustic_sensor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate acoustic sensor reading with realistic variations.
        
        Args:
            acoustic_sensor: Acoustic sensor configuration
            
        Returns:
            Updated sensor data with new measurements
        """
        base_measurements = acoustic_sensor['measurements']
        
        # Add variations
        new_measurements = {}
        for key, base_value in base_measurements.items():
            variation = random.uniform(-0.08, 0.08)
            new_value = base_value * (1 + variation)
            new_measurements[key] = round(new_value, 1)
        
        return {
            'sensor_id': acoustic_sensor['sensor_id'],
            'location': acoustic_sensor['location'],
            'type': acoustic_sensor.get('type', 'outdoor'),
            'measurements': new_measurements,
            'last_reading': datetime.utcnow().isoformat() + 'Z',
            'status': 'operational'
        }
    
    def _simulate_display_status(self, display: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate display sensor status.
        
        Args:
            display: Display configuration
            
        Returns:
            Current display status
        """
        # No changes for displays, just return current state
        # In a real system, messages would be updated by control center
        return {
            'sensor_id': display['sensor_id'],
            'type': display['type'],
            'location': display['location'],
            'coordinates': display.get('coordinates'),
            'current_message': display['current_message'],
            'operational': display['operational'],
            'last_update': display.get('last_update', datetime.utcnow().isoformat() + 'Z')
        }
    
    def _simulate_emergency_exit_status(self, exit_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate emergency exit status with rare failures.
        
        Args:
            exit_config: Exit configuration
            
        Returns:
            Current exit status
        """
        # Very rare chance of status change (0.1%)
        current_status = exit_config['status']
        if random.random() < 0.001:
            current_status = 'locked' if current_status == 'unlocked' else 'unlocked'
        
        # Very rare chance of operational failure (0.05%)
        operational = exit_config['operational']
        if random.random() < 0.0005:
            operational = not operational
        
        return {
            'exit_id': exit_config['exit_id'],
            'location': exit_config['location'],
            'floor': exit_config['floor'],
            'status': current_status,
            'operational': operational,
            'width_m': exit_config['width_m'],
            'last_check': datetime.utcnow().isoformat() + 'Z'
        }
    
    def _simulate_elevator_status(self, elevator: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate elevator status with movement and occasional failures.
        
        Args:
            elevator: Elevator configuration
            
        Returns:
            Current elevator status with possible position changes
        """
        current_status = elevator['status']
        current_floor = elevator.get('current_floor', 0)
        
        # If operational, simulate movement (20% chance)
        if current_status == 'operational' and random.random() < 0.2:
            # Move to a random floor
            max_floors = 10  # Assume max 10 floors
            current_floor = random.randint(0, max_floors)
        
        # Very rare chance of failure (0.1%)
        if current_status == 'operational' and random.random() < 0.001:
            current_status = random.choice(['blocked', 'out_of_service'])
        
        # Rare chance of recovery (1% if not operational)
        if current_status != 'operational' and random.random() < 0.01:
            current_status = 'operational'
        
        result = {
            'elevator_id': elevator['elevator_id'],
            'location': elevator['location'],
            'status': current_status,
            'current_floor': current_floor,
            'capacity_persons': elevator['capacity_persons']
        }
        
        # Add fault description if not operational
        if current_status != 'operational':
            result['fault_description'] = elevator.get('fault_description', 'Unknown malfunction')
        
        return result
    
    def generate_data(self) -> Dict[str, Any]:
        """
        Generate complete building sensor data.
        
        Returns:
            Dictionary with all building sensor readings and status
        """
        # Simulate all air quality sensors
        air_quality_data = []
        for aq_sensor in self.sensors_config.get('air_quality', []):
            air_quality_data.append(self._simulate_air_quality_reading(aq_sensor))
        
        # Simulate all acoustic sensors
        acoustic_data = []
        for acoustic_sensor in self.sensors_config.get('acoustic', []):
            acoustic_data.append(self._simulate_acoustic_reading(acoustic_sensor))
        
        # Simulate all displays
        displays_data = []
        for display in self.sensors_config.get('displays', []):
            displays_data.append(self._simulate_display_status(display))
        
        # Simulate all emergency exits
        exits_data = []
        for exit_config in self.emergency_exits:
            exits_data.append(self._simulate_emergency_exit_status(exit_config))
        
        # Simulate all elevators
        elevators_data = []
        for elevator in self.elevators:
            elevators_data.append(self._simulate_elevator_status(elevator))
        
        # Build complete data payload
        data = {
            'building_id': self.building_id,
            'building_name': self.building_name,
            'building_type': self.building_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            
            # Location (fixed)
            'location': {
                'latitude': self.location['latitude'],
                'longitude': self.location['longitude'],
                'altitude_m': self.location.get('altitude_m', 0),
                'address': self.location.get('address', '')
            },
            
            # Sensors
            'sensors': {
                'air_quality': air_quality_data,
                'acoustic': acoustic_data,
                'displays': displays_data
            },
            
            # Managed Resources
            'managed_resources': {
                'emergency_exits': exits_data,
                'elevators': elevators_data
            }
        }
        
        return data
