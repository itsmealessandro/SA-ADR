---
status: accepted
date: 2025-11-17
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Edge fault tolerance strategy

## Context and Problem Statement

The Urban Digital Twin system must maintain continuous operation during network disruptions, gateway failures, and sensor outages. Edge devices are deployed in outdoor environments where connectivity issues (C5), hardware failures, and sensor malfunctions (C4) are expected. The system must handle 100,000 events/minute across 5,000 data streams, and any data loss during edge failures could compromise emergency response decisions. How can we ensure reliable data collection and transmission from the edge layer while maintaining the 5-10 second synchronization requirement?

## Decision Drivers

* **Reliability**: System must remain operational during degraded network conditions
* **Data Integrity**: Must prevent data loss during gateway communication failures (C5) and sensor outages (C4)
* **Real-time Constraints**: Must maintain 5-10 second synchronization delay even during recovery from failures
* **Cost Optimization**: Solutions must minimize infrastructure and operational costs (C12)
* **Emergency Response**: Edge autonomy required to support critical operations when cloud connectivity is lost
* **Scalability**: Must support 5,000 data streams without creating bottlenecks at edge layer

## Considered Options

* **Option 1**: Store-and-forward at gateways + sensor redundancy + failover gateways
* **Option 2**: Cloud-only buffering with no edge intelligence
* **Option 3**: Full edge computing with local digital twin replicas
* **Option 4**: Mesh networking between sensors for peer-to-peer redundancy

## Decision Outcome

Chosen option: "**Option 1: Store-and-forward at gateways + sensor redundancy + failover gateways**", because it provides the optimal balance between reliability, cost, and complexity while directly addressing risks C4 and C5. This approach prevents data loss during network outages without requiring expensive full edge computing infrastructure, and it maintains compatibility with our event-driven architecture (ADR-0003).

### Consequences

* Good, because data is preserved locally when cloud connectivity fails, preventing gaps in the digital twin state
* Good, because sensor redundancy provides multiple data sources for critical measurements, improving reliability
* Good, because failover gateways ensure hardware failures don't create single points of failure
* Good, because store-and-forward using Redis is a proven, cost-effective technology ("buy, don't build" principle from C5)
* Good, because edge buffering reduces the risk of overwhelming Kafka during recovery bursts (complements ADR-0003)
* Good, because edge preprocessing can reduce bandwidth costs before forwarding (supports C12)
* Neutral, because requires careful placement of redundant sensors to avoid correlated failures
* Bad, because introduces additional complexity in gateway deployment and configuration management
* Bad, because requires careful buffer sizing to avoid memory exhaustion during prolonged outages
* Bad, because requires deduplication logic in the ingestion layer to handle redundant sensor streams
* Neutral, because requires UPS and backup power at gateway sites, adding operational costs but ensuring availability

## Pros and Cons of the Options

### Option 2: Cloud-only buffering with no edge intelligence

All buffering and fault tolerance handled exclusively in the cloud layer, with sensors continuously retrying transmission until successful.

* Good, because simplifies edge infrastructure with no local storage requirements
* Good, because reduces gateway hardware costs and complexity
* Bad, because data is lost if sensors run out of memory during prolonged outages
* Bad, because sensors with limited memory (especially LoRaWAN devices, C6) cannot buffer significant amounts of data
* Bad, because creates gaps in the digital twin state during network failures, violating reliability requirements
* Bad, because does not support edge autonomy requirement
* Bad, because sensor retries can cause network congestion during recovery periods

### Option 3: Full edge computing with local digital twin replicas

Each gateway runs a complete local instance of the digital twin simulation, enabling full autonomy during cloud disconnection.

* Good, because provides maximum autonomy and can support local decision-making during outages
* Good, because eliminates dependency on cloud connectivity for basic operations
* Neutral, because offers more capability than required by current functional requirements
* Bad, because significantly increases edge infrastructure costs (high-performance compute at each gateway)
* Bad, because introduces complex state synchronization challenges between edge and cloud twins
* Bad, because simulation computation at edge conflicts with cost optimization goals (C12)
* Bad, because requires sophisticated edge deployment and maintenance procedures

### Option 4: Mesh networking between sensors for peer-to-peer redundancy

Sensors form a mesh network allowing them to relay data through neighboring nodes if direct gateway connectivity fails.

* Good, because provides additional redundancy paths without centralized infrastructure
* Good, because can route around localized connectivity issues
* Neutral, because adds network routing complexity at the sensor layer
* Bad, because LoRaWAN sensors (C6) have limited power budgets and cannot support mesh routing overhead
* Bad, because mesh protocols require sensors to maintain routing tables and forward neighbor traffic
* Bad, because increased radio activity drains battery life, conflicting with low-power sensor requirements
* Bad, because introduces variable latency as messages hop through multiple nodes
* Bad, because does not address gateway hardware failure scenario (entire mesh fails if gateway is down)

## More Information

This decision directly addresses risks C4 (data loss/sensor outages) and C5 (gateway communication problems). The store-and-forward mechanism using Redis was specifically chosen based on the risk mitigation strategy documented in the challenges analysis.

**Implementation considerations**:
* Gateway power will be sourced from public grid with UPS backup (as specified in C5 resolution)
* Gateways deployed on elevated sites (rooftops) for optimal sensor coverage (C8)
* Sensor heartbeat monitoring (C10) will help detect failed sensors vs. network issues
* Deduplication at ingestion layer should use sensor ID + timestamp + measurement value hashing

**Related decisions**:
* ADR-0003: Apache Kafka ingestion layer must handle forwarded bursts when connectivity restores
* ADR-0002: Microservices architecture allows independent scaling of deduplication service
* Future ADR needed: Specific gateway hardware selection and Redis configuration parameters

**Technology stack**:
* Redis for store-and-forward (persistent queue mode with AOF)
* LoRaWAN for low-power sensors (C6)
* Failover coordination via keepalive heartbeats between primary/standby gateways
