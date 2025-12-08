import dotenv from 'dotenv';
import { Kafka, Producer } from 'kafkajs';

dotenv.config();

class DataProducer {
  private kafka: Kafka;
  private producer: Producer;
  private intervalMs: number;
  private districts = ['DIST-001', 'DIST-002', 'DIST-003'];

  // Real edge IDs from laquila-city-graph-overture.json (E-00000 to E-03458)
  // Generating a sample pool for realistic traffic simulation
  private edgeIds: string[] = [];
  private roadSegmentIds: string[] = [];

  // Fixed locations for static sensors (they should not move)
  private sensorLocations: Map<string, { latitude: number; longitude: number }> = new Map();

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'data-producer';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.intervalMs = parseInt(process.env.MESSAGE_INTERVAL_MS || '2000');

    // Generate edge and road segment IDs (sample 500 edges from the full range)
    this.generateEdgeIds();
    
    // Initialize fixed locations for static sensors
    this.initializeSensorLocations();
  }

  /**
   * Initialize fixed locations for static sensors
   * These sensors should not move from their positions
   */
  private initializeSensorLocations(): void {
    // Environmental sensors - multiple per district at fixed locations
    const sensorTypes = ['pm25', 'pm10', 'no2', 'co', 'o3', 'temperature', 'humidity'];
    
    for (const districtId of this.districts) {
      const districtIndex = this.districts.indexOf(districtId);
      const baseLatitude = 42.34 + (districtIndex * 0.015);
      const baseLongitude = 13.39 + (districtIndex * 0.02);
      
      // Create 20 environmental sensors per district
      for (let i = 0; i < 20; i++) {
        const sensorType = sensorTypes[i % sensorTypes.length];
        const sensorId = `${sensorType.toUpperCase()}-${districtId}-${i}`;
        this.sensorLocations.set(sensorId, {
          latitude: baseLatitude + (Math.floor(i / 5) * 0.003),
          longitude: baseLongitude + ((i % 5) * 0.004),
        });
      }
    }

    // Traffic cameras - 30 per district at fixed locations
    for (const districtId of this.districts) {
      const districtIndex = this.districts.indexOf(districtId);
      const baseLatitude = 42.34 + (districtIndex * 0.015);
      const baseLongitude = 13.39 + (districtIndex * 0.02);
      
      for (let i = 0; i < 30; i++) {
        const sensorId = `CAM-${districtId}-${i}`;
        this.sensorLocations.set(sensorId, {
          latitude: baseLatitude + (Math.floor(i / 6) * 0.002),
          longitude: baseLongitude + ((i % 6) * 0.003),
        });
      }
    }
  }

  /**
   * Generate a sample pool of edge IDs from the full L'Aquila graph range (E-00000 to E-03458)
   */
  private generateEdgeIds(): void {
    const maxEdgeId = 3458;
    const sampleSize = 3458;
    const step = Math.floor(maxEdgeId / sampleSize);

    for (let i = 0; i < sampleSize; i++) {
      const edgeNum = i * step;
      const paddedNum = edgeNum.toString().padStart(5, '0');
      this.edgeIds.push(`E-${paddedNum}`);
      this.roadSegmentIds.push(`RS-${paddedNum}`);
    }
  }

  async start(): Promise<void> {
    await this.producer.connect();
    console.log('Data producer connected to Kafka');

    // Send messages periodically
    setInterval(() => {
      this.produceMessages();
    }, this.intervalMs);

    console.log(`Producing mock messages every ${this.intervalMs}ms`);
  }

  private async produceMessages(): Promise<void> {
    try {
      const messages = [];

      // Generate sensor data
      messages.push(...this.generateSensorData());

      // Generate building occupancy
      messages.push(...this.generateBuildingOccupancy());

      // Generate weather data
      messages.push(...this.generateWeatherData());

      // Generate traffic data
      messages.push(...this.generateTrafficData());

      // Generate public transport data
      messages.push(...this.generatePublicTransportData());

      // Generate emergency incidents (occasionally)
      if (Math.random() > 0.9) {
        messages.push(...this.generateEmergencyData());
      }

      // Send all messages
      await Promise.all(messages);

      console.log(`Sent ${messages.length} messages at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error producing messages:', error);
    }
  }

  private generateSensorData(): Promise<any>[] {
    const messages = [];
    const sensorTypes = ['pm25', 'pm10', 'no2', 'co', 'o3', 'temperature', 'humidity'];

    for (const districtId of this.districts) {
      // Generate data for 5 random environmental sensors per update (out of 20 total)
      for (let i = 0; i < 5; i++) {
        const sensorIndex = Math.floor(Math.random() * 20);
        const sensorType = sensorTypes[sensorIndex % sensorTypes.length];
        const sensorId = `${sensorType.toUpperCase()}-${districtId}-${sensorIndex}`;
        const location = this.sensorLocations.get(sensorId)!;
        
        // Environmental sensors
        messages.push(
          this.producer.send({
            topic: 'sensors.environmental',
            messages: [
              {
                key: districtId,
                value: JSON.stringify({
                  districtId,
                  sensorId,
                  type: sensorType,
                  value: Math.random() * 50 + 10,
                  unit: sensorType.includes('pm') ? 'μg/m³' : sensorType === 'temperature' ? '°C' : '%',
                  status: 'active',
                  lastUpdated: new Date().toISOString(),
                  location,
                }),
              },
            ],
          })
        );
      }

      // Generate data for 3 random traffic cameras per update (out of 30 total)
      for (let i = 0; i < 3; i++) {
        const cameraIndex = Math.floor(Math.random() * 30);
        const cameraSensorId = `CAM-${districtId}-${cameraIndex}`;
        const cameraLocation = this.sensorLocations.get(cameraSensorId)!;
        
        messages.push(
          this.producer.send({
            topic: 'sensors.traffic',
            messages: [
              {
                key: districtId,
                value: JSON.stringify({
                  districtId,
                  sensorId: cameraSensorId,
                  type: 'trafficCamera',
                  value: Math.random() * 100,
                  unit: 'vehicles/min',
                  status: 'active',
                  lastUpdated: new Date().toISOString(),
                  location: cameraLocation,
                  metadata: {
                    avgSpeed: 30 + Math.random() * 40,
                    vehicleCount: Math.floor(Math.random() * 50),
                    congestionStatus: ['light', 'moderate', 'heavy'][Math.floor(Math.random() * 3)],
                  },
                }),
              },
            ],
          })
        );
      }
    }

    return messages;
  }

  private generateBuildingOccupancy(): Promise<any>[] {
    const messages = [];

    for (const districtId of this.districts) {
      const buildingId = `BLDG-${districtId}-${Math.floor(Math.random() * 5)}`;
      const totalCapacity = 1000 + Math.floor(Math.random() * 500);
      const currentOccupancy = Math.floor(Math.random() * totalCapacity);

      messages.push(
        this.producer.send({
          topic: 'buildings.occupancy',
          messages: [
            {
              key: districtId,
              value: JSON.stringify({
                districtId,
                buildingId,
                currentOccupancy,
                totalCapacity,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        })
      );
    }

    return messages;
  }

  private generateWeatherData(): Promise<any>[] {
    const messages = [];

    for (const districtId of this.districts) {
      messages.push(
        this.producer.send({
          topic: 'weather.stations',
          messages: [
            {
              key: districtId,
              value: JSON.stringify({
                districtId,
                stationId: `WS-${districtId}`,
                readings: {
                  temperature: 15 + Math.random() * 15,
                  humidity: 40 + Math.random() * 40,
                  pressure: 1000 + Math.random() * 30,
                  windSpeed: Math.random() * 20,
                  windDirection: Math.floor(Math.random() * 360),
                  precipitation: Math.random() * 5,
                  cloudCover: Math.random() * 100,
                  visibility: 5 + Math.random() * 10,
                  uvIndex: Math.floor(Math.random() * 11),
                  units: {
                    temperature: 'Celsius',
                    humidity: '%',
                    pressure: 'hPa',
                    windSpeed: 'km/h',
                    windDirection: 'degrees',
                    precipitation: 'mm',
                    cloudCover: '%',
                    visibility: 'km',
                  },
                },
                status: 'active',
                lastUpdated: new Date().toISOString(),
              }),
            },
          ],
        })
      );
    }

    return messages;
  }

  private generateTrafficData(): Promise<any>[] {
    const messages = [];

    for (const districtId of this.districts) {
      // Randomly select a real edge ID from the L'Aquila city graph
      const randomIndex = Math.floor(Math.random() * this.edgeIds.length);
      const edgeId = this.edgeIds[randomIndex];
      const roadSegmentId = this.roadSegmentIds[randomIndex];
      const congestionLevels = ['light', 'moderate', 'heavy'];

      messages.push(
        this.producer.send({
          topic: 'traffic.graph',
          messages: [
            {
              key: districtId,
              value: JSON.stringify({
                districtId,
                edgeId,
                roadSegmentId,
                trafficConditions: {
                  averageSpeed: 20 + Math.random() * 40,
                  congestionLevel: congestionLevels[Math.floor(Math.random() * 3)],
                  vehicleCount: Math.floor(Math.random() * 100),
                  travelTime: 5 + Math.random() * 15,
                  incidents: [],
                },
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        })
      );
    }

    return messages;
  }

  private generatePublicTransportData(): Promise<any>[] {
    const messages = [];

    // Generate bus GPS updates
    for (let i = 0; i < 3; i++) {
      messages.push(
        this.producer.send({
          topic: 'transport.gps',
          messages: [
            {
              value: JSON.stringify({
                busId: `BUS-${i + 1}`,
                route: `Route-${i + 1}`,
                location: {
                  latitude: 42.34 + Math.random() * 0.04,
                  longitude: 13.39 + Math.random() * 0.06,
                  currentStop: `STOP-${Math.floor(Math.random() * 20)}`,
                },
                speed: 10 + Math.random() * 40,
                occupancy: {
                  current: Math.floor(Math.random() * 50),
                  capacity: 50,
                },
                nextStop: `STOP-${Math.floor(Math.random() * 20)}`,
                estimatedArrival: new Date(Date.now() + 300000).toISOString(),
                status: 'active',
              }),
            },
          ],
        })
      );
    }

    return messages;
  }

  private generateEmergencyData(): Promise<any>[] {
    const messages = [];
    const incidentTypes = ['fire', 'medical', 'accident', 'crime'];
    const priorities = ['low', 'medium', 'high', 'critical'];

    messages.push(
      this.producer.send({
        topic: 'emergency.incidents',
        messages: [
          {
            value: JSON.stringify({
              incidentId: `INC-${Date.now()}`,
              type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
              priority: priorities[Math.floor(Math.random() * priorities.length)],
              location: {
                latitude: 42.34 + Math.random() * 0.04,
                longitude: 13.39 + Math.random() * 0.06,
                address: `${Math.floor(Math.random() * 999)} Via Roma`,
              },
              reportedAt: new Date().toISOString(),
              respondingUnits: [],
              status: 'active',
            }),
          },
        ],
      })
    );

    return messages;
  }

  async stop(): Promise<void> {
    await this.producer.disconnect();
    console.log('Data producer disconnected');
  }
}

// Start the producer
const producer = new DataProducer();

producer.start().catch((error) => {
  console.error('Failed to start data producer:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await producer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await producer.stop();
  process.exit(0);
});
