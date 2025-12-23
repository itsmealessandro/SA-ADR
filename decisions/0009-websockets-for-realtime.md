---
status: proposed
date: 2025-12-22
decision-makers: Agostino, Alessandro, Bryant, Graziano
consulted: Agostino, Alessandro, Bryant, Graziano
informed: Agostino, Alessandro, Bryant, Graziano
---

# Use of WebSockets for Real-time Dashboard Updates

## Context and Problem Statement

The Dashboard must display the live state of the city (vehicles, sensors, alerts) with a synchronization latency of less than 5-10 seconds. The system processes a high volume of events (100k/min). Traditional HTTP polling would introduce unnecessary latency and server load. We need a mechanism to push updates to the browser efficiently. Additionally, the system requires a channel for operators to send strategic commands (e.g., "Close Road") back to the server.

## Decision Drivers

*   **Latency** – Updates must be received by the client in near real-time (milliseconds).
*   **Bandwidth Efficiency** – The solution must minimize the overhead of repeated HTTP headers for high-frequency updates.
*   **Server Load** – The solution must avoid the "thundering herd" problem associated with frequent polling.
*   **Bi-directionality** – The channel should support both receiving updates and sending commands.
*   **Browser Support** – The solution must work across all modern browsers.

## Considered Options

*   **Option 1**: WebSockets (Socket.io / Native WS)
*   **Option 2**: Server-Sent Events (SSE)
*   **Option 3**: Short Polling (HTTP)
*   **Option 4**: Long Polling

## Decision Outcome

Chosen option: "**Option 1: WebSockets**", because it provides a full-duplex communication channel over a single TCP connection. This is superior to SSE because it natively supports bi-directional communication, allowing the Dashboard not just to receive updates but also to send strategic commands without opening a separate HTTP request. It also has lower overhead than polling for high-frequency updates.

### Consequences

*   Good, because it offers the lowest possible latency for updates.
*   Good, because it supports bi-directional communication (Command & Control) on a single connection.
*   Good, because it is bandwidth-efficient (no HTTP headers per message).
*   Good, because it is widely supported by modern browsers and libraries (Socket.io).
*   Bad, because it requires stateful connections on the server (State Manager), which complicates horizontal scaling (requires sticky sessions or a pub/sub backplane like Redis).
*   Bad, because firewalls/proxies sometimes block WebSocket connections (though fallback mechanisms exist).

## Pros and Cons of the Options

### Option 2: Server-Sent Events (SSE)

A standard allowing servers to push data to web pages over HTTP.

*   Good, because it uses standard HTTP, making it firewall-friendly.
*   Good, because it has built-in automatic reconnection.
*   Good, because simpler protocol than WebSockets (text-based).
*   Bad, because it is mono-directional (Server -> Client only). Sending commands requires a separate HTTP POST, complicating the application logic.
*   Bad, because limited browser support (requires polyfills for older browsers, though less of an issue today).
*   Bad, because limited to 6 concurrent connections per domain on HTTP/1.1 (though HTTP/2 fixes this).

### Option 3: Short Polling (HTTP)

The client sends HTTP requests at fixed intervals (e.g., every 1 second) to check for updates.

*   Good, because extremely simple to implement (standard REST API).
*   Good, because stateless, making server scaling easy (standard Load Balancer).
*   Bad, because introduces significant latency (average latency = interval / 2).
*   Bad, because wastes bandwidth and server resources if there are no updates (empty responses).
*   Bad, because high frequency polling creates massive server load ("thundering herd").

### Option 4: Long Polling

The client sends a request, and the server holds it open until new data is available.

*   Good, because provides better latency than short polling.
*   Good, because works over standard HTTP without special proxy configuration.
*   Bad, because high overhead of establishing a new HTTP connection for every message.
*   Bad, because complex to implement correctly on the server side to handle timeouts and connection drops.
*   Bad, because effectively obsolete given the widespread support for WebSockets and SSE.

## More Information

**Related Decisions:**
*   ADR-0003: Event-Driven Architecture (provides the backend stream that feeds the WebSockets).
