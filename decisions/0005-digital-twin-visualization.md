---
status: accepted
date: 2025-11-17
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Use 2D Map Visualization with GeoJSON for Urban Digital Twin Display

## Context and Problem Statement

The Urban Digital Twin must provide real-time visualization of urban state to up to 50 concurrent operators (District Operators and City Managers) monitoring traffic conditions, critical infrastructure availability, and emergency response assets. The system processes 100,000 events/minute across 5,000 data streams and must display this information in an intuitive, performant manner. The fundamental question is: should the digital twin use 2D or 3D map visualization, and how should we represent the dense, real-time data (traffic flow, sensor status, infrastructure availability, district boundaries) on the map without overwhelming users or degrading performance?

## Decision Drivers

* **Performance**: Must render real-time updates from 100k events/min without lag or stutter (NFR - High priority)
* **Usability**: Dashboards should be intuitive for emergency operators making time-critical decisions (NFR - Low priority but critical for adoption)
* **Cost Optimization**: Minimize compute resources for rendering and data transmission (C12, NFR - High priority)
* **Browser Compatibility**: Must work reliably across standard operator workstations without specialized hardware
* **Data Density**: Must visualize traffic conditions across entire districts with color-coded polylines and infrastructure markers
* **Scalability**: System must support expansion to multiple districts without visualization performance degradation (NFR - Highest priority)
* **Real-time Synchronization**: Visualization updates must align with 5-10 second digital twin synchronization requirement (NFR - High priority)

## Considered Options

* **Option 1**: 2D map with GeoJSON district boundaries and color-coded traffic polylines
* **Option 2**: 3D map with building models and volumetric traffic visualization
* **Option 3**: Hybrid approach with 2D base map and selective 3D elements
* **Option 4**: Simple grid-based visualization without geographic context

## Decision Outcome

Chosen option: "**Option 1: 2D map with GeoJSON district boundaries and color-coded traffic polylines**", because it provides all necessary information for emergency decision-making without introducing unnecessary computational overhead. 3D visualization would add significant complexity and cost without improving decision quality for the traffic routing and accessibility use cases that define this system.

### Consequences

* Good, because 2D maps render efficiently in browsers, supporting 50 concurrent operators without specialized hardware
* Good, because color-coded polylines (red=high traffic, orange=medium, green=low) provide immediate visual understanding of traffic conditions
* Good, because GeoJSON district boundaries enable efficient role-based data filtering (District Operators see only their district)
* Good, because 2D reduces data transmission requirements, supporting cost optimization goals (C12)
* Good, because zoom-based progressive disclosure (show district GeoJSON only after certain zoom level) manages data density effectively
* Good, because mature mapping libraries (Leaflet, Mapbox GL JS, OpenLayers) provide robust 2D capabilities
* Good, because 2D visualization is sufficient for route planning and accessibility analysis use cases
* Bad, because building height information is lost, which could be relevant for certain emergency scenarios
* Bad, because cannot visualize vertical infrastructure elements like elevated highways or multi-level metro stations
* Neutral, because requires careful design of marker icons for critical infrastructure (hospitals, fire stations, metro stations, police stations) to avoid clutter

## Pros and Cons of the Options

### Option 2: 3D map with building models and volumetric traffic visualization

Full 3D rendering building models, 3D traffic flow visualization, and perspective camera controls.

* Good, because provides realistic representation of urban environment
* Good, because can visualize vertical relationships between infrastructure elements
* Good, because 3D building models could help operators identify landmarks
* Neutral, because "impressive" visualization may not translate to better decision-making for traffic routing
* Bad, because significantly increases computational requirements for rendering, requiring GPU acceleration
* Bad, because 3D asset generation and storage adds substantial infrastructure costs
* Bad, because loading 3D models for entire districts creates unacceptable initial load times
* Bad, because 3D data transmission consumes more bandwidth, increasing operational costs (conflicts with C12)
* Bad, because 3D visualization is unnecessary for the core use cases (route planning, accessibility monitoring)

### Option 3: Hybrid approach with 2D base map and selective 3D elements

2D base map with on-demand 3D visualization for specific areas of interest or buildings.

* Good, because provides flexibility to add 3D elements where genuinely useful
* Good, because maintains 2D performance for overview operations
* Neutral, because allows future enhancement without fundamental architecture change
* Bad, because increases complexity of visualization layer with dual rendering modes
* Bad, because managing transitions between 2D and 3D views adds development effort
* Bad, because operators must learn two different interaction paradigms
* Bad, because still requires 3D asset pipeline and storage infrastructure
* Bad, because unclear which use cases genuinely benefit from selective 3D in an emergency traffic routing system
* Bad, because current functional requirements don't identify scenarios requiring 3D visualization

### Option 4: Simple grid-based visualization without geographic context

Abstract grid representation of city districts without actual map tiles or geographic coordinates.

* Good, because minimal rendering overhead with simple geometric shapes
* Good, because very fast initial load and updates
* Bad, because operators cannot relate abstract grid to real-world geography
* Bad, because impossible to correlate with existing traffic maps, GPS coordinates, or physical landmarks
* Bad, because violates functional requirement for "live map showing traffic conditions"
* Bad, because emergency responders need geographic context to plan routes
* Bad, because no way to display actual road network topology for route simulation

## More Information

**Visualization Technology Stack**:
* **Map Library**: Mapbox GL JS or Leaflet.js (both support GeoJSON and real-time updates)
* **Traffic Representation**: Colored polylines (RGB values: #FF0000=congested, #FFA500=moderate, #00FF00=clear)
* **District Boundaries**: GeoJSON polygons loaded dynamically based on user role (RBAC integration)
* **Infrastructure Markers**: Custom SVG icons with clustering at lower zoom levels
* **Real-time Updates**: WebSocket connection to push traffic condition changes without polling

**Critical Infrastructure Icons** (to be defined):
* Hospitals (🏥)
* Fire stations (🚒)  
* Police stations (🚔) 
* Metro stations (🚇)
* Bus stops (🚌)

**Related Decisions**:
* ADR-0002: Microservices architecture allows separate visualization service that can be scaled independently
* ADR-0003: Kafka event streaming enables real-time map updates via WebSocket bridge
* Future ADR needed: Specific mapping library selection (Mapbox GL vs Leaflet) based on licensing and feature comparison
