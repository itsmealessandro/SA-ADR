FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY monitor_consumer.py .

# Run the monitor consumer
CMD ["python", "-u", "monitor_consumer.py"]
