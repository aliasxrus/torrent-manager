#!/bin/bash
git --version
echo "NodeJS version:"
node -v
node install.js
node src\\autoTransfer\\index.js
echo "Произошла ошибка, нажмите ввод для выхода..."
read
