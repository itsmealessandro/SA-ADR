FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
# Copy requirements first for better caching
COPY vehicles-monitor/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common module
COPY common /app/common

# Copy the application code
COPY vehicles-monitor/monitor_consumer.py .

# Run the monitor consumer
CMD ["python", "-u", "monitor_consumer.py"]
