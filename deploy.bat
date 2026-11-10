@echo off
title Deploy As the Spirit Leads to Vercel
cd /d "%~dp0"
echo Deploying the latest version of the site to Vercel...
echo.
set /p VERCEL_TOKEN=<.vercel-token
call npx.cmd --yes vercel@latest deploy --prod --yes --token=%VERCEL_TOKEN%
echo.
echo Done. Your live link is shown above.
pause
