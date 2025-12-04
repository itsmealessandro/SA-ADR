# 🚨 L'Aquila Emergency Management System - Digital Twin

Sistema di gestione emergenze basato su architettura **modulare component-based** con Docker Compose, Kafka e InfluxDB.

Simula un Digital Twin della città di L'Aquila con sensori distribuiti per traffico, ambiente ed edifici.

---

## 🏗️ Architettura Modulare

Il sistema è completamente **modularizzato** in 3 componenti principali + rispettivi monitor:

```
┌─────────────────────────────────────────────────────────────┐
│                     KAFKA MESSAGE BUS                        │
│  Topics: city-sensor-data | vehicles-sensor-data |          │
│          buildings-sensor-data                               │
└─────────────────────────────────────────────────────────────┘
        ▲              ▲                 ▲              │
        │              │                 │              │
        │              │                 │              ▼
   ┌────────┐    ┌──────────┐    ┌───────────┐   ┌──────────┐
   │  CITY  │    │ VEHICLES │    │ BUILDINGS │   │ InfluxDB │
   │  SIM   │    │   SIM    │    │    SIM    │   │ 3 buckets│
   │ 7 edges│    │ 5 vehicles   │ 5 buildings  │   └──────────┘
   └────────┘    └──────────┘    └───────────┘
        │              │                 │
   ┌────────┐    ┌──────────┐    ┌───────────┐
   │  CITY  │    │ VEHICLES │    │ BUILDINGS │
   │ MONITOR│    │  MONITOR │    │  MONITOR  │
   └────────┘    └──────────┘    └───────────┘
```

### Componenti Attivi (9 Container Docker)

**Infrastruttura:**
- `ems-zookeeper` - Coordinatore Kafka
- `ems-kafka` - Message broker
- `ems-influxdb` - Time-series database

**Simulatori di Produzione Dati (3):**
1. **`ems-city`** - City Simulator
   - 7 edges distribuiti in 3 distretti
   - Sensori: velocità, meteo, telecamere
   - Topic: `city-sensor-data`

2. **`ems-vehicles`** - Vehicles Simulator
   - 5 veicoli tracciati (ambulanza, autopompa, polizia, bus, furgone)
   - GPS tracking, batteria, incident detection
   - Topic: `vehicles-sensor-data`

3. **`ems-buildings`** - Buildings Simulator
   - 5 edifici monitorati (ospedale, scuola, uffici, basilica, **università**)
   - Air quality, acustica, uscite emergenza, ascensori
   - Topic: `buildings-sensor-data`

**Monitor di Consumo Dati (3):**
4. **`ems-city-monitor`** → bucket `city_metrics`
5. **`ems-vehicles-monitor`** → bucket `vehicles_metrics`
6. **`ems-buildings-monitor`** → bucket `buildings_metrics`

---

## 📊 Dati e Metriche Simulate

### City Sensors (7 edges)

**Speed Sensors** - Rilevatori velocità veicoli
- `speed_kmh`: Velocità media (0-120 km/h)
- `sensor_readings`: Array con letture di ciascun sensore

**Weather Sensors** - Stazioni meteo
- `temperature_c`: Temperatura in °C
- `humidity`: Umidità relativa %
- `weather_conditions`: clear | rain | snow | fog

**Camera Sensors** - Telecamere con edge analytics
- `road_condition`: clear | congestion | accident | obstacles | flooding
- `confidence_score`: Confidenza AI (0.0-1.0)
- `vehicle_count`: Numero veicoli rilevati

### Vehicle Sensors (5 veicoli)

**GPS Tracking** - Tracciamento real-time
- `latitude`, `longitude`: Coordinate WGS84 (aggiornate ogni 3s)
- `altitude_m`: Altitudine metri
- `speed_kmh`: Velocità istantanea
- `direction_degrees`: Direzione bussola (0-359°)
- `heading`: Direzione cardinale (north, east, etc.)

**Managed Resources** - Stato dispositivo edge
- `battery_level_percent`: Batteria 0-100% (drain durante movimento)
- `firmware_version`: Versione firmware di bordo

**Accelerometer** - Rilevamento incidenti automatico
- `incident_detected`: ✓/✗ Urto rilevato (soglia 3.5g)
- `threshold_g`: Soglia configurata
- **CRITICO**: Se True → allerta automatica SOC

**Route Planning** - Previsione traffico
- `current_destination`: Destinazione attuale {lat, lon, name}
- `predicted_destinations`: Array destinazioni probabili con ETA
- `route_priority`: critical | high | normal | standby

### Building Sensors (5 edifici)

**Air Quality** - Qualità aria (indoor/outdoor)
- `pm25_ugm3`: Particolato fine <2.5µm (OMS: <10)
- `pm10_ugm3`: Particolato <10µm (OMS: <20)
- `no2_ugm3`: Diossido azoto (UE: <40)
- `co_ppm`: Monossido carbonio (limite: <10)
- `o3_ugm3`: Ozono (limite: <120)
- `voc_ppb`: Composti organici volatili
- `co2_ppm`: CO₂ per ventilazione (<1000 ok, >1500 scarsa)

**Acoustic** - Inquinamento acustico
- `noise_level_db`: Livello rumore corrente
  - <40dB = silenzioso | 60dB = conversazione
  - >85dB = dannoso | >120dB = soglia dolore
- `peak_db`: Picco massimo registrato
- `average_db_1h`: Media ultima ora

