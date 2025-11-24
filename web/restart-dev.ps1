# Restart Dev Server Script
# This script stops all Node processes, clears Vite cache, and restarts the dev server

Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting for processes to stop..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Clearing Vite cache..." -ForegroundColor Yellow
Remove-Item -Path ".\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Clearing dist folder..." -ForegroundColor Yellow  
Remove-Item -Path ".\dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nStarting dev server with clean cache..." -ForegroundColor Green
npm run dev

