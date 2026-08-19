@echo off
cd /d "%~dp0"
echo ============================================
echo   AI English Cards - Git Push
echo ============================================
echo.

git config user.name "FaN648512"
git config user.email "FaN648512@users.noreply.github.com"

git add -A
git commit -m "feat: UI restyle + review/quiz/progress/library pages"

git remote get-url origin >nul 2>&1
if errorlevel 1 goto :noremote
goto :push

:noremote
echo.
echo [WARN] No remote configured yet.
echo Create the repo on GitHub first, then enter the URL below.
set /p REPO_URL=Enter GitHub repo URL (e.g. https://github.com/FaN648512/ai-english.git): 
git remote add origin "%REPO_URL%"

:push
echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo Done! If push failed, check your GitHub credentials.
pause
