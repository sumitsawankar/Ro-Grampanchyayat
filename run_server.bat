@echo off
echo Installing dependencies (if any are missing)...
npm install

echo.
echo Starting the server...
echo Wait a moment, opening the website in your default browser...

timeout /t 3 /nobreak >nul
start http://localhost:3000

node server.js
pause

