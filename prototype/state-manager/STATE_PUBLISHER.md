# State Publisher

The State Manager now publishes the digital twin state to Kafka topics for consumption by other services.

## Published Topics

### 1. `state.full` - Complete State
- **Frequency**: Every 60 seconds (configurable via `FULL_STATE_PUBLISH_INTERVAL_MS`)
- **Content**: Complete city digital twin state (all districts, sensors, buildings, etc.)
- **Use Case**: State synchronization, backup, downstream consumers that need full context

**Message Structure:**
```json
{
  "cityId": "CITY-001",
  "timestamp": "2025-12-06T10:00:00Z",
  "metadata": {
    "name": "Smart City",
    "version": "1.0.0",
    "lastUpdated": "2025-12-06T10:00:00Z"
  },
  "districts": [...],
  "publicTransport": {...},
  "emergencyServices": {...}
}
```

**Message Headers:**
- `type`: "full-state"
- `version`: "1.0"

### 2. `state.incremental` - Delta Updates
- **Frequency**: Every 5 seconds (configurable via `INCREMENTAL_STATE_PUBLISH_INTERVAL_MS`)
- **Content**: JSON Patch (RFC 6902) with only changed fields
- **Use Case**: Real-time state updates, efficient bandwidth usage, event streaming

**Message Structure:**
```json
{
  "cityId": "CITY-001",
  "timestamp": "2025-12-06T10:00:05Z",
  "delta": {
    "districts": [
      {
        "0": {
          "sensors": {
            "2": {
              "value": [25.3, 28.7]
            }
          }
        }
      }
    ]
  }
}
```

**Message Headers:**
- `type`: "incremental-state"
- `version`: "1.0"
- `previousTimestamp`: Timestamp of the state used as baseline for diff

## Configuration

Environment variables:

```env
# Publish full state every 60 seconds
FULL_STATE_PUBLISH_INTERVAL_MS=60000

# Publish incremental updates every 5 seconds
INCREMENTAL_STATE_PUBLISH_INTERVAL_MS=5000
```

## Benefits

### Full State Publishing
- **Reliability**: Downstream consumers can recover from crashes by reading latest full state
- **Simplicity**: No need to reconstruct state from deltas
- **Auditing**: Complete snapshots for compliance and debugging
- **Batch Processing**: Analytics services can process full state periodically

### Incremental State Publishing
- **Efficiency**: ~80-95% smaller message size compared to full state
- **Real-time**: Low latency updates (5 second default)
- **Bandwidth**: Reduced network traffic for high-frequency consumers
- **Event Streaming**: Compatible with stream processing frameworks

## Consumer Examples

### Consuming Full State (Python)
```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'state.full',
    bootstrap_servers=['localhost:9093'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    state = message.value
    print(f"Received full state with {len(state['districts'])} districts")
```

### Consuming Incremental State (Python with jsondiffpatch)
```python
from kafka import KafkaConsumer
import json
import jsondiffpatch

consumer = KafkaConsumer(
    'state.incremental',
    bootstrap_servers=['localhost:9093'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

patcher = jsondiffpatch.DiffPatcher()
current_state = {}  # Initialize with full state from state.full topic

for message in consumer:
    delta = message.value['delta']
    # Apply delta to reconstruct state
    current_state = patcher.patch(current_state, delta)
    print(f"Applied incremental update at {message.value['timestamp']}")
```

### Consuming with Node.js
```javascript
const { Kafka } = require('kafkajs');
const jsondiffpatch = require('jsondiffpatch');

const kafka = new Kafka({
  clientId: 'state-consumer',
  brokers: ['localhost:9093']
});

const consumer = kafka.consumer({ groupId: 'my-consumer-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'state.incremental' });

const differ = jsondiffpatch.create();
let currentState = {}; // Initialize from state.full

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const data = JSON.parse(message.value.toString());
    currentState = differ.patch(currentState, data.delta);
    console.log('State updated:', data.timestamp);
  }
});
```

## Monitoring

Check Kafka topics:
```bash
# List topics
docker exec -it dt-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Describe state topics
docker exec -it dt-kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic state.full
docker exec -it dt-kafka kafka-topics --bootstrap-server localhost:9092 --describe --topic state.incremental

# Consume messages
docker exec -it dt-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic state.full --from-beginning --max-messages 1
docker exec -it dt-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic state.incremental --from-beginning --max-messages 5
```

Check logs:
```bash
docker-compose logs -f state-manager | grep "Published"
```

## Performance

- **Full State**: ~500KB-2MB per message (depending on city size)
- **Incremental State**: ~10KB-100KB per message (80-95% reduction)
- **Throughput**: Can publish at high frequency without impacting consumer performance
- **Compression**: Kafka compression (snappy/gzip) can further reduce message size by 60-70%
