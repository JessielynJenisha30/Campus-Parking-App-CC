# Use the official Python image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy all files from current directory into the container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port Flask runs on
EXPOSE 8000

# Run the app
CMD ["python", "app.py"]
