---
status: proposed
date: 2025-12-22
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Use Hybrid Edge-server Building Evacuation Algorithm with Integer Linear Programming and Ant Colony Optimization

## Context and Problem Statement

The Urban Digital Twin must provide real-time evacuation route optimization for buildings during emergencies (fires, earthquakes, gas leaks, active shooter situations, structural failures). The system needs to calculate optimal evacuation paths for building occupants (museums, office buildings, shopping malls, schools, hospitals), considering dynamic constraints like blocked corridors, damaged staircases, smoke-filled rooms, and exit capacity limits. The fundamental challenge is: which algorithmic approach should we use for building evacuation optimization, and where should the computation occur (edge vs. server) to balance response time, accuracy, and resource constraints?

Building evacuation scenarios vary significantly in complexity:
- **Low-complexity**: Small building with simple layout (<200 people, <30 rooms, 2-4 exits)
- **Medium-complexity**: Large building with multiple floors and wings (200-1000 people, 30-150 rooms, 4-10 exits)
- **High-complexity**: Complex buildings like museums or shopping malls with intricate layouts (>1000 people, >150 rooms, >10 exits, dynamic hazard zones)

The system must deliver evacuation routes within strict time constraints (3-20 seconds for initial routes) while optimizing for total evacuation time, bottleneck avoidance, and equitable distribution across exits.

## Decision Drivers

* **Response Time**: Initial evacuation routes must be available within 3-20 seconds of emergency declaration (NFR - Highest priority)
* **Solution Quality**: Routes must minimize total evacuation time and avoid creating dangerous bottlenecks (Functional requirement - Critical)
* **Scalability**: Must handle scenarios from small buildings (100 people) to large complex buildings (5000+ people) evacuations (NFR - Highest priority)
* **Dynamic Adaptation**: Routes must update as building status changes (blocked corridors, smoke spread, stairwell damage) with <10 second latency (NFR - High priority)
* **Edge Reliability**: Must function during network partitions when server connectivity is lost (ADR-0004 edge fault tolerance)
* **Resource Optimization**: Minimize computational costs while maintaining solution quality (C12, NFR - High priority)
* **Complexity Handling**: Algorithm must handle time-varying constraints, capacity limits, and multi-exit scenarios

## Considered Options

* **Option 1**: Integer Linear Programming (ILP) on server with edge-based simple routing fallback
* **Option 2**: Ant Colony Optimization (ACO) exclusively on server
* **Option 3**: Network Flow algorithms on edge devices only
* **Option 4**: Hybrid approach - ILP on server for complex scenarios, ACO for medium complexity, simple Dijkstra/BFS on edge for low complexity

## Decision Outcome

Chosen option: "**Option 4: Hybrid Edge-server approach with tiered algorithms**", because it provides the best balance between solution quality, response time, and fault tolerance. The system uses a three-tier strategy:

1. **Edge Tier (Low Complexity)**: Breadth-First Search (BFS) + Dijkstra for simple building evacuations (<200 people, simple layouts)
2. **server Tier - Fast (Medium Complexity)**: Ant Colony Optimization for large buildings (200-1000 people, multi-floor)
3. **server Tier - Optimal (High Complexity)**: Integer Linear Programming (ILP) via HiGHS/Gurobi for complex buildings like museums and shopping malls (>1000 people)

Complexity detection happens automatically based on: occupant count, number of rooms/corridors (graph nodes), number of blocked areas, building layout complexity, and available computation time budget.

### Consequences

* Good, because edge-based BFS provides < 3 second response for simple building evacuations even during network outages
* Good, because ILP provides mathematically optimal solutions for complex buildings (museums, malls) where solution quality is critical
* Good, because ACO offers good balance between solution quality and computation time for multi-floor office buildings
* Good, because tiered approach optimizes cost by using expensive ILP solvers only when necessary (C12)
* Good, because edge fallback ensures continued operation during network partitions (ADR-0004)
* Good, because ILP can identify unreachable occupants through breadth-search preprocessing for targeted rescue
* Good, because ACO adapts well to dynamic constraint changes (smoke spread, blocked exits) through pheromone evaporation mechanism
* Good, because all three algorithms use the same graph representation G=(N,A) with rooms/corridors as nodes and passages as arcs, simplifying data model
* Bad, because requires maintaining three different algorithm implementations
* Bad, because complexity classification logic adds decision overhead (typically <1 second)
* Bad, because ILP requires commercial solver licenses (Gurobi) or relies on open-source alternatives (HiGHS) with potentially lower performance