**Emergency Exits** - Uscite sicurezza
- `status`: unlocked | locked
- `operational`: ✓/✗ funzionante
- `floor`: Piano (0=terra, -1=seminterrato)
- `width_m`: Larghezza metri (min 1.2m)
- **Calcoli**: Capacità flusso = width × 1.3 persone/m/s

**Elevators** - Ascensori
- `status`: operational | blocked | out_of_service
- `current_floor`: Piano corrente (0-N)
- `capacity_persons`: Capienza max
- `fault_description`: Descrizione guasto se presente
- **Regole emergenza**: Terremoto = DISABILITATI, Incendio = OK se sotto piano incendio

**Displays** - Pannelli informativi georeferenziati
- `type`: internal | external
- `current_message`: Messaggio visualizzato
- `coordinates`: GPS del display
- **Uso emergenza**: Messaggi coordinati su tutti i display della città

---

## 🚀 Quick Start

### Prerequisiti
```bash
docker --version
docker-compose --version
```

### Avvio Sistema Completo
```bash
cd prototype
docker-compose up -d

# Attendere healthy status (~30 secondi)
docker ps
```

### Verifica Funzionamento
```bash
# Check logs simulatori
docker logs ems-city --tail 20
docker logs ems-vehicles --tail 20
docker logs ems-buildings --tail 20

# Check logs monitors
docker logs ems-city-monitor --tail 20
docker logs ems-vehicles-monitor --tail 20
docker logs ems-buildings-monitor --tail 20
```

### Access InfluxDB UI
```
URL: http://localhost:8086
Username: admin
Password: adminpassword

Buckets:
- city_metrics (velocità, meteo, telecamere)
- vehicles_metrics (GPS, batteria, incidenti)
- buildings_metrics (aria, rumore, uscite, ascensori)
```

### Arresto Sistema
```bash
docker-compose down      # Stop servizi (mantiene dati)
docker-compose down -v   # Stop + rimuovi volumi (cleanup totale)
```

---

## 🗂️ Struttura Progetto

```
prototype/
├── common/                      # 🔧 Modulo condiviso
│   ├── __init__.py
│   └── kafka_utils.py          # Utilities Kafka riusabili
│
├── city-simulator/             # 🏙️ Simulatore città
│   ├── config/city_config.json # 7 edges, 3 distretti
│   ├── city_simulator.py
│   ├── edge_manager.py
│   ├── sensor_simulator.py
│   └── Dockerfile
│
├── vehicles-simulator/         # 🚗 Simulatore veicoli
│   ├── config/vehicles.json    # 5 veicoli
│   ├── vehicles_simulator.py
│   ├── vehicle_manager.py
│   ├── vehicle_sensor_simulator.py  # ← CODICE COMMENTATO
│   └── Dockerfile
│
├── buildings-simulator/        # 🏢 Simulatore edifici
│   ├── config/buildings.json   # 5 edifici (+ università)
│   ├── buildings_simulator.py
│   ├── building_manager.py
│   ├── building_sensor_simulator.py # ← CODICE COMMENTATO
│   └── Dockerfile
│
├── city-monitor/               # 📊 Monitor città
├── vehicles-monitor/           # 📊 Monitor veicoli
├── buildings-monitor/          # 📊 Monitor edifici
│
├── docker-compose.yml          # Orchestrazione 9 servizi
└── init-influx.sh              # Init bucket InfluxDB
```

---

## 🔧 Sviluppo e Modifica

### Aggiungere un Nuovo Edificio

Modificare `buildings-simulator/config/buildings.json`:
```json
{
  "building_id": "building-xxx-001",
  "name": "Nome Edificio",
  "type": "hospital|school|office|religious|university",
  "location": { "latitude": 42.xxx, "longitude": 13.xxx },
  "managed_resources": { "emergency_exits": [...], "elevators": [...] },
  "sensors": { "air_quality": [...], "acoustic": [...], "displays": [...] }
}
```

Riavviare:
```bash
docker-compose restart ems-buildings
```

### Rebuild Modifiche
```bash
# Rebuild singolo componente
docker-compose build --no-cache city-simulator
docker-compose up -d city-simulator

# Rebuild completo
docker-compose up --build -d
```

---

## 📚 Risorse per Sviluppatori

### Codice Didattico Commentato

I file seguenti contengono **commenti dettagliati in italiano**:

- **`vehicles-simulator/vehicle_sensor_simulator.py`**  
  Spiega GPS tracking, batteria, accelerometro, route planning

- **`buildings-simulator/building_sensor_simulator.py`**  
  Spiega PM2.5, NO2, CO, livelli rumore, uscite emergenza, ascensori

Ogni metrica include:
- ✅ Cosa rappresenta
- ✅ Range valori normali
- ✅ Perché è importante per emergenze
- ✅ Esempi pratici

### Testing
```bash
# Validare JSON
python3 -m json.tool buildings-simulator/config/buildings.json

# Test syntax Python
python3 -m py_compile vehicles-simulator/vehicles_simulator.py

# Check Kafka real-time
docker exec ems-kafka kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic vehicles-sensor-data --from-beginning --max-messages 5
```

---

## 🎯 Best Practices

1. **Modificare solo i file JSON config** - Non toccare logica Python se non necessario
2. **Validare JSON dopo modifiche** - Usare `python3 -m json.tool`
3. **Rebuild incrementale** - Rebuild solo componente modificato
4. **Check logs sempre** - Verificare log dopo modifiche
5. **Dati realistici** - Coordinate L'Aquila e valori plausibili

---

**Versione**: 2.0 - Modular Architecture  
**Ultimo aggiornamento**: 2025-12-04  
**Sistema**: L'Aquila Digital Twin Emergency Management
