# 🎥 AI Security Cam

Умная камера видеонаблюдения с искусственным интеллектом на базе MediaMTX.

## 📋 Описание

Проект реализует систему видеонаблюдения с поддержкой ИИ-анализа потокового видео. Медиасервер **MediaMTX** обеспечивает приём, обработку и трансляцию видеопотоков по протоколам RTSP, RTMP и другим.

## 🛠️ Требования

- **ОС:** Ubuntu / Debian (Amazon Linux не поддерживается стандартным скриптом Docker)
- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- Доступ к камере или RTSP-источнику

## 🚀 Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-repo/ai-security-cam.git
cd ai-security-cam
```

### 2. Установка Docker

**Для Ubuntu/Debian:**
```bash
chmod +x install-docker.sh
sudo ./install-docker.sh
```

**Для Amazon Linux (вручную):**
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. Запуск медиасервера MediaMTX

```bash
chmod +x setup.sh && ./setup.sh
```

## ⚙️ Настройка

Отредактируйте файл конфигурации `mediamtx.yml`:

```yaml
paths:
  cam:
    source: rtsp://your-camera-ip:554/stream
    sourceProtocol: tcp
```

## 📡 Поддерживаемые протоколы

| Протокол | Порт | Назначение |
|----------|------|------------|
| RTSP     | 8554 | Получение потока с камеры |
| RTMP     | 1935 | Трансляция видео |
| HLS      | 8888 | Просмотр в браузере |
| WebRTC   | 8889 | Просмотр в реальном времени |

## ❗ Известные проблемы

### `ERROR: Unsupported distribution 'amzn'`

Стандартный скрипт установки Docker не поддерживает **Amazon Linux**.  
**Решение:** используйте ручную установку Docker через `yum` (см. раздел выше).

## 📁 Структура проекта

```
ai-security-cam/
├── install-docker.sh   # Скрипт установки Docker
├── setup.sh            # Скрипт настройки MediaMTX
├── mediamtx.yml        # Конфигурация медиасервера
├── docker-compose.yml  # Docker Compose конфигурация
└── README.md           # Документация
```

## 🤝 Вклад в проект

1. Сделайте форк репозитория
2. Создайте ветку для вашей функции (`git checkout -b feature/new-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add new feature'`)
4. Отправьте в ветку (`git push origin feature/new-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License — подробности в файле [LICENSE](LICENSE).