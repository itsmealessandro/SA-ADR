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
        # IDENTIFICAZIONE EDIFICIO
        # building_id: ID univoco dell'edificio (es. "building-hospital-001")
        self.building_id = building_config['building_id']
        
        # building_name: Nome descrittivo (es. "Ospedale San Salvatore")
        self.building_name = building_config['name']
        
        # building_type: Tipologia (hospital, school, office, religious, residential)
        # PERCHÉ È IMPORTANTE: Determina priorità evacuazione e requisiti sicurezza
        # Es: Ospedali richiedono piani evacuazione speciali per pazienti immobili
        self.building_type = building_config['type']
        
        # LOCATION - Posizione geografica fissa dell'edificio (non cambia nel tempo)
        self.location = building_config['location']
        
        # MANAGED RESOURCES - Risorse critiche gestite per la sicurezza
        
        # emergency_exits: Uscite di sicurezza (status, floor, width, operational)
        # PERCHÉ È IMPORTANTE: Durante evacuazione, il sistema deve sapere quali
        # uscite sono disponibili. Se un'uscita è bloccata/guasta → ricalcola percorso
        self.emergency_exits = building_config['managed_resources']['emergency_exits']
        
        # elevators: Ascensori (status, floor, capacity, faults)
        # PERCHÉ È IMPORTANTE: Durante emergenze sismiche, ascensori NON vanno usati.
        # Il sistema deve monitorare lo stato e disabilitarli se necessario.
        # In condizioni normali, utile per persone con disabilità motorie
        self.elevators = building_config['managed_resources']['elevators']
        
        # SENSORS CONFIGURATION - Configurazione di tutti i sensori installati
        # air_quality, acoustic, displays
        self.sensors_config = building_config['sensors']
    
    def _simulate_air_quality_reading(self, aq_sensor: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simula lettura sensore qualità dell'aria con variazioni realistiche.
        
        La qualità dell'aria è critica per la salute pubblica, specialmente
        in edifici pubblici (ospedali, scuole). Monitora inquinanti pericolosi.
        
        Args:
            aq_sensor: Air quality sensor configuration
            
        Returns:
            Updated sensor data with new measurements
        """
        sensor_type = aq_sensor.get('type', 'outdoor')  # indoor o outdoor
        base_measurements = aq_sensor['measurements']
        
        # Aggiunge piccole variazioni casuali per creare dati realistici
        # Nella realtà, qualità aria varia per: traffico, vento, temperatura, umidità
        new_measurements = {}
        for key, base_value in base_measurements.items():
            # Variazione ±10% per simulare fluttuazioni naturali
            variation = random.uniform(-0.1, 0.1)
            new_value = base_value * (1 + variation)
            new_measurements[key] = round(new_value, 1)
        
        return {
            'sensor_id': aq_sensor['sensor_id'],
            'location': aq_sensor['location'],  # Posizione sensore nell'edificio
            'type': sensor_type,  # indoor (dentro edificio) o outdoor (esterno)
            'measurements': new_measurements,  # Dizionario con tutte le misurazioni
            'last_reading': datetime.utcnow().isoformat() + 'Z',
            'status': 'operational'  # operational, maintenance, fault
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
        Genera i dati completi dei sensori dell'edificio.
        
        Chiamato ogni ~5 secondi per ogni edificio, produce un payload JSON
        completo con tutte le metriche ambientali e di sicurezza.
        
        Returns:
            Dictionary with all building sensor readings and status
        """
        # Simula tutti i sensori di qualità dell'aria
        air_quality_data = []
        for aq_sensor in self.sensors_config.get('air_quality', []):
            air_quality_data.append(self._simulate_air_quality_reading(aq_sensor))
        
        # Simula tutti i sensori acustici
        acoustic_data = []
        for acoustic_sensor in self.sensors_config.get('acoustic', []):
            acoustic_data.append(self._simulate_acoustic_reading(acoustic_sensor))
        
        # Simula tutti i display informativi
        displays_data = []
        for display in self.sensors_config.get('displays', []):
            displays_data.append(self._simulate_display_status(display))
        
        # Simula tutte le uscite di emergenza
        exits_data = []
        for exit_config in self.emergency_exits:
            exits_data.append(self._simulate_emergency_exit_status(exit_config))
        
        # Simula tutti gli ascensori
        elevators_data = []
        for elevator in self.elevators:
            elevators_data.append(self._simulate_elevator_status(elevator))
        
        # Costruisce il payload completo dei dati
        data = {
            # === IDENTIFICAZIONE EDIFICIO ===
            'building_id': self.building_id,  # ID univoco
            'building_name': self.building_name,  # Nome descrittivo
            'building_type': self.building_type,  # Tipologia edificio
            'timestamp': datetime.utcnow().isoformat() + 'Z',  # Timestamp lettura
            
            # === LOCATION - Posizione geografica fissa ===
            # Gli edifici non si muovono, ma serve per mappe e calcoli distanza
            'location': {
                'latitude': self.location['latitude'],
                'longitude': self.location['longitude'],
                'altitude_m': self.location.get('altitude_m', 0),
                'address': self.location.get('address', '')
            },
            
            # === SENSORS - Dati ambientali e comunicazione ===
            'sensors': {
                # AIR QUALITY - Qualità dell'aria (interno/esterno)
                # PM2.5: Particolato fine (<2.5 micrometri) - MOLTO PERICOLOSO
                #        Penetra profondamente nei polmoni. OMS raccomanda <10 µg/m³
                # PM10: Particolato inalabile (<10 micrometri) - PERICOLOSO
                #       Irrita vie respiratorie. OMS raccomanda <20 µg/m³
                # NO2: Diossido di azoto (da traffico/combustione)
                #      Causa asma, bronchiti. Limite UE: 40 µg/m³ media annua
                # CO: Monossido di carbonio (da combustione incompleta)
                #     TOSSICO: si lega all'emoglobina. Limite: 10 mg/m³ (8h)
                # O3: Ozono troposferico (da reazioni fotochimiche)
                #     Irrita polmoni, peggiora in estate. Limite: 120 µg/m³
                # VOC: Composti organici volatili (da vernici, detergenti)
                #      Causano mal di testa, irritazioni. Monitorare <500 µg/m³
                # CO2: Anidride carbonica (da respirazione)
                #      Indica ventilazione. <1000ppm = ok, >1500ppm = scarsa
                # PERCHÉ IMPORTANTE: Durante emergenze (incendi, fughe gas),
                # questi dati decidono se evacuare o ventilare l'edificio
                'air_quality': air_quality_data,
                
                # ACOUSTIC - Sensori acustici (inquinamento sonoro)
                # noise_level_db: Livello rumore in decibel (dB)
                #                 <40dB = silenzioso, 60dB = conversazione
                #                 >85dB = dannoso (esposizione prolungata)
                #                 >120dB = soglia del dolore
                # peak_db: Picco massimo registrato
                # average_db_1h: Media ultima ora
                # PERCHÉ IMPORTANTE: Monitorare rumore vicino ospedali/scuole.
                # In emergenza, sirene/allarmi DEVONO essere udibili sopra rumore base
                'acoustic': acoustic_data,
                
                # DISPLAYS - Pannelli informativi georeferenziati
                # type: internal (dentro edificio) / external (fuori, su facciata)
                # current_message: Messaggio attualmente visualizzato
                # coordinates: Posizione GPS precisa del display
                # PERCHÉ IMPORTANTE: Durante emergenze, la centrale può inviare
                # messaggi coordinati su tutti i display della città.
                # Es: "CHIUSURA VIA ROMA - FUGA GAS" su tutti i display nearby
                'displays': displays_data
            },
            
            # === MANAGED RESOURCES - Risorse critiche sicurezza ===
            'managed_resources': {
                # EMERGENCY EXITS - Uscite di sicurezza
                # status: locked (chiusa) / unlocked (aperta)
                # operational: True se funzionante, False se guasta/bloccata
                # floor: Piano dell'uscita (0=terra, 1=primo, -1=seminterrato)
                # width_m: Larghezza in metri (min 1.2m per accessibilità)
                # PERCHÉ IMPORTANTE: In caso evacuazione, sistema calcola:
                # - Capacità flusso persone (width × 1.3 persone/metro/secondo)
                # - Percorsi alternativi se un'uscita è bloccata
                # - Tempo stimato evacuazione totale edificio
                # CRITICO: Se >50% uscite non operative → ALLERTA SICUREZZA
                'emergency_exits': exits_data,
                
                # ELEVATORS - Ascensori
                # status: operational / blocked / out_of_service
                # current_floor: Piano attuale (0-N)
                # capacity_persons: Capienza massima persone
                # fault_description: Descrizione guasto (se presente)
                # PERCHÉ IMPORTANTE:
                # USO NORMALE: Accessibilità per disabili motori
                # EMERGENZA SISMICA: VIETATO ascensori → sistema li disabilita
                # EMERGENZA INCENDIO: Se sotto piano incendio, possono evacuare disabili
                # MANUTENZIONE PREDITTIVA: Pattern di guasti → manutenzione preventiva
                'elevators': elevators_data
            }
        }
        
        return data
