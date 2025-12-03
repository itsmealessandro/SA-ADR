# Emergency Management System - City Simulator Prototype

Prototipo di un sistema di gestione delle emergenze basato su architettura a microservizi, Docker Compose e pattern MAPE-K.
Il sistema simula una città intelligente (L'Aquila) con sensori distribuiti, elaborazione edge e monitoraggio centralizzato.

## 🏗️ Architettura

Il sistema è composto dai seguenti servizi Docker:

1.  **City Simulator (`ems-city`)**:
    *   Simulatore unico per l'intera città basato su pattern **MAPE-K**.
    *   Gestisce dinamicamente distretti ed edge caricati da `city_config.json`.
    *   Ogni edge gira in un thread separato per simulare concorrenza reale.
    *   Genera dati da sensori di **velocità**, **meteo** e **telecamere** (con edge analytics).
    *   Pubblica i dati su Kafka.

2.  **Monitor (`ems-monitor`)**:
    *   Consuma i dati da Kafka.
    *   Valida la struttura e i range dei valori.
    *   Scrive le metriche su **InfluxDB** per storicizzazione e analisi.

3.  **Infrastruttura Dati**:
    *   **Kafka & Zookeeper**: Message broker per la comunicazione asincrona e disaccoppiata.
    *   **InfluxDB**: Database Time-Series per memorizzare le metriche dei sensori.

## 🌍 Configurazione Città (L'Aquila)

La configurazione è definita in `city-simulator/city_config.json`.
Attualmente sono configurati **3 Distretti** e **7 Edge**:

*   **Centro Storico** (`district-centro`)
    *   *Piazza Duomo Area*: 2 Speed, 1 Weather, 3 Camera
    *   *Corso Vittorio Emanuele*: 1 Speed, 1 Weather, 2 Camera
*   **Collemaggio** (`district-collemaggio`)
    *   *Basilica Area*: 2 Speed, 1 Weather, 2 Camera
    *   *Via Collemaggio*: 1 Speed, 1 Weather, 1 Camera
    *   *Porta Bazzano*: 1 Speed, 1 Camera
*   **Pettino** (`district-pettino`)
    *   *University Area*: 2 Speed, 2 Weather, 2 Camera
    *   *Via L'Aquila*: 2 Speed, 1 Weather, 2 Camera

## 🚀 Quick Start

### Prerequisiti
*   Docker e Docker Compose installati.

### Avvio
```bash
cd prototype
docker-compose up --build -d
```

### Verifica
Controlla i log del simulatore città:
```bash
docker-compose logs -f city-simulator
```

Controlla i log del monitor:
```bash
docker-compose logs -f monitor-python
```

### Arresto
```bash
docker-compose down
```

## 📊 Dati Sensori

Ogni messaggio inviato a Kafka include:
*   `district_id`, `edge_id`, `sensor_type`
*   `timestamp` (ISO 8601)
*   `latitude`, `longitude` (Coordinate GPS dell'edge)
*   Dati specifici del sensore (aggregati da più sensori fisici)

### Tipi di Sensori

1.  **Speed Sensor**:
    *   Simula rilevatori di velocità multipli.
    *   Dati: `speed_kmh` (media aggregata), `sensor_readings` (dettaglio per sensore).

2.  **Weather Sensor**:
    *   Simula stazioni meteo.
    *   Dati: `temperature_c`, `humidity`, `weather_conditions`.

3.  **Camera Sensor (Edge Analytics)**:
    *   Simula telecamere con elaborazione locale.
    *   Rileva condizioni: `clear`, `congestion`, `accident`, `obstacles`, `flooding`.
    *   Dati: `road_condition` (condizione più critica rilevata), `confidence_score`, `vehicle_count`.

## 🛠️ Sviluppo Modulare

Il codice del simulatore è organizzato in moduli:
*   `city_simulator.py`: Entry point e gestione ciclo di vita.
*   `edge_manager.py`: Gestione thread e coordinamento sensori per ogni edge.
*   `sensor_simulator.py`: Logica di simulazione e aggregazione dati sensori.
*   `city_config.json`: Configurazione dichiarativa della città.
