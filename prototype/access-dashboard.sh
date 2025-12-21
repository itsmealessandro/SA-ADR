#!/bin/bash

# Function to kill all background jobs on exit
cleanup() {
    echo "Stopping all port-forwards..."
    kill $(jobs -p) 2>/dev/null
}

trap cleanup EXIT

echo "Waiting for all pods to be ready..."
kubectl wait --for=condition=ready pod -l app=dashboard --timeout=60s
kubectl wait --for=condition=ready pod -l app=state-manager --timeout=60s
kubectl wait --for=condition=ready pod -l app=notification-manager --timeout=60s

echo "Starting port-forwarding for Dashboard and dependencies..."

# Dashboard FE
# Forwarding service/dashboard port 80 to localhost:8080
echo "Forwarding Dashboard (http://localhost:8080)..."
kubectl port-forward service/dashboard 8080:8080 &

# State Manager API
# Forwarding service/state-manager port 3000 to localhost:3000
echo "Forwarding State Manager API (http://localhost:3000)..."
kubectl port-forward service/state-manager 3000:3000 &

# State Manager WebSocket
# Forwarding service/state-manager port 3001 to localhost:3001
echo "Forwarding State Manager WebSocket (ws://localhost:3001)..."
kubectl port-forward service/state-manager 3001:3001 &

# Notification Manager API
# Forwarding service/notification-manager port 3002 to localhost:3002
echo "Forwarding Notification Manager (http://localhost:3002)..."
kubectl port-forward service/notification-manager 3002:3002 &

# reccomandation manager
# Forwarding service/recommendation-manager port  to localhost:8081
echo "Forwarding service/recommendation-manager (http://localhost:8081)..."
kubectl port-forward service/recommendation-manager 8081:8081 &


# reccomandation manager
# Forwarding service/riskDetector port  to localhost:8082
echo "Forwarding service/riskDetector (http://localhost:8082)..."
kubectl port-forward service/risk-detector 8082:8082 &


# Wait for a moment to let connections establish
sleep 2

echo ""
echo "Dashboard is accessible at: http://localhost:8080"
echo "Press Ctrl+C to stop."

# Keep script running to maintain background jobs
wait
