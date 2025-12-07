#!/bin/bash
set -e

echo "=========================================="
echo "L'Aquila Graph Generation - Overture Maps"
echo "=========================================="

# Define output directory and L'Aquila bounding box
OUTPUT_DIR="/app/output"
XMIN="13.38"
YMIN="42.34"
XMAX="13.42"
YMAX="42.36"
RELEASE="2025-11-19.0"

echo ""
echo "Step 1/2: Downloading road segments from Overture Maps using DuckDB..."
echo "Bounding box: $XMIN,$YMIN to $XMAX,$YMAX"
echo "Release: $RELEASE"
echo ""

# Check if segment file already exists
if [ -f "${OUTPUT_DIR}/laquila_segment.geojson" ]; then
    echo "✅ Segment data already exists, skipping download"
else
    echo "Downloading segments..."
    # Download segments using DuckDB
    duckdb -c "
install spatial;
LOAD spatial;
SET s3_region='us-west-2';

COPY (
    SELECT
        id,
        names.primary as name,
        class,
        geometry
    FROM
        read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=transportation/type=segment/*', filename=true, hive_partitioning=1)
    WHERE
        bbox.xmin < ${XMAX}
        AND bbox.ymin < ${YMAX}
        AND bbox.xmax > ${XMIN}
        AND bbox.ymax > ${YMIN}
) TO '${OUTPUT_DIR}/laquila_segment.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON');
"

    if [ $? -ne 0 ]; then
        echo "❌ Failed to download segment data"
        exit 1
    fi

    echo "✅ Segments downloaded successfully"
fi

# Check if connector file already exists
echo ""
if [ -f "${OUTPUT_DIR}/laquila_connector.geojson" ]; then
    echo "✅ Connector data already exists, skipping download"
else
    echo "Downloading connectors..."
    # Download connectors using DuckDB
    duckdb -c "
install spatial;
LOAD spatial;
SET s3_region='us-west-2';

COPY (
    SELECT
        id,
        geometry
    FROM
        read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=transportation/type=connector/*', filename=true, hive_partitioning=1)
    WHERE
        bbox.xmin < ${XMAX}
        AND bbox.ymin < ${YMAX}
        AND bbox.xmax > ${XMIN}
        AND bbox.ymax > ${YMIN}
) TO '${OUTPUT_DIR}/laquila_connector.geojson' WITH (FORMAT GDAL, DRIVER 'GeoJSON');
"

    if [ $? -ne 0 ]; then
        echo "⚠️  Warning: Failed to download connector data (continuing anyway)"
        # Create an empty GeoJSON file as placeholder
        echo '{"type":"FeatureCollection","features":[]}' > "${OUTPUT_DIR}/laquila_connector.geojson"
    else
        echo "✅ Connectors downloaded successfully"
    fi
fi

# List downloaded files for debugging
echo ""
echo "Downloaded files:"
ls -lh "${OUTPUT_DIR}/"

# Process the data with Python script
echo ""
echo "Step 2/2: Processing data and generating graph..."
python generate_laquila_graph.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Graph generation completed successfully!"
    echo "=========================================="
    echo ""
    echo "Output files in ${OUTPUT_DIR}:"
    ls -lh "${OUTPUT_DIR}/" | grep -E '\.(geojson|json|parquet)$'
else
    echo ""
    echo "❌ Graph generation failed"
    exit 1
fi