### Confirmation

The hybrid approach will be validated through:
- Performance benchmarks comparing response times across complexity tiers
- Solution quality metrics comparing evacuation times between algorithms on identical scenarios
- Edge failover testing with simulated network partitions
- Memory profiling on edge devices during graph-based computations

## Pros and Cons of the Options

### Option 1: ILP on server with edge-based simple routing fallback

Pure Integer Linear Programming approach for all complex evacuations, with simple shortest-path fallback on edge.

#### ILP Algorithm Details (from Matera Digital Twin paper)

The evacuation problem is modeled on an oriented graph G = (N, A):
- **Nodes (N)**: Physical locations within the building (rooms, corridors, lobbies, stairwells)
  - Each node u has capacity cu (max occupants at time t)
  - Nodes partitioned into rooms/zones r1, ..., rh
  - E ⊂ R: emergency exit rooms/zones (building exits)
  - U ⊂ R: unavailable/blocked zones (smoke-filled rooms, damaged areas)
  
- **Arcs (A)**: Movement possibilities between rooms/corridors (doorways, passages, stairs)
  - Arc a = (u, v) has travel time da (seconds) and capacity qa (people/second based on doorway width)
  - Generally symmetric except: no arcs leaving exit zones E, no arcs entering blocked zones U

- **Variables** (indexed over time horizon T):
  - xu,t: number of visitors at node u at time t
  - ya,t: number of visitors entering arc a at time t

- **Constraints**:
  - Flow conservation at each node over time
  - Arc capacities and travel times respected
  - Node capacity limits enforced
  
- **Objective**: Minimize time when last visitor reaches emergency exit

- **Preprocessing**: BFS identifies unreachable populations before optimization

- **Solvers**: Gurobi (commercial) or HiGHS (open-source) via Python

* Good, because ILP provides provably optimal solutions minimizing total evacuation time
* Good, because can model complex constraints (time-varying capacities, room limits, smoke-filled zones)
* Good, because BFS preprocessing identifies unreachable occupants for rescue prioritization
* Good, because open-source solver HiGHS eliminates licensing costs for production deployment
* Good, because edge fallback ensures basic routing during network outages
* Neutral, because Gurobi offers better performance than HiGHS but requires commercial licensing
* Bad, because ILP computation time grows rapidly with problem size (may take 15-30 seconds for very large buildings)
* Bad, because all medium-complexity buildings forced to use expensive ILP or fall back to simplistic edge routing
* Bad, because edge fallback (Dijkstra/BFS) ignores capacity constraints and dynamic flow, producing suboptimal routes

### Option 2: Ant Colony Optimization (ACO) exclusively on server servers

Metaheuristic approach inspired by ant foraging behavior for all evacuation scenarios.

#### ACO Algorithm Details

- **Pheromone Model**: Virtual pheromones deposited on graph edges representing route quality
- **Ant Agents**: Simulated evacuees that probabilistically select paths based on pheromone concentration and heuristic desirability
- **Iteration Process**: 
  1. Deploy ants from starting positions
  2. Ants construct solutions following pheromone trails and heuristics
  3. Update pheromones based on solution quality (evaporate old, reinforce good paths)
  4. Repeat until convergence or time limit
- **Parameters**: Colony size, evaporation rate, pheromone influence, heuristic influence
- **Advantages**: Naturally handles dynamic changes through pheromone evaporation

* Good, because ACO provides near-optimal solutions with faster computation than ILP
* Good, because naturally handles dynamic constraint updates through pheromone evaporation
* Good, because scales better than ILP for medium-to-large problem instances
* Good, because can incorporate multiple objectives (safety, distance, congestion) in heuristic function
* Good, because inherently parallel algorithm that can leverage multi-core server infrastructure
* Neutral, because solution quality depends heavily on parameter tuning (colony size, evaporation rate)
* Bad, because no edge fallback option - complete failure during network outages
* Bad, because provides approximate solutions without optimality guarantees
* Bad, because may struggle with very simple scenarios where exact algorithms are sufficient
* Bad, because harder to verify correctness compared to deterministic algorithms
* Bad, because doesn't identify unreachable populations as explicitly as ILP's BFS preprocessing

