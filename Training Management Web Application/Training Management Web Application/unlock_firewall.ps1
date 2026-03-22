New-NetFirewallRule -DisplayName "Allow NodeJS Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
Write-Host "Firewall rule added for Port 3000. Try connecting from mobile now." -ForegroundColor Green
Pause
