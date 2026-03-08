#!/bin/bash

###############################################
# MediaMTX Setup Script for AI Security Cam
# Optimized for Amazon Linux 2 / Amazon Linux 2023
###############################################

set -e

echo "=========================================="
echo "MediaMTX Media Server Setup (Amazon Linux)"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect Amazon Linux version
detect_amazon_linux() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "amzn" ]]; then
            if [[ "$VERSION_ID" == "2" ]]; then
                echo "al2"
            elif [[ "$VERSION_ID" == "2023" ]]; then
                echo "al2023"
            fi
        fi
    fi
    echo "unknown"
}

AL_VERSION=$(detect_amazon_linux)
echo -e "${YELLOW}Detected: Amazon Linux $AL_VERSION${NC}"

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}Note: Some commands may require sudo${NC}"
    fi
}

# Install Docker on Amazon Linux
install_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker not found. Installing...${NC}"
        
        if [[ "$AL_VERSION" == "al2023" ]]; then
            # Amazon Linux 2023
            sudo dnf install -y docker
        else
            # Amazon Linux 2
            sudo amazon-linux-extras install docker -y
        fi
        
        # Start and enable Docker
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add current user to docker group
        sudo usermod -aG docker $USER
        
        echo -e "${GREEN}Docker installed successfully${NC}"
        echo -e "${YELLOW}Note: You may need to log out and back in for group changes to take effect${NC}"
    else
        echo -e "${GREEN}Docker is already installed${NC}"
        # Ensure Docker is running
        sudo systemctl start docker 2>/dev/null || true
    fi
}

# Install Docker Compose
install_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
        
        # Install Docker Compose plugin
        sudo mkdir -p /usr/local/lib/docker/cli-plugins
        sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
        sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
        
        # Also install standalone version
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        echo -e "${GREEN}Docker Compose installed successfully${NC}"
    else
        echo -e "${GREEN}Docker Compose is already installed${NC}"
    fi
}

# Install ffmpeg on Amazon Linux
install_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        echo -e "${YELLOW}FFmpeg not found. Installing...${NC}"
        
        if [[ "$AL_VERSION" == "al2023" ]]; then
            # Amazon Linux 2023 - ffmpeg available in standard repos
            sudo dnf install -y ffmpeg ffmpeg-free-devel
        else
            # Amazon Linux 2 - need EPEL and RPM Fusion
            echo "Installing EPEL repository..."
            sudo amazon-linux-extras install epel -y
            
            echo "Installing FFmpeg from source or RPM..."
            # Try installing from available repos first
            sudo yum install -y ffmpeg 2>/dev/null || {
                # If not available, install dependencies and build from static binary
                echo "Installing FFmpeg static build..."
                
                # Download static ffmpeg build
                cd /tmp
                curl -LO https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
                tar xf ffmpeg-release-amd64-static.tar.xz
                
                # Find and move binaries
                FFMPEG_DIR=$(ls -d ffmpeg-*-amd64-static 2>/dev/null | head -1)
                if [ -n "$FFMPEG_DIR" ]; then
                    sudo cp $FFMPEG_DIR/ffmpeg /usr/local/bin/
                    sudo cp $FFMPEG_DIR/ffprobe /usr/local/bin/
                    sudo chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe
                fi
                
                # Cleanup
                rm -rf ffmpeg-release-amd64-static.tar.xz $FFMPEG_DIR
                cd -
            }
        fi
        
        echo -e "${GREEN}FFmpeg installed successfully${NC}"
    else
        echo -e "${GREEN}FFmpeg is already installed${NC}"
    fi
}

# Install additional dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing additional dependencies...${NC}"
    
    if [[ "$AL_VERSION" == "al2023" ]]; then
        sudo dnf install -y curl wget jq
    else
        sudo yum install -y curl wget jq
    fi
    
    echo -e "${GREEN}Dependencies installed${NC}"
}

# Configure firewall/security group reminder
configure_firewall() {
    echo ""
    echo "=========================================="
    echo "Firewall Configuration"
    echo "=========================================="
    echo ""
    echo -e "${YELLOW}Make sure the following ports are open in your Security Group:${NC}"
    echo "  - 8888 (HLS streaming)"
    echo "  - 8889 (WebRTC)"
    echo "  - 8554 (RTSP)"
    echo "  - 9997 (API)"
    echo ""
    echo -e "${YELLOW}For EC2, update your Security Group inbound rules.${NC}"
    echo ""
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
    if [ -f mediamtx.yml ]; then
        sed -i "s|source: rtsp://192.168.0.203:554/stream|source: $CAMERA_URL|g" mediamtx.yml
    fi
    
    echo -e "${GREEN}Camera URL configured: $CAMERA_URL${NC}"
}

# Start MediaMTX
start_mediamtx() {
    echo ""
    echo "=========================================="
    echo "Starting MediaMTX..."
    echo "=========================================="
    
    # Use docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null 2>&1; then
        sudo docker compose up -d
    elif command -v docker-compose &> /dev/null; then
        sudo docker-compose up -d
    else
        echo -e "${RED}Docker Compose not available${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}MediaMTX started successfully!${NC}"
}

# Print access URLs
print_urls() {
    # Get local/public IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    # Try to get public IP for EC2
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}MediaMTX is running!${NC}"
    echo "=========================================="
    echo ""
    echo "Access your camera stream at:"
    echo ""
    echo -e "  ${YELLOW}HLS (for browser):${NC}"
    echo "    http://$LOCAL_IP:8888/camera1/index.m3u8"
    if [ -n "$PUBLIC_IP" ]; then
        echo "    http://$PUBLIC_IP:8888/camera1/index.m3u8 (public)"
    fi
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
    if [ -n "$PUBLIC_IP" ]; then
        echo -e "  URL: ${GREEN}http://$PUBLIC_IP:8888/camera1/index.m3u8${NC}"
    else
        echo -e "  URL: ${GREEN}http://$LOCAL_IP:8888/camera1/index.m3u8${NC}"
    fi
    echo -e "  Type: ${GREEN}HLS${NC}"
    echo "=========================================="
}

# Create systemd service for auto-start
create_systemd_service() {
    echo ""
    read -p "Create systemd service for auto-start on boot? [y/N]: " CREATE_SERVICE
    
    if [[ "$CREATE_SERVICE" =~ ^[Yy]$ ]]; then
        SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
        
        sudo tee /etc/systemd/system/mediamtx.service > /dev/null <<EOF
[Unit]
Description=MediaMTX Media Server
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=root

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable mediamtx.service
        
        echo -e "${GREEN}Systemd service created and enabled${NC}"
    fi
}

# Main
main() {
    check_root
    install_dependencies
    install_docker
    install_docker_compose
    install_ffmpeg
    configure_firewall
    configure_camera
    start_mediamtx
    create_systemd_service
    print_urls
}

main "$@"
