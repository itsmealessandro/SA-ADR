#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Digital Twin Kubernetes Setup...${NC}"

# 1. Build Images locally
echo -e "\n${BLUE}--- Step 1: Building Docker Images Locally ---${NC}"

# State Manager
docker build -t digital-twin/state-manager:latest ./state-manager

# Notification Manager
docker build -t digital-twin/notification-manager:latest ./notification-manager

# Data Producer
docker build -t digital-twin/data-producer:latest ./producer

# Recommendation Manager 
# echo -e "${BLUE}Building Recommendation Manager (digital-twin/recommendation-manager:latest)...${NC}"
# docker build -t digital-twin/recommendation-manager:latest ./recommendationManager
# echo -e "${GREEN}Successfully built Recommendation Manager${NC}"

# City Simulator
echo -e "${BLUE}Building City Simulator (digital-twin/city-simulator:latest)...${NC}"
docker build -t digital-twin/city-simulator:latest -f ./city-simulator/Dockerfile .
echo -e "${GREEN}Successfully built City Simulator${NC}"

# Vehicles Simulator
echo -e "${BLUE}Building Vehicles Simulator (digital-twin/vehicles-simulator:latest)...${NC}"
docker build -t digital-twin/vehicles-simulator:latest -f ./vehicles-simulator/Dockerfile .
echo -e "${GREEN}Successfully built Vehicles Simulator${NC}"

# Buildings Simulator
echo -e "${BLUE}Building Buildings Simulator (digital-twin/buildings-simulator:latest)...${NC}"
docker build -t digital-twin/buildings-simulator:latest -f ./buildings-simulator/Dockerfile .
echo -e "${GREEN}Successfully built Buildings Simulator${NC}"

# City Monitor
echo -e "${BLUE}Building City Monitor (digital-twin/city-monitor:latest)...${NC}"
docker build -t digital-twin/city-monitor:latest -f ./city-monitor/Dockerfile .
echo -e "${GREEN}Successfully built City Monitor${NC}"

# Vehicles Monitor
echo -e "${BLUE}Building Vehicles Monitor (digital-twin/vehicles-monitor:latest)...${NC}"
docker build -t digital-twin/vehicles-monitor:latest -f ./vehicles-monitor/Dockerfile .
echo -e "${GREEN}Successfully built Vehicles Monitor${NC}"

# Buildings Monitor
echo -e "${BLUE}Building Buildings Monitor (digital-twin/buildings-monitor:latest)...${NC}"
docker build -t digital-twin/buildings-monitor:latest -f ./buildings-monitor/Dockerfile .
echo -e "${GREEN}Successfully built Buildings Monitor${NC}"

# Dashboard
echo -e "${BLUE}Building Dashboard (digital-twin/dashboard:latest)...${NC}"
docker build \
  --build-arg VITE_STATE_MANAGER_API_URL=http://localhost:3000 \
  --build-arg VITE_STATE_MANAGER_WS_URL=ws://localhost:3001 \
  --build-arg VITE_NOTIFICATION_MANAGER_API_URL=http://localhost:3002/api \
  -t digital-twin/dashboard:latest ./dashboard
echo -e "${GREEN}Successfully built Dashboard${NC}"

# 2. Load Images into Minikube (if applicable)
if [ "$(kubectl config current-context)" = "minikube" ]; then
    echo -e "\n${BLUE}--- Step 1.5: Loading Images into Minikube ---${NC}"
    echo "This may take a minute..."
    minikube image load digital-twin/state-manager:latest
    minikube image load digital-twin/notification-manager:latest
    minikube image load digital-twin/data-producer:latest
    # minikube image load digital-twin/recommendation-manager:latest 
    minikube image load digital-twin/city-simulator:latest
    minikube image load digital-twin/vehicles-simulator:latest
    minikube image load digital-twin/buildings-simulator:latest
    minikube image load digital-twin/city-monitor:latest
    minikube image load digital-twin/vehicles-monitor:latest
    minikube image load digital-twin/buildings-monitor:latest
    minikube image load digital-twin/dashboard:latest
    echo -e "${GREEN}Images loaded into Minikube${NC}"
fi

# 2. Apply Manifests
echo -e "\n${BLUE}--- Step 2: Deploying to Kubernetes ---${NC}"
kubectl apply -f kubernetes/

# 3. Verify
echo -e "\n${BLUE}--- Step 3: Deployment Status ---${NC}"
echo "Waiting a few seconds for resources to be created..."
sleep 5
kubectl get pods
kubectl get services

echo -e "\n${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}Deployed Services:${NC}"
echo -e "  ✓ 3 Simulators: city, vehicles, buildings"
echo -e "  ✓ 3 Monitors: city, vehicles, buildings"
echo -e "  ✓ State Manager, Notification Manager, Dashboard"
echo -e "  ✓ Kafka, MongoDB, Redis, InfluxDB"
echo -e ""
echo -e "${BLUE}Access Services (use port-forward):${NC}"
echo -e "  Dashboard:     kubectl port-forward service/dashboard 8080:80"
echo -e "  State Manager: kubectl port-forward service/state-manager 3000:3000"
echo -e "  Notifications: kubectl port-forward service/notification-manager 3002:3002"
echo -e "  InfluxDB UI:   kubectl port-forward service/influxdb 8086:8086"
# echo -e "  Recommendation: kubectl port-forward service/recommendation-manager 8081:8081"  # Gestito separatamente
echo -e ""
echo -e "${GREEN}InfluxDB Credentials:${NC}"
echo -e "  URL:      http://localhost:8086 (after port-forward)"
echo -e "  Username: admin"
echo -e "  Password: adminpassword"
echo -e "  Org:      emergency-mgmt"
echo -e "  Buckets:  city_metrics, vehicles_metrics, buildings_metrics"
echo -e "  ${BLUE}Note: Buckets auto-initialized by influxdb-init-buckets Job${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Run access-dashboard.sh script
./access-dashboard.sh