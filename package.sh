#!/bin/bash
echo "Packaging Rail-Sway..."
zip -r rail-sway.zip . -x "*.git*" "node_modules/*" "__pycache__/*" "*.pyc" ".env" ".env.local" "*.zip"
echo "Done! Archive created: rail-sway.zip"
