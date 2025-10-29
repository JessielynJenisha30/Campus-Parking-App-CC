# Use Python slim base
FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# install system dependencies & microsoft ODBC driver 18
RUN apt-get update && apt-get install -y curl apt-transport-https gnupg2 build-essential unixodbc-dev \
  && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
  && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# create app directory
WORKDIR /app

# copy files
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip
RUN pip install -r /app/requirements.txt

COPY . /app

# Ensure static folder exists
RUN mkdir -p /app/static/qr_codes

# Expose port expected by Azure
ENV PORT=8000

# Use gunicorn to run the app
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app", "--workers", "2", "--threads", "4"]
