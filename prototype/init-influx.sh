#!/bin/bash
# Initialize additional InfluxDB buckets for vehicles and buildings

echo "Waiting for InfluxDB to be ready..."
sleep 10

# Create vehicles_metrics bucket
influx bucket create \
  --name vehicles_metrics \
  --org emergency-mgmt \
  --retention 30d \
  --token ems-super-secret-token-12345 \
  --host http://localhost:8086 \
  || echo "vehicles_metrics bucket already exists or failed to create"

# Create buildings_metrics bucket  
influx bucket create \
  --name buildings_metrics \
  --org emergency-mgmt \
  --retention 30d \
  --token ems-super-secret-token-12345 \
  --host http://localhost:8086 \
  || echo "buildings_metrics bucket already exists or failed to create"

echo "InfluxDB buckets initialized"
