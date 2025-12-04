FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY buildings-simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common utilities (shared module)
COPY common/ /app/common/

# Copy application files
COPY buildings-simulator/*.py ./
COPY buildings-simulator/config/ ./config/

# Run the simulator
CMD ["python", "buildings_simulator.py"]