### Option 3: Network Flow algorithms on edge devices only

Maximum flow/minimum cost flow algorithms running entirely on edge infrastructure.

* Good, because runs entirely on edge, providing full functionality during network partitions
* Good, because network flow algorithms are well-established with efficient implementations
* Good, because can handle capacity constraints and flow conservation naturally
* Good, because polynomial-time complexity provides predictable performance
* Neutral, because requires sufficient edge device computational resources
* Bad, because classic network flow doesn't model time-varying constraints (smoke spread) well
* Bad, because difficult to model evacuation time horizon and temporal dynamics
* Bad, because edge devices may lack resources for large complex building graphs (>150 rooms)
* Bad, because cannot leverage server computational power for complex museum/mall scenarios
* Bad, because misses opportunity for optimality provided by ILP or quality improvements from ACO

### Option 4: Hybrid approach - tiered algorithms based on complexity (CHOSEN)

Three-tier strategy with automatic complexity detection and algorithm selection.

#### Tier 1: Edge - Simple Building Evacuation (BFS + Dijkstra)
- **Trigger**: <200 people, simple layout, <30 rooms
- **Algorithm**: Breadth-First Search for reachability + Dijkstra's shortest path
- **Execution**: Edge device (buildings-monitor)
- **Response Time**: < 3 seconds
- **Use Case**: Small office building fire, retail store evacuation, school classroom wing

#### Tier 2: server - Medium Complexity Buildings (ACO)
- **Trigger**: 200-1000 people, multi-floor, 30-150 rooms, <5 blocked zones
- **Algorithm**: Ant Colony Optimization
- **Execution**: server microservice (evacuation-optimizer)
- **Response Time**: 3-10 seconds
- **Use Case**: Large office building fire, multi-floor hospital wing, convention center

#### Tier 3: server - High Complexity Buildings (ILP)
- **Trigger**: >1000 people, complex layout, >150 rooms, cascading hazards
- **Algorithm**: Integer Linear Programming (HiGHS/Gurobi)
- **Execution**: server microservice with dedicated computational resources
- **Response Time**: 10-20 seconds (with time limit)
- **Use Case**: Museum evacuation (like Matera paper), shopping mall, large airport terminal, stadium

#### Complexity Detection Logic
```python
def select_algorithm(occupants, num_rooms, blocked_zones, network_available):
    if not network_available:
        return "EDGE_BFS"  # Fallback regardless of complexity
    
    if occupants < 200 and num_rooms < 30:
        return "EDGE_BFS"
    elif occupants < 1000 and num_rooms < 150 and blocked_zones < 5:
        return "server_ACO"
    else:
        return "server_ILP"
```

* Good, because provides optimal algorithm for each building evacuation complexity
* Good, because balances cost optimization (simple algorithms for simple buildings) with solution quality
* Good, because maintains edge autonomy for simple building evacuations during network failures
* Good, because ACO middle tier provides good performance for multi-floor buildings without ILP computational cost
* Good, because can start with fast ACO solution and upgrade to ILP if time permits for complex buildings
* Good, because all algorithms share same graph model G=(N,A) with rooms as nodes, simplifying integration
* Neutral, because adds complexity in algorithm orchestration and selection logic
* Bad, because requires implementing and maintaining three different algorithms
* Bad, because complexity thresholds (200, 1000 occupants) require empirical tuning through building evacuation drills

### Related Decisions

- **ADR-0002**: Microservices architecture enables dedicated evacuation-optimizer service with independent scaling
- **ADR-0003**: Kafka event streaming provides real-time building sensor status updates (smoke, temperature, door locks) for dynamic graph modifications
- **ADR-0004**: Edge fault tolerance strategy ensures basic building evacuation routing survives network partitions
- **ADR-0005**: 2D visualization displays building floor plans with evacuation routes as colored arrows and exit markers
