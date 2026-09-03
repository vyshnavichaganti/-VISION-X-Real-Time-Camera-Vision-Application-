# VISION-X — Ubuntu 22.04+ Production Cloud Deployment Manual

## System Architecture

```
Internet (HTTPS 443)
       ↓
Nginx Reverse Proxy + Let's Encrypt SSL Certbot
       ↓
┌──────────────────────────────────────────────┐
│ Docker Compose Stack                         │
│                                              │
│  ├── Frontend Container (Nginx Alpine :80)   │
│  └── Backend Container (FastAPI :8000)       │
│      ├── YOLOv8n                             │
│      ├── ByteTrack                           │
│      ├── FastSAM                             │
│      ├── MiDaS                               │
│      └── Calibrated Distance Estimator       │
└──────────────────────────────────────────────┘
```

---

## 1. Prerequisites on Ubuntu 22.04 LTS Cloud VPS

Run as root or sudo user on your Ubuntu cloud instance:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker Engine & Docker Compose plugin
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin git nginx certbot python3-certbot-nginx

# Enable and start Docker service
sudo systemctl enable --now docker
```

---

## 2. Configure UFW Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Clone Repository & Environment Setup

```bash
# Clone repository onto VPS
git clone https://github.com/vyshnavichaganti/-VISION-X-Real-Time-Camera-Vision-Application.git /opt/vision-x
cd /opt/vision-x

# Configure production environment settings
cp backend/.env.example backend/.env
```

---

## 4. Build and Start Docker Compose Stack

```bash
# Build and start services in background
sudo docker compose up -d --build

# Verify container status
sudo docker compose ps
```

Expected Output:
```
NAME                 STATUS              PORTS
vision-x-backend     Up (healthy)        0.0.0.0:8000->8000/tcp
vision-x-frontend    Up                  0.0.0.0:8080->80/tcp
```

---

## 5. Configure Nginx Reverse Proxy with HTTPS (Let's Encrypt)

> [!IMPORTANT]
> WebRTC browser camera permissions require a **Secure Context (HTTPS)**. Plain HTTP will prevent the camera from starting.

Create Nginx site configuration at `/etc/nginx/sites-available/vision-x`:

```nginx
server {
    server_name vision.yourdomain.com;  # Replace with your actual domain

    client_max_body_size 10M;

    # Frontend Proxy
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health & Readiness Probes
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    location /ready {
        proxy_pass http://127.0.0.1:8000/ready;
    }
}
```

Enable site and issue HTTPS certificate:
```bash
sudo ln -s /etc/nginx/sites-available/vision-x /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue free SSL Certificate with Certbot
sudo certbot --nginx -d vision.yourdomain.com
```

---

## 6. Production Smoke Test Verification

```bash
# Verify Health Endpoint
curl -f https://vision.yourdomain.com/health

# Verify Readiness Endpoint
curl -f https://vision.yourdomain.com/ready
```

Expected Health Output:
```json
{
  "status": "healthy",
  "service": "AI Real-Time Camera Vision API",
  "version": "0.3.0",
  "model_loaded": true,
  "model": "YOLOv8n-COCO",
  "device": "cpu",
  "segmentor_loaded": true,
  "depth_loaded": true,
  "distance_estimator_loaded": true
}
```
