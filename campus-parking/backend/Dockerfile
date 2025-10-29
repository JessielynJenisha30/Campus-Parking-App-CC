FROM python:3.9-slim

WORKDIR /app

# Avoid interactive prompts during install
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies & ODBC driver prerequisites
RUN apt-get update && apt-get install -y \
    curl apt-transport-https gnupg2 build-essential unixodbc-dev ca-certificates \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /etc/apt/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add Microsoft SQL tools to PATH
ENV PATH="$PATH:/opt/mssql-tools/bin"

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all app files
COPY . .

EXPOSE 8000

CMD ["python", "-m", "flask", "run"]
