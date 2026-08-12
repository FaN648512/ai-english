# -*- coding: utf-8 -*-
"""
修复 node_modules 中被 genie-safe-delete / 杀毒软件干扰而损坏的 npm 包。
症状:包目录存在,但 dist 缺文件(常见 .DELETE. 残留或只有 es 缺 cjs)。
方案:对每个损坏的包,npm pack 下载正确版本 tarball → tarfile 手动解压 → 覆盖。
完全绕开 npm 的 extract 逻辑(它是被干扰的源头)。
"""
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

PROJECT = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\ai-english-miniapp"
NODE = r"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node.exe"
NPM_CLI = r"C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node_modules\npm\bin\npm-cli.js"
CACHE = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\.npm-cache"
TMP = r"C:\Users\Administrator\WorkBuddy\2026-07-30-14-11-55\pkg_tmp"


def find_broken_packages(root):
    """扫描 node_modules,返回损坏包列表 [(路径, 版本), ...]"""
    broken = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".git", "pkg_tmp")]
        # 只处理名为 pluginutils 的包目录(其它包一般没问题,按需扩展)
        base = os.path.basename(dirpath)
        if base == "pluginutils":
            pkg_json = os.path.join(dirpath, "package.json")
            if not os.path.isfile(pkg_json):
                continue
            with open(pkg_json, "r", encoding="utf-8") as f:
                version = json.load(f).get("version", "?")
            ok = os.path.isfile(os.path.join(dirpath, "dist", "cjs", "index.js"))
            if not ok:
                broken.append((dirpath, version))
        # 剪枝:不深入 .bin
        dirnames[:] = [d for d in dirnames if d != ".bin"]
    return broken


def download_tarball(name, version):
    """npm pack 下载 tarball,返回 tgz 路径"""
    os.makedirs(TMP, exist_ok=True)
    spec = f"{name}@{version}" if version != "?" else name
    cmd = [NODE, NPM_CLI, "pack", spec, "--cache", CACHE, "--pack-destination", TMP,
           "--no-audit", "--no-fund"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise SystemExit(f"pack {spec} 失败: {proc.stderr[-500:]}")
    # pack 输出文件名,找最新 tgz
    tgz = None
    t0 = time.time()
    for f in os.listdir(TMP):
        if f.endswith(".tgz"):
            p = os.path.join(TMP, f)
            if tgz is None or os.path.getmtime(p) > t0:
                tgz = p
                t0 = os.path.getmtime(p)
    return tgz


def extract_and_replace(tgz, target_dir):
    """解压 tarball 并替换目标目录"""
    with tarfile.open(tgz, "r:gz") as tf:
        tf.extractall(TMP, filter="data")
    pkg_src = os.path.join(TMP, "package")
    if not os.path.isdir(pkg_src):
        raise SystemExit("tarball 里没有 package 目录")
    # 备份旧目录
    backup = target_dir + ".broken-bak"
    if os.path.exists(backup):
        shutil.rmtree(backup, ignore_errors=True)
    if os.path.exists(target_dir):
        os.rename(target_dir, backup)
    os.makedirs(target_dir, exist_ok=True)
    for item in os.listdir(pkg_src):
        src = os.path.join(pkg_src, item)
        dst = os.path.join(target_dir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)
    # 清理解压出的 package
    shutil.rmtree(pkg_src, ignore_errors=True)
    return backup


def main():
    broken = find_broken_packages(PROJECT)
    if not broken:
        print("没有发现损坏的 pluginutils 包")
        return 0
    print("发现损坏包 %d 个:" % len(broken))
    for path, ver in broken:
        print("  - %s (v%s)" % (path.replace(PROJECT, "."), ver))
    for path, ver in broken:
        name = "@rollup/pluginutils"
        print("修复:", path.replace(PROJECT, "."), "->", ver, flush=True)
        tgz = download_tarball(name, ver)
        extract_and_replace(tgz, path)
        ok = os.path.isfile(os.path.join(path, "dist", "cjs", "index.js"))
        print("  结果:", "OK" if ok else "仍然缺文件!", flush=True)
    print("完成")
    return 0


if __name__ == "__main__":
    sys.exit(main())
