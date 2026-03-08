#!/bin/bash

###############################################
# MediaMTX Setup Script for AI Security Cam
###############################################

set -e

echo "=========================================="
echo "MediaMTX Media Server Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}Note: Some commands may require sudo${NC}"
    fi
}

# Install Docker if not present
install_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker not found. Installing...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${GREEN}Docker installed successfully${NC}"
    else
        echo -e "${GREEN}Docker is already installed${NC}"
    fi
}

# Install Docker Compose if not present
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}Docker Compose installed successfully${NC}"
    else
        echo -e "${GREEN}Docker Compose is already installed${NC}"
    fi
}

# Install ffmpeg
install_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        echo -e "${YELLOW}FFmpeg not found. Installing...${NC}"
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y ffmpeg
        elif command -v yum &> /dev/null; then
            sudo yum install -y ffmpeg
        elif command -v brew &> /dev/null; then
            brew install ffmpeg
        else
            echo -e "${RED}Please install ffmpeg manually${NC}"
            exit 1
        fi
        echo -e "${GREEN}FFmpeg installed successfully${NC}"
    else
        echo -e "${GREEN}FFmpeg is already installed${NC}"
    fi
}

# Configure camera URL
configure_camera() {
    echo ""
    echo "=========================================="
    echo "Camera Configuration"
    echo "=========================================="
    
    read -p "Enter your camera RTSP URL [rtsp://192.168.0.203:554/stream]: " CAMERA_URL
    CAMERA_URL=${CAMERA_URL:-rtsp://192.168.0.203:554/stream}
    
    # Update mediamtx.yml with the camera URL
    sed -i "s|source: rtsp://192.168.0.203:554/stream|source: $CAMERA_URL|g" mediamtx.yml
    
    echo -e "${GREEN}Camera URL configured: $CAMERA_URL${NC}"
}

# Start MediaMTX
start_mediamtx() {
    echo ""
    echo "=========================================="
    echo "Starting MediaMTX..."
    echo "=========================================="
    
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    echo -e "${GREEN}MediaMTX started successfully!${NC}"
}

# Print access URLs
print_urls() {
    # Get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}MediaMTX is running!${NC}"
    echo "=========================================="
    echo ""
    echo "Access your camera stream at:"
    echo ""
    echo -e "  ${YELLOW}HLS (for browser):${NC}"
    echo "    http://$LOCAL_IP:8888/camera1/index.m3u8"
    echo ""
    echo -e "  ${YELLOW}WebRTC (low latency):${NC}"
    echo "    http://$LOCAL_IP:8889/camera1"
    echo ""
    echo -e "  ${YELLOW}RTSP (for VLC/other apps):${NC}"
    echo "    rtsp://$LOCAL_IP:8554/camera1"
    echo ""
    echo -e "  ${YELLOW}API (status/control):${NC}"
    echo "    http://$LOCAL_IP:9997/v3/paths/list"
    echo ""
    echo "=========================================="
    echo "In your AI Cam app settings, use:"
    echo -e "  URL: ${GREEN}http://$LOCAL_IP:8888/camera1/index.m3u8${NC}"
    echo -e "  Type: ${GREEN}HLS${NC}"
    echo "=========================================="
}

# Main
main() {
    check_root
    install_docker
    install_docker_compose
    install_ffmpeg
    configure_camera
    start_mediamtx
    print_urls
}

main "$@"
