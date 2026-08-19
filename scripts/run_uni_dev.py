# -*- coding: utf-8 -*-
"""用 Python 单进程启动 uni-app H5 dev server,输出写入日志文件。
用法: python run_uni_dev.py [port]
"""
import os
import subprocess
import sys
import time

PROJECT = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\ai-english-miniapp"
NODE = r"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node.exe"
UNI_JS = os.path.join(PROJECT, "node_modules", "@dcloudio", "vite-plugin-uni", "bin", "uni.js")
LOG = os.path.join(PROJECT, "dev_server.log")
PORT = sys.argv[1] if len(sys.argv) > 1 else "5175"

os.chdir(PROJECT)
cmd = [NODE, UNI_JS, "--port", PORT]
with open(LOG, "w", encoding="utf-8", errors="ignore") as f:
    f.write("CMD: %s\n" % " ".join(cmd))
    f.flush()
    proc = subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT)
    print("PID=%d, log=%s" % (proc.pid, LOG), flush=True)
    # 保持进程存活,直到 dev server 退出
    proc.wait()
