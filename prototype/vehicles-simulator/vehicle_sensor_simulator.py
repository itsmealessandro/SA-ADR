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
        
        # SIMULATION STATE - Stato interno della simulazione
        self.time_since_last_update = 0
        # Probabilità che il veicolo si fermi (30% se già fermo, 5% se in movimento)
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
            }
        }
        
        return data
