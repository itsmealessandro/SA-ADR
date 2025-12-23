#  L'Aquila Emergency Management System - Digital Twin

Sistema di gestione emergenze basato su architettura **Kubernetes** con Minikube, Kafka e InfluxDB.

---

##  Quick Start

### Prerequisites

- **Docker** installed and running
- **Minikube** installed (`minikube version`)
- **kubectl** installed and configured

### 1. Start Minikube Cluster

```bash

# Start minikube with metrics and dashboard (recommended)
./start-cluster.sh

# OR start optimized (no metrics/dashboard for lower resource usage)
./start-cluster.sh optimized
```

### 2. Build and Deploy All Services

```bash
./setup-cluster.sh
```

### 3. Access the Dashboard

```bash
./access-dashboard.sh
```

This exposes:
- **Dashboard UI**: http://localhost:8080
- **State Manager API**: http://localhost:3000
- **State Manager WebSocket**: ws://localhost:3001
- **Notification Manager**: http://localhost:3002

### 4. Access InfluxDB (Optional)

```bash
kubectl port-forward service/influxdb 8086:8086
```
- URL: http://localhost:8086
- Username: `admin`
- Password: `adminpassword`

---

##  Useful Commands

### View Logs

```bash
# All pods status
kubectl get pods

# Logs for specific service
kubectl logs -f deployment/state-manager
kubectl logs -f deployment/city-simulator
```

### Stop Services

```bash
# Stop port-forwarding
# Press Ctrl+C in the terminal running access-dashboard.sh

# Delete all deployments
kubectl delete -f kubernetes/

# Stop minikube
minikube stop

# Full cleanup
minikube delete
```

---

##  Development

### Rebuild a Single Service

```bash
# Rebuild image
docker build -t digital-twin/<service-name>:latest -f ./<service-folder>/Dockerfile .

# Load into minikube
minikube image load digital-twin/<service-name>:latest

# Restart deployment
kubectl rollout restart deployment/<service-name>
```

### Rebuild All Services

```bash
./setup-cluster.sh
```

---

##  Troubleshooting

### Pods not starting

```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Kafka connection issues

Wait for Kafka pod to be ready (~30-60 seconds):

```bash
kubectl wait --for=condition=ready pod -l app=kafka --timeout=120s
```

### Image not found in Minikube

```bash
minikube image load digital-twin/<service-name>:latest
```

---

##  API Documentation

- **State Manager API**: [state-manager/docs/api/API_DOCUMENTATION.md](state-manager/docs/api/API_DOCUMENTATION.md)
- **Notification Manager API**: [notification-manager/docs/api/API_DOCUMENTATION.md](notification-manager/docs/api/API_DOCUMENTATION.md)

---

**Last Updated**: 2025-12-23
