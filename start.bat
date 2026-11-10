@echo off
title As the Spirit Leads - website server
cd /d "%~dp0"
echo Starting As the Spirit Leads website...
echo.
node scripts\start.js
echo.
echo Server stopped. Press any key to close.
pause >nul
