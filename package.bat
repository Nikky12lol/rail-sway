@echo off
echo Packaging Rail-Sway...
powershell -Command "Compress-Archive -Path backend,frontend,docker-compose.yml,README.md,.gitignore -DestinationPath rail-sway.zip -Force"
echo Done! Archive created: rail-sway.zip
