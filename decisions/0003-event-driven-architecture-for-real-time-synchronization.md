---
status: accepted
date: 2025-11-17
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Event-Driven Architecture for Real-Time Synchronization

## Context and Problem Statement

Our Digital Twin system needs to synchronize real-world infrastructure data with virtual representations across a metropolitan district in real-time. The system must handle up to 5,000 concurrent real-time data streams from various IoT sensors, traffic cameras, and infrastructure monitoring devices within a single district. During emergency conditions, the system must process at least 100,000 data events per minute (approximately 1,667 events per second) while maintaining simulation updates with no more than 5-10 seconds delay from real-world changes. What messaging or streaming technology should we use to support this real-time, high-throughput data synchronization requirement while ensuring reliability, scalability, and low latency?

## Decision Drivers

* **Throughput** – Must handle at least 100,000 events per minute (1,667+ events/second) during peak load.
* **Latency** – Must support end-to-end processing delays of 5-10 seconds maximum for real-time synchronization.
* **Scalability** – Must support up to 5,000 concurrent data streams per district with potential for multi-district expansion.
* **Reliability** – Must ensure no data loss for critical infrastructure monitoring events.
* **Ordering Guarantees** – Must maintain event ordering within individual data streams for temporal consistency.
* **Availability** – Must provide high availability 24/7.
* **Integration Complexity** – Should integrate easily with our microservices architecture and cloud infrastructure.
* **Operational Overhead** – Should minimize infrastructure management complexity.
* **Cost Efficiency** – Must be cost-effective at scale considering high message volumes.
* **Protocol Support** – Should support standard protocols for IoT device integration.
* **Replay Capability** – Should support event replay for debugging and historical analysis.

## Considered Options

* Apache Kafka
* AWS Kinesis Data Streams
* AWS SQS (Simple Queue Service)
* RabbitMQ
* MQTT (with Broker like AWS IoT Core or Eclipse Mosquitto)

## Decision Outcome

Chosen option: **Apache Kafka**, because it best meets our critical decision drivers for throughput, latency, scalability, and reliability. Kafka's distributed log architecture provides the high throughput (millions of events/second capability) and low latency (milliseconds) required for real-time synchronization. Its built-in partitioning naturally aligns with our 5,000-stream architecture, while its durability guarantees and replay capabilities ensure data reliability making it the optimal choice for our demanding real-time requirements.

### Consequences

* Good, because Kafka can easily handle 100,000+ events/minute with headroom for growth.
* Good, because Kafka's architecture supports sub-second latency, well within our 5-10 second requirement.
* Good, because Kafka's partitioning model scales horizontally to support thousands of concurrent streams.
* Good, because Kafka provides durable message storage with configurable replication for reliability.
* Good, because Kafka maintains ordering guarantees within partitions, ensuring temporal consistency per data stream.
* Good, because Kafka supports event replay and time-travel queries for debugging and analysis.
* Good, because Kafka's ecosystem includes robust monitoring and management tools.
* Good, because Kafka has strong community support and extensive documentation.
* Good, because Kafka Connect provides pre-built connectors for various data sources.
* Neutral, because Kafka requires dedicated infrastructure but cloud-managed options (AWS MSK) are available.
* Neutral, because Kafka's complexity is justified by our performance requirements.
* Bad, because Kafka has a steeper learning curve compared to simpler messaging solutions.
* Bad, because Kafka requires more operational expertise for cluster management and tuning.
* Bad, because self-managed Kafka requires investment in infrastructure and monitoring setup.


## Pros and Cons of the Options

### AWS Kinesis Data Streams

A fully managed streaming service on AWS designed for real-time data ingestion and processing at scale.

* Good, because fully managed service reduces operational overhead.
* Good, because integrates seamlessly with AWS ecosystem (Lambda, Analytics, S3).
* Good, because provides automatic scaling and high availability.
* Good, because offers built-in encryption and security features.
* Good, because supports message ordering within shards.
* Good, because provides 24-hour default retention (up to 365 days).
* Neutral, because performance is adequate (1MB/sec per shard, scales with shard count).
* Neutral, because pricing is predictable based on shard hours and data volume.
* Bad, because has lower throughput ceiling compared to Kafka without significant shard provisioning.
* Bad, because shard management adds complexity at scale (5,000 streams may require numerous shards).
* Bad, because creates AWS vendor lock-in.
* Bad, because limited ecosystem compared to Kafka's rich tooling.

### AWS SQS (Simple Queue Service)

A fully managed message queuing service that enables decoupling of microservices with at-least-once delivery.

* Good, because fully managed with no infrastructure to maintain.
* Good, because highly scalable with nearly unlimited throughput (NO FIFO).
* Good, because provides simple API and easy integration.
* Good, because cost-effective for moderate message volumes.
* Good, because supports dead letter queues for error handling.
* Neutral, because suitable for asynchronous task processing.
* Bad, because does not guarantee message ordering (even with FIFO queues at high scale).
* Bad, because no native message replay capability - messages are deleted after consumption.
* Bad, because not designed for streaming use cases - uses pull-based consumption.
* Bad, because higher latency compared to streaming platforms (seconds vs. milliseconds).
* Bad, because FIFO queues have throughput limits (300 msgs/sec without batching, 3,000 with batching).

### RabbitMQ

A popular open-source message broker implementing AMQP protocol, supporting multiple messaging patterns.

* Good, because mature and well-documented with strong community support.
* Good, because supports multiple messaging patterns (pub/sub, routing, topics).
* Good, because provides flexible routing and exchange types.
* Good, because offers good performance for traditional messaging workloads (tens of thousands msgs/sec).
* Good, because has extensive client library support across languages.
* Good, because lightweight and easier to operate than Kafka for smaller scales.
* Neutral, because suitable for request/reply and task queue patterns.
* Neutral, because can be deployed on-premises or in cloud.
* Bad, because not designed for high-throughput streaming (lower throughput than Kafka).
* Bad, because messages are typically deleted after acknowledgment.
* Bad, because limited message replay capability without additional plugins.
* Bad, because clustering can be complex and has limitations at very large scales.

### MQTT (with Broker)

A lightweight publish/subscribe protocol designed for IoT devices with low bandwidth and unreliable networks. Requires a broker like AWS IoT Core, Eclipse Mosquitto, or HiveMQ.

* Good, because specifically designed for IoT device communication.
* Good, because lightweight protocol with minimal overhead.
* Good, because supports publish/subscribe pattern with topic-based routing.
* Good, because QoS levels (0, 1, 2) provide flexibility in delivery guarantees.
* Good, because efficient for battery-powered and bandwidth-constrained devices.
* Good, because AWS IoT Core provides managed MQTT with device management.
* Neutral, because suitable for device-to-cloud communication layer.
* Bad, because not designed for high-throughput data processing (more for device messaging).
* Bad, because no built-in message persistence or replay capabilities (broker-dependent).
* Bad, because limited stream processing capabilities - primarily a transport protocol.
* Bad, because would require additional streaming layer (like Kafka) for processing, adding complexity.


## More Information

**Related Decisions:**
- ADR-0002: Use Microservices Architecture (parent decision enabling event-driven approach)
