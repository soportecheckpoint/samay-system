@echo off
echo Killing processes on ports used by Scape Room project...

:: Server ports (HTTP and HTTPS)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process %%a on port 3001 (HTTP Server)
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3443') do (
    echo Killing process %%a on port 3443 (HTTPS Server)
    taskkill /F /PID %%a 2>nul
)

:: Vite dev servers (typically use ports 5173-5180)
for /L %%i in (5173,1,5180) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%i') do (
        echo Killing process %%a on port %%i (Vite dev server)
        taskkill /F /PID %%a 2>nul
    )
)

:: Common Node.js processes that might be running
echo Checking for Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM tsx.exe 2>nul

echo.
echo All Scape Room processes killed successfully!
pause