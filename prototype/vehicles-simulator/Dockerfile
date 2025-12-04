FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY vehicles-simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common utilities (shared module)
COPY common/ /app/common/

# Copy application files
COPY vehicles-simulator/*.py ./
COPY vehicles-simulator/config/ ./config/

# Run the simulator
CMD ["python", "vehicles_simulator.py"]
