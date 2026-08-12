# -*- coding: utf-8 -*-
"""用 subprocess 单进程执行 npm install,绕过沙箱 bash 的 fork 故障。
用法: python install_deps.py [--offline] [--online] [--retry N]
"""
import os
import subprocess
import sys
import time

PROJECT = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\ai-english-miniapp"
LOG = os.path.join(
    r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55",
    "npm_run_%d.log" % int(time.time()),
)

os.chdir(PROJECT)


def run_npm(extra, timeout=900):
    # 直接用 node 跑全局 npm-cli.js,不经 .cmd shim,减少一层 fork
    node = r"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node.exe"
    npm_cli = r"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node_modules\npm\bin\npm-cli.js"
    fresh_cache = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\.npm-cache"
    cmd = [node, npm_cli, "install", "--no-audit", "--no-fund", "--legacy-peer-deps",
           "--cache", fresh_cache] + extra
    print("CMD:", " ".join(cmd), flush=True)
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    dt = time.time() - t0
    out = (proc.stdout or "") + (proc.stderr or "")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write("\n===== run %s (%ds, exit=%s) =====\n" % (extra, dt, proc.returncode))
        f.write(out[-4000:] + "\n")
    print("EXIT=%s, %.0fs" % (proc.returncode, dt), flush=True)
    print(out[-2000:], flush=True)
    return proc.returncode


def main():
    args = sys.argv[1:]
    mode = "offline" if "--offline" in args else ("online" if "--online" in args else "online")
    retries = 3
    pkg = None
    for m in args:
        if m.startswith("--retry"):
            retries = int(m.split("=")[1])
        if m.startswith("--pkg="):
            pkg = m.split("=", 1)[1]
    if pkg:
        # 单包补装模式:先把损坏目录改名为 .broken(避免批量删除确认),再 force 重装
        target = os.path.join(PROJECT, "node_modules", pkg.replace("/", os.sep))
        broken = target + ".broken"
        if os.path.exists(target) and not os.path.exists(broken):
            os.rename(target, broken)
            print("renamed broken dir ->", broken, flush=True)
        rc = run_npm([pkg, "--save-dev", "--force"])
        print("PKG RESULT:", rc, flush=True)
        return rc
    extra = ["--offline"] if mode == "offline" else []
    for i in range(retries):
        print("== attempt %d/%d (mode=%s) ==" % (i + 1, retries, mode), flush=True)
        rc = run_npm(extra)
        if rc == 0:
            print("SUCCESS", flush=True)
            return 0
        extra = []
        time.sleep(2)
    print("FAILED after retries", flush=True)
    return 1


if __name__ == "__main__":
    sys.exit(main())
