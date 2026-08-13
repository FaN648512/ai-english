# -*- coding: utf-8 -*-
"""
将 scripts/wordlists/*.json 的词条合并进 src/data/words.js。
词表文件结构: { "topicId": "ai-basics", "words": [ {...词条,不含id/topicId} ] }
主题元数据在 TOPICS 中定义,脚本负责:补 id/topicId、去重、更新 topics.wordCount 与 meta。
用法: python scripts/merge_wordlists.py
"""
import json
import os
import re
import sys
import time

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_FILE = os.path.join(PROJECT, "src", "data", "words.js")
WORDLIST_DIR = os.path.join(PROJECT, "scripts", "wordlists")

# 8 个主题(由易到难,与选词方案一致)
TOPICS = [
    {"id": "ai-basics",       "name": "AI 入门基础",  "nameEn": "AI Basics",        "icon": "🗣️",  "order": 1},
    {"id": "prompting",       "name": "与 AI 对话",   "nameEn": "Prompting",        "icon": "💬",  "order": 2},
    {"id": "creation",        "name": "AI 创作与生成", "nameEn": "Creation",         "icon": "🎨",  "order": 3},
    {"id": "content",         "name": "AI 处理内容",  "nameEn": "Content & Docs",   "icon": "📄",  "order": 4},
    {"id": "coding-tools",    "name": "AI 编码与工具", "nameEn": "Coding & Tools",   "icon": "💻",  "order": 5},
    {"id": "advanced",        "name": "AI 进阶概念",  "nameEn": "Advanced Concepts", "icon": "🧠",  "order": 6},
    {"id": "agent-workflow",  "name": "Agent 与工作流", "nameEn": "Agent & Workflow", "icon": "🤖",  "order": 7},
    {"id": "frontier",        "name": "行业与前沿",   "nameEn": "Frontier",          "icon": "🌍",  "order": 8},
]

REQUIRED = ["word", "phonetic", "pos", "originMeaning", "aiMeaning",
            "example", "exampleZh", "memoryTip", "level"]


def log(msg):
    print("[merge]", msg, flush=True)


def load_words_js(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"export\s+default\s*(\{.*\});?\s*$", text, re.S)
    if not m:
        raise SystemExit("words.js 解析失败")
    return json.loads(m.group(1))


def save_words_js(data, path):
    body = json.dumps(data, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 词库数据(由 scripts/ 合并脚本产出,勿手改)\n")
        f.write("export default ")
        f.write(body)
        f.write("\n")


def slugify(word):
    s = word.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def main():
    data = load_words_js(WORDS_FILE)
    # 全新 200 词词库:丢弃旧主题词(旧 25 词中高价值的已在 wordlists 里重写)
    existing = {}
    problems = []

    for topic in TOPICS:
        wl_path = os.path.join(WORDLIST_DIR, topic["id"] + ".json")
        if not os.path.exists(wl_path):
            problems.append("缺少词表文件: " + wl_path)
            continue
        with open(wl_path, "r", encoding="utf-8") as f:
            wl = json.load(f)
        words = wl["words"]
        if len(words) != 25:
            problems.append("主题 %s 词数=%d(应为25)" % (topic["id"], len(words)))

        added = 0
        for w in words:
            miss = [k for k in REQUIRED if w.get(k) in (None, "")]
            if miss:
                problems.append("[%s] %s 缺字段: %s" % (topic["id"], w.get("word"), miss))
                continue
            word_l = str(w["word"]).lower().strip()
            if word_l in existing:
                problems.append("[%s] 重复词: %s" % (topic["id"], word_l))
                continue
            w = {k: w[k] for k in REQUIRED}
            w["level"] = int(w["level"])
            w["id"] = slugify(word_l)
            w["topicId"] = topic["id"]
            existing[word_l] = w
            added += 1
        topic["wordCount"] = added
        log("主题 %s: 新增 %d 词" % (topic["name"], added))

    # 重建 words(按主题顺序排列)
    ordered = []
    for topic in TOPICS:
        ordered.extend(w for w in existing.values() if w.get("topicId") == topic["id"])
    data["words"] = ordered
    data["topics"] = TOPICS
    data["meta"] = {
        "version": "0.2.0",
        "updatedAt": time.strftime("%Y-%m-%d"),
        "note": "200 词词库:8 主题,按使用场景由易到难(老板 2026-08-13 确认的选词方案)。",
    }
    save_words_js(data, WORDS_FILE)

    total = len(data["words"])
    log("写回完成:共 %d 词" % total)
    if problems:
        log("发现 %d 个问题:" % len(problems))
        for p in problems:
            log("  - " + p)
        return 1
    log("全部通过 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
