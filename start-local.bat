@echo off
cd /d "%~dp0"
echo Starting curriculum compare app...
echo.
echo URL: http://localhost:3000
echo Keep this window open while using the web page.
echo.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
npm.cmd start
echo.
echo The server stopped. Press any key to close this window.
pause >nul

