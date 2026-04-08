# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
RUN npm run build
# Output: /build/dist/


# ── Stage 2: Python API + static files ────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /workspace

# System dependencies (needed for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir aiosqlite

# Copy the entire sage project into /workspace/sage/
# This preserves the package structure so 'import sage' resolves correctly
COPY . /workspace/sage/

# Overwrite frontend/dist with the production build from Stage 1
COPY --from=frontend-builder /build/dist /workspace/sage/frontend/dist

# PYTHONPATH=/workspace means Python finds 'sage' at /workspace/sage/__init__.py
ENV PYTHONPATH=/workspace

# Work inside the sage directory so relative paths resolve correctly:
#   token.json       → /workspace/sage/token.json
#   auth/client_secret.json → /workspace/sage/auth/client_secret.json
#   data/            → /workspace/sage/data/
WORKDIR /workspace/sage

EXPOSE 8080

# Cloud Run injects PORT env var; we default to 8080
CMD ["uvicorn", "sage.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
