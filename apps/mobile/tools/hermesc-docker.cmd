@echo off
REM Gradle-friendly entrypoint for hermesc via Docker (see hermesc-docker.js)
node "%~dp0hermesc-docker.js" %*
exit /b %ERRORLEVEL%
