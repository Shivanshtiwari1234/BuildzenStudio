FROM python:3.12-slim

RUN pip install --no-cache-dir fastapi==0.115.12 uvicorn==0.34.0 \
    && mkdir -p /project/data /tmp \
    && chown -R 10001:10001 /project /tmp

WORKDIR /project
USER 10001:10001
EXPOSE 8000