#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Digital Twin Kubernetes Setup...${NC}"

# NOTE: only for alessandros PC 
# 0 pull images
docker pull apache/kafka:latest
docker pull redis:7-alpine
docker pull mongo:6

# 1. Build Images locally
echo -e "\n${BLUE}--- Step 1: Building Docker Images Locally ---${NC}"

# State Manager
docker build -t digital-twin/state-manager:latest ./state-manager

# Notification Manager
docker build -t digital-twin/notification-manager:latest ./notification-manager

# Data Producer
docker build -t digital-twin/data-producer:latest ./producer

# Recommendation Manager
echo -e "${BLUE}Building Recommendation Manager (digital-twin/recommendation-manager:latest)...${NC}"
docker build -t digital-twin/recommendation-manager:latest ./recommendationManager
echo -e "${GREEN}Successfully built Recommendation Manager${NC}"

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
    minikube image load digital-twin/recommendation-manager:latest
    minikube image load digital-twin/dashboard:latest
    minikube image load apache/kafka:latest
    minikube image load redis:7-alpine
    minikube image load mongo:6
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
echo -e "Access the Dashboard at: http://localhost:8080"
echo -e "Access the State Manager API at: http://localhost:3000"
echo -e "Access the Notification Manager API at: http://localhost:3002/api"
echo -e "Access the Recommendation Manager at: http://localhost:8081"

# Run access-dashboard.sh script
./access-dashboard.sh
