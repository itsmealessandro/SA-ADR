---
status: proposed
date: 2025-12-20
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Use Kafka for Asynchronous Communication Between Risk Analyzer and Recommendation Planner

## Context and Problem Statement

In the Urban Digital Twin system, the Risk Analyzer (riskManager) service continuously evaluates real-time data from 5,000 data streams processing 100,000 events/minute to identify traffic risks, infrastructure failures, and emergency situations. The Recommendation Planner (recommendationManager) service generates actionable recommendations for route adjustments, resource allocation, and emergency response based on these risk assessments. The system requires reliable, scalable communication between these services to ensure real-time synchronization within 5-10 seconds. The fundamental question is: should the communication between Risk Analyzer and Recommendation Planner use Kafka event streaming or HTTP-based synchronous calls, and what are viable alternatives for inter-service communication in this high-throughput, event-driven architecture?

## Decision Drivers

* **Real-time Synchronization**: Must support 5-10 second synchronization requirement across microservices (NFR - Highest priority)
* **Scalability**: System must handle 100k events/minute without communication bottlenecks (NFR - High priority)
* **Decoupling**: Services should operate independently without tight coupling (ADR-0002 Microservices Architecture)
* **Reliability**: Communication must be fault-tolerant and handle service failures gracefully
* **Performance**: Minimize latency in risk assessment to recommendation generation pipeline
* **Event-Driven Architecture**: Aligns with ADR-0003 Event-Driven Architecture for real-time synchronization
* **Cost Optimization**: Minimize infrastructure costs for messaging (C12, NFR - High priority)

## Considered Options

* **Option 1**: Kafka event streaming for asynchronous, publish-subscribe communication
* **Option 2**: HTTP REST API calls for synchronous request-response communication
* **Option 3**: gRPC for high-performance RPC communication
* **Option 4**: RabbitMQ message queuing for reliable message delivery

## Decision Outcome

Chosen option: "**Option 1: Kafka event streaming for asynchronous, publish-subscribe communication**", because it provides the scalability, decoupling, and real-time capabilities required for the Urban Digital Twin, building on the existing event-driven architecture established in ADR-0003. HTTP synchronous calls would create coupling and potential bottlenecks in the high-throughput system.

### Consequences

* Good, because Kafka's publish-subscribe model allows multiple consumers (planners) to process risk events independently
* Good, because asynchronous communication prevents blocking and supports the 5-10 second synchronization requirement
* Good, because event streaming aligns with the 100k events/minute throughput without performance degradation
* Good, because decoupling enables independent scaling of analyzer and planner services
* Good, because Kafka provides built-in fault tolerance with message persistence and replay capabilities
* Good, because leverages existing Kafka infrastructure from ADR-0003, reducing implementation complexity
* Good, because supports event sourcing for audit trails of risk assessments and recommendations
* Bad, because introduces eventual consistency - planners may process slightly stale risk data
* Bad, because requires careful topic partitioning and consumer group management for load balancing
* Neutral, because adds operational complexity for Kafka cluster monitoring and maintenance

## Pros and Cons of the Options

### Option 1: Kafka event streaming for asynchronous, publish-subscribe communication

Risk Analyzer publishes risk assessment events to Kafka topics, Recommendation Planner consumes and processes them asynchronously.

* Good, because handles high throughput (100k events/min) with low latency
* Good, because provides decoupling between producer and consumer services
* Good, because supports multiple consumers and fan-out scenarios
* Good, because built-in persistence allows replay of events for debugging or recovery
* Good, because aligns with existing event-driven architecture (ADR-0003)
* Good, because enables real-time streaming without polling
* Neutral, because requires learning curve for Kafka operations
* Bad, because eventual consistency may affect time-critical decisions
* Bad, because topic management adds operational overhead

### Option 2: HTTP REST API calls for synchronous request-response communication

Risk Analyzer makes HTTP POST calls to Recommendation Planner endpoints for each risk assessment.

* Good, because simple and familiar REST API patterns
* Good, because immediate consistency - planner responds with recommendations synchronously
* Good, because easy to implement and debug with standard HTTP tools
* Neutral, because works well for low-throughput scenarios
* Bad, because synchronous calls create coupling and potential blocking
* Bad, because cannot handle 100k events/min without overwhelming the planner service
* Bad, because violates microservices decoupling principles (ADR-0002)
* Bad, because HTTP overhead (headers, connections) increases latency
* Bad, because no built-in fault tolerance - failed calls require retry logic
* Bad, because does not support event-driven patterns for real-time synchronization

### Option 3: gRPC for high-performance RPC communication

Bidirectional streaming RPC calls between Risk Analyzer and Recommendation Planner using Protocol Buffers.

* Good, because high performance with binary serialization
* Good, because supports bidirectional streaming for real-time communication
* Good, because strongly typed interfaces reduce integration errors
* Good, because efficient over network compared to JSON/HTTP
* Neutral, because requires code generation for multiple languages
* Bad, because still creates point-to-point coupling between services
* Bad, because streaming connections may not scale as well as pub-sub for multiple consumers
* Bad, because adds complexity without leveraging existing event infrastructure
* Bad, because HTTP/2 dependency may complicate deployment in some environments

### Option 4: RabbitMQ message queuing for reliable message delivery

Risk Analyzer publishes messages to RabbitMQ queues consumed by Recommendation Planner.

* Good, because reliable message delivery with acknowledgments
* Good, because supports various messaging patterns (queues, pub-sub)
* Good, because mature technology with good tooling
* Good, because can handle high throughput with proper clustering
* Neutral, because similar operational model to Kafka
* Bad, because does not provide the same level of event streaming and replay capabilities
* Bad, because may require additional infrastructure alongside existing Kafka
* Bad, because less optimized for high-volume event processing compared to Kafka

## More Information

**Communication Pattern**:
* **Topics**: `urban-twin.risks.assessed` for risk events, `urban-twin.recommendations.generated` for response events
* **Message Format**: JSON schema with risk severity levels (critical/high/medium/low), location coordinates, and timestamps
* **Consumer Groups**: Planners use consumer groups for load balancing across multiple instances
* **Retention**: 7-day message retention for debugging and audit purposes

**Integration Points**:
* Risk Analyzer integrates with existing Kafka streams from ADR-0003
* Recommendation Planner publishes results to visualization service via WebSocket bridge

**Related Decisions**:
* ADR-0002: Microservices architecture enables independent scaling of analyzer and planner
* ADR-0003: Event-driven architecture provides the foundation for Kafka-based communication
* ADR-0005: Real-time visualization benefits from planner recommendations via event streaming