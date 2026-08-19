@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   AI英语卡 - Git 提交并推送
echo ============================================
echo.

REM 1. 设置本仓库身份(仅作用于本项目)
git config user.name "FaN648512"
git config user.email "FaN648512@users.noreply.github.com"

REM 2. 暂存并提交所有改动
git add -A
git commit -m "feat: UI 前卫风格改版 + 复习/自测/进度/词库二级页面完善"

REM 3. 检查是否已配置远程仓库
git remote get-url origin >nul 2>&1
if errorlevel 1 goto :noremote
goto :push

:noremote
echo.
echo [提示] 尚未配置远程仓库。
echo 请先在 GitHub 网页创建仓库(见说明文档)，然后输入仓库地址。
set /p REPO_URL=请输入 GitHub 仓库地址(如 https://github.com/FaN648512/ai-english.git): 
git remote add origin "%REPO_URL%"

:push
echo.
echo 正在推送到 GitHub...
git push -u origin main

echo.
echo 完成！如果推送失败，请检查 GitHub 登录凭据(Windows 凭据管理器)。
pause
