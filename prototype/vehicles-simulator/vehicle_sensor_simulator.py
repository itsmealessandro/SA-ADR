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
        # IDENTIFICAZIONE DEL VEICOLO
        # vehicle_id: Identificatore univoco del veicolo (es. "vehicle-emergency-001")
        # Usato per tracciare il veicolo specifico nel sistema
        self.vehicle_id = vehicle_config['vehicle_id']
        
        # vehicle_type: Tipo di veicolo (ambulance, firetruck, police, bus, delivery)
        # Determina il comportamento di movimento e le priorità nelle emergenze
        self.vehicle_type = vehicle_config['type']
        
        # GPS POSITION - Posizione GPS corrente del veicolo
        # latitude: Latitudine in gradi decimali (es. 42.3506)
        # longitude: Longitudine in gradi decimali (es. 13.3992)
        # altitude_m: Altitudine in metri sul livello del mare
        # PERCHÉ È IMPORTANTE: Permette il tracciamento in tempo reale della posizione
        # del veicolo sulla mappa del Digital Twin per coordinare i soccorsi
        self.current_position = vehicle_config['gps_position'].copy()
        
        # MOVEMENT - Parametri di movimento del veicolo
        # speed_kmh: Velocità attuale in chilometri all'ora
        # PERCHÉ È IMPORTANTE: Aiuta a stimare i tempi di arrivo (ETA) e a rilevare
        # situazioni anomale (es. veicolo di emergenza fermo nel traffico)
        self.current_speed_kmh = vehicle_config['movement']['speed_kmh']
        
        # direction_degrees: Direzione in gradi (0=Nord, 90=Est, 180=Sud, 270=Ovest)
        # PERCHÉ È IMPORTANTE: Combinato con la velocità, permette di calcolare
        # la nuova posizione GPS e prevedere il percorso del veicolo
        self.current_direction = vehicle_config['movement']['direction_degrees']
        
        # MANAGED RESOURCES - Risorse gestite del veicolo edge
        # battery_level_percent: Livello batteria in percentuale (0-100%)
        # PERCHÉ È IMPORTANTE: Monitorare la batteria previene disservizi.
        # Se la batteria è bassa, il sistema può pianificare la ricarica o
        # assegnare un veicolo alternativo per l'emergenza
        self.battery_level = vehicle_config['managed_resources']['battery_level_percent']
        
        # firmware_version: Versione del firmware di bordo (es. "v2.3.1")
        # PERCHÉ È IMPORTANTE: Permette di verificare che tutti i veicoli abbiano
        # il software aggiornato e pianificare aggiornamenti centralizati
        self.firmware_version = vehicle_config['managed_resources']['firmware_version']
        
        # SENSORS - Configurazione sensori
        # accelerometer: Sensore accelerometro per rilevare urti/incidenti
        # threshold_g: Soglia di accelerazione in g (forza gravitazionale)
        #              Tipicamente 3.5g = accelerazione superiore a 3.5 volte la gravità
        # PERCHÉ È IMPORTANTE: Rileva automaticamente incidenti stradali e genera
        # allerte prioritarie per i soccorsi, anche se il conducente non può chiamare
        self.accelerometer_config = vehicle_config['sensors']['accelerometer']
        self.incident_detected = False  # Flag: True se è stato rilevato un incidente
        
        # ROUTE PLANNING - Pianificazione percorso
        # current_destination: Destinazione attuale con coordinate lat/lon
        # predicted_destinations: Lista di destinazioni previste con probabilità e ETA
        # route_priority: Priorità del percorso (critical, high, normal, standby)
        # PERCHÉ È IMPORTANTE: Permette la modellazione predittiva del traffico.
        # Se molti veicoli sono diretti nella stessa zona, il sistema può prevedere
        # congestione e suggerire percorsi alternativi ai soccorsi
        self.route_planning = vehicle_config.get('route_planning', {})
        
        # ROUTE PATH - Tracciato con waypoints GPS
        # route_path: Percorso definito come sequenza di waypoints con coordinate GPS
        # Usato per simulare movimento realistico del veicolo lungo un percorso predefinito
        self.route_path = vehicle_config.get('route_path', {})
        self.waypoints = self.route_path.get('waypoints', [])
        
        # Waypoint tracking - Traccia quale waypoint il veicolo sta cercando di raggiungere
        self.current_waypoint_index = 0 if self.waypoints else None
        self.waypoint_proximity_threshold = 0.0001  # ~11 metri in gradi lat/lon
        
        # SIMULATION STATE - Stato interno della simulazione
        self.time_since_last_update = 0
        # Probabilità che il veicolo si fermi (30% se già fermo, 5% se in movimento)
        self.stationary_probability = 0.3 if vehicle_config['movement']['speed_kmh'] == 0 else 0.05
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two GPS coordinates using Haversine formula.
        
        Args:
            lat1, lon1: First coordinate
            lat2, lon2: Second coordinate
            
        Returns:
            Distance in meters
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth radius in meters
        radius = 6371000
        
        return radius * c
    
    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate bearing (direction) from point 1 to point 2.
        
        Args:
            lat1, lon1: Starting coordinate
            lat2, lon2: Target coordinate
            
        Returns:
            Bearing in degrees (0-360, where 0=North)
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        # Calculate bearing
        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        
        bearing_rad = math.atan2(x, y)
        bearing_deg = (math.degrees(bearing_rad) + 360) % 360
        
        return bearing_deg
    
    def _is_near_waypoint(self, waypoint: Dict[str, Any]) -> bool:
        """
        Check if vehicle is near a waypoint.
        
        Args:
            waypoint: Waypoint dict with latitude/longitude
            
        Returns:
            True if within proximity threshold
        """
        dist = abs(self.current_position['latitude'] - waypoint['latitude']) + \
               abs(self.current_position['longitude'] - waypoint['longitude'])
        return dist < self.waypoint_proximity_threshold
    
    def _move_to_next_waypoint(self):
        """
        Advance to the next waypoint in the route.
        Loops back to start when reaching the end.
        """
        if not self.waypoints:
            return
        
        self.current_waypoint_index = (self.current_waypoint_index + 1) % len(self.waypoints)
    
    def _update_position(self, delta_time_seconds: float = 3.0):
        """
        Update GPS position based on waypoints or random movement.
        
        If waypoints are defined, vehicle follows the route_path.
        Otherwise, uses legacy random movement.
        
        Args:
            delta_time_seconds: Time elapsed since last update
        """
        if self.current_speed_kmh == 0:
            return  # Vehicle is stationary
        
        # WAYPOINT-BASED MOVEMENT
        if self.waypoints and self.current_waypoint_index is not None:
            target_waypoint = self.waypoints[self.current_waypoint_index]
            
            # Check if reached current waypoint
            if self._is_near_waypoint(target_waypoint):
                self._move_to_next_waypoint()
                target_waypoint = self.waypoints[self.current_waypoint_index]
            
            # Calculate direction to target waypoint
            self.current_direction = self._calculate_bearing(
                self.current_position['latitude'],
                self.current_position['longitude'],
                target_waypoint['latitude'],
                target_waypoint['longitude']
            )
        
        # LEGACY RANDOM MOVEMENT (fallback if no waypoints)
        # Move vehicle in current direction
        
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
        # If following waypoints, maintain more consistent speed
        if self.waypoints and self.current_waypoint_index is not None:
            # Slight speed variation for realism
            if self.current_speed_kmh > 0:
                variation = random.uniform(-2, 2)
                self.current_speed_kmh = max(0, min(120, self.current_speed_kmh + variation))
            return
        
        # Legacy random speed behavior (for vehicles without waypoints)
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
        # If following waypoints, direction is calculated automatically
        # No random direction changes needed
        if self.waypoints and self.current_waypoint_index is not None:
            return
        
        # Legacy random direction behavior (for vehicles without waypoints)
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
        Genera i dati completi dei sensori del veicolo.
        
        Questo metodo viene chiamato ogni ~3 secondi per ogni veicolo e produce
        un payload JSON completo con tutte le metriche correnti.
        
        Returns:
            Dictionary con tutte le letture dei sensori e i metadati del veicolo
        """
        # Simula il movimento e i cambiamenti dei sensori nel tempo
        self._update_position(delta_time_seconds=3.0)
        self._simulate_speed_variation()
        self._simulate_direction_change()
        self._simulate_battery_drain()
        incident_flag = self._check_incident_detection()
        
        # Costruisce il payload completo dei dati
        data = {
            # === IDENTIFICAZIONE ===
            'vehicle_id': self.vehicle_id,  # ID univoco per tracciare questo veicolo specifico
            'vehicle_type': self.vehicle_type,  # Tipo: ambulance, firetruck, police, bus, delivery
            'timestamp': datetime.utcnow().isoformat() + 'Z',  # Timestamp UTC ISO 8601
            
            # === GPS POSITION - Posizione in tempo reale ===
            # Usata per visualizzare il veicolo sulla mappa del Digital Twin
            'gps_position': {
                # latitude: Latitudine in gradi decimali (es. 42.350600)
                # Range: -90 (Polo Sud) a +90 (Polo Nord)
                # Per L'Aquila: ~42.35° (Italia centrale)
                'latitude': round(self.current_position['latitude'], 6),
                
                # longitude: Longitudine in gradi decimali (es. 13.399200)
                # Range: -180 (Ovest) a +180 (Est)
                # Per L'Aquila: ~13.40° (fuso orario +1)
                'longitude': round(self.current_position['longitude'], 6),
                
                # altitude_m: Altitudine in metri sul livello del mare
                # L'Aquila è a ~721m di altitudine (città di montagna)
                'altitude_m': self.current_position.get('altitude_m', 0)
            },
            
            # === MOVEMENT - Parametri di movimento ===
            # Usati per calcolare la posizione futura e stimare i tempi di arrivo
            'movement': {
                # speed_kmh: Velocità in chilometri all'ora (km/h)
                # Es: 0 = fermo, 50 = traffico urbano, 80+ = emergenza con sirene
                'speed_kmh': round(self.current_speed_kmh, 1),
                
                # direction_degrees: Direzione bussola in gradi (0-359)
                # 0° = Nord, 90° = Est, 180° = Sud, 270° = Ovest
                # Usato per calcolare il vettore di movimento
                'direction_degrees': int(self.current_direction),
                
                # heading: Direzione in formato testuale (north, northeast, east, ...)
                # Più facile da leggere per gli operatori umani
                'heading': self._get_heading_description()
            },
            
            # === MANAGED RESOURCES - Stato dispositivo edge ===
            # Informazioni sulla salute hardware/software del sistema di bordo
            'managed_resources': {
                # battery_level_percent: Livello batteria 0-100%
                # CRITICO: Se scende sotto il 20%, pianificare ricarica o sostituzione veicolo
                # Se <10% durante emergenza, potrebbe non arrivare a destinazione
                'battery_level_percent': round(self.battery_level, 1),
                
                # firmware_version: Versione software di bordo (es. "v2.3.1")
                # Usato per verificare aggiornamenti di sicurezza e nuove funzionalità
                # Importante per compatibilità con protocolli centrali
                'firmware_version': self.firmware_version
            },
            
            # === SENSORS - Dati sensori fisici ===
            'sensors': {
                # ACCELEROMETER - Accelerometro per rilevamento incidenti
                'accelerometer': {
                    'sensor_id': self.accelerometer_config['sensor_id'],  # ID univoco sensore
                    
                    # incident_detected: Booleano - True se rilevato urto violento
                    # ALLERTA CRITICA: Se True, genera automaticamente chiamata soccorsi
                    # Anche se autista incosciente, il sistema rileva l'incidente
                    'incident_detected': incident_flag,
                    
                    # threshold_g: Soglia di rilevamento in multipli della gravità terrestre
                    # 1g = gravità normale, 3.5g = accelerazione/decelerazione violenta
                    # Es: Crash frontale a 50km/h ≈ 20-30g
                    #     Frenata di emergenza ≈ 1g
                    #     Soglia 3.5g = filtra frenate normali, rileva solo urti seri
                    'threshold_g': self.accelerometer_config.get('threshold_g', 3.5),
                    
                    'last_reading_timestamp': datetime.utcnow().isoformat() + 'Z'
                }
            },
            
            # === ROUTE PLANNING - Pianificazione intelligente percorso ===
            # Usato per modellazione predittiva del traffico e ottimizzazione percorsi
            'route_planning': {
                # current_destination: Dove sta andando ORA il veicolo
                # {latitude, longitude, location_name}
                # Es: Ambulanza diretta a "Ospedale San Salvatore"
                'current_destination': self.route_planning.get('current_destination'),
                
                # predicted_destinations: Lista di possibili prossime destinazioni
                # Ogni elemento ha: {latitude, longitude, location_name, eta_minutes, probability}
                # ESEMPIO PRATICO:
                # Ambulanza al Duomo potrebbe andare:
                #   - Ospedale (prob 85%, ETA 8min) ← più probabile
                #   - Altra emergenza (prob 15%, ETA variabile)
                # USO: Se 10 veicoli vanno verso stesso punto → prevedi congestione
                'predicted_destinations': self.route_planning.get('predicted_destinations', []),
                
                # route_priority: Livello di priorità del percorso
                # - "critical": Emergenza massima (codice rosso), precedenza assoluta
                # - "high": Emergenza alta, richiede via libera
                # - "normal": Traffico normale
                # - "standby": Veicolo in attesa/parcheggiato
                'route_priority': self.route_planning.get('route_priority', 'normal')
            },
            
            # === ROUTE PATH - Tracciato completo del percorso ===
            # Permette la visualizzazione della polilinea sulla mappa
            'route_path': {
                'description': self.route_path.get('description', ''),
                'waypoints': self.waypoints
            }
        }
        
        return data
