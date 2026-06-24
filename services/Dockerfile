FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV USE_SUPABASE=false

COPY services/analytics_service/requirements.txt /tmp/analytics-requirements.txt
COPY services/product_service/requirements.txt /tmp/product-requirements.txt
RUN pip install --no-cache-dir -r /tmp/analytics-requirements.txt -r /tmp/product-requirements.txt

COPY services ./services
COPY data/medshield/processed ./data/medshield/processed
COPY frontend/public/data ./frontend/public/data

EXPOSE 5101 5102
CMD ["python", "-m", "services.analytics_service.app"]
