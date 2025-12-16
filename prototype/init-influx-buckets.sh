#!/bin/bash
# InfluxDB Bucket Initialization Script
# Run this after InfluxDB is deployed to create the required buckets

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Initializing InfluxDB Buckets...${NC}"

# Configuration from ConfigMap
INFLUXDB_URL="http://localhost:8086"
INFLUXDB_TOKEN="digital-twin-admin-token"
INFLUXDB_ORG="emergency-mgmt"

# Buckets to create
BUCKETS=("city_metrics" "vehicles_metrics" "buildings_metrics")

echo -e "${BLUE}Please ensure port-forward is active:${NC}"
echo -e "  kubectl port-forward service/influxdb 8086:8086"
echo ""
read -p "Press enter when port-forward is ready..."

# Wait for InfluxDB to be ready
echo -e "${BLUE}Waiting for InfluxDB to be ready...${NC}"
until curl -s "${INFLUXDB_URL}/health" > /dev/null; do
    echo "Waiting for InfluxDB..."
    sleep 2
done
echo -e "${GREEN}InfluxDB is ready!${NC}"

# Create buckets
for bucket in "${BUCKETS[@]}"; do
    echo -e "${BLUE}Creating bucket: ${bucket}${NC}"
    
    # Check if bucket exists
    BUCKET_EXISTS=$(curl -s -X GET "${INFLUXDB_URL}/api/v2/buckets?name=${bucket}" \
        -H "Authorization: Token ${INFLUXDB_TOKEN}" | grep -c "\"name\":\"${bucket}\"" || true)
    
    if [ "$BUCKET_EXISTS" -gt 0 ]; then
        echo -e "${GREEN}Bucket '${bucket}' already exists${NC}"
    else
        # Create bucket
        curl -s -X POST "${INFLUXDB_URL}/api/v2/buckets" \
            -H "Authorization: Token ${INFLUXDB_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"${bucket}\",
                \"orgID\": \"$(curl -s -X GET ${INFLUXDB_URL}/api/v2/orgs?org=${INFLUXDB_ORG} -H "Authorization: Token ${INFLUXDB_TOKEN}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)\",
                \"retentionRules\": []
            }" > /dev/null
        
        echo -e "${GREEN}Created bucket: ${bucket}${NC}"
    fi
done

echo -e "\n${GREEN}InfluxDB buckets initialized successfully!${NC}"
echo -e "${BLUE}Buckets created:${NC}"
for bucket in "${BUCKETS[@]}"; do
    echo -e "  ✓ ${bucket}"
done
