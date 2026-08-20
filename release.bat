@echo off
rem ============================================
rem  AI English Card - One-click Release Publisher
rem  Pushes code + tag, then creates GitHub Release
rem  and uploads the packaged software zips.
rem ============================================
cd /d "%~dp0"

echo [1/2] Pushing code and tag v1.0.0 to GitHub...
git push origin main --tags
if errorlevel 1 (
  echo.
  echo PUSH FAILED. Check network or git credentials, then run again.
  pause
  exit /b 1
)
echo Push OK.

echo [2/2] Creating GitHub Release and uploading packages...
node release.mjs
if errorlevel 1 (
  echo.
  echo RELEASE FAILED. See error above.
  pause
  exit /b 1
)

echo.
echo All done. Open the release URL shown above.
pause
