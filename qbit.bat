@echo off
title qBittorrent manager
echo NodeJS version:
node -v
node install.js
node src\autoDownload\index.js
@pause
