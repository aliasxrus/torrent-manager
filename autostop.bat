@echo off
title autostop
echo NodeJS version:
node -v
node install.js
node src\autoStop\index.js
@pause
