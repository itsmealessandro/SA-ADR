#!/bin/bash
# Start minikube.
# Pass the positional argument "optimized" (or --optimized) to disable metrics
# and skip enabling the metrics/dashboard addons.

set -euo pipefail

CPUS=4
MEMORY=4096

usage() {
	echo "Usage: $0 [optimized]"
	echo
	echo "If 'optimized' is provided, the script starts minikube with metrics disabled"
	echo "and without enabling the metrics-server/dashboard addons."
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
	usage
	exit 0
fi

OPTIMIZED=false
if [ "${1:-}" = "optimized" ] || [ "${1:-}" = "--optimized" ]; then
	OPTIMIZED=true
fi

if [ "$OPTIMIZED" = true ]; then
	echo "Starting minikube (optimized): disabling metrics, skipping addons"
	minikube start --cpus="$CPUS" --memory="$MEMORY" --disable-metrics=true
else
	echo "Starting minikube with metrics & dashboard addons enabled"
	minikube start --cpus="$CPUS" --memory="$MEMORY" --addons=metrics-server,dashboard
fi