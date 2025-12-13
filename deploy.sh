#!/bin/bash

echo "Checking Git status..."
git status

echo "Adding all files..."
git add .

echo "Committing changes..."
git commit -m "Deploy project"

echo "Pushing to origin..."
git push origin main

echo "Done!"