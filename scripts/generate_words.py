#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 词库生成流水线:AI 批量生成 → 双 AI 互审 → 结构化校验 → 写回 src/data/words.js

用法:
  # 复制配置
  cp scripts/config.example.json scripts/config.json   # 然后填入 base_url / api_key / model

  # 为指定主题生成 25 个词(主题名需与 words.js 中的 topics 一致)
  python scripts/generate_words.py --topic "模型与架构" --count 25

  # 为所有主题各生成 25 词
  python scripts/generate_words.py --topic all --count 25

  # 只校验现有词库(不调用 AI)
  python scripts/generate_words.py --validate

说明:
  - 兼容任意 OpenAI 兼容的 Chat Completions 接口(base_url + api_key)
  - 生成后会再调一次模型做"审校",修正术语准确性后才写入
  - 写入前做字段完整性、重复、主题归属校验
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# 常量与路径
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_FILE = os.path.join(ROOT, "src", "data", "words.js")
PROMPT_DIR = os.path.join(ROOT, "scripts", "prompts")
CONFIG_FILE = os.path.join(ROOT, "scripts", "config.json")
CONFIG_EXAMPLE = os.path.join(ROOT, "scripts", "config.example.json")

REQUIRED_FIELDS = [
    "word", "phonetic", "pos", "originMeaning",
    "aiMeaning", "example", "exampleZh", "memoryTip", "level",
]

VALID_LEVELS = {1, 2, 3}


# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------
def log(msg):
    print("[pipeline]", msg, flush=True)


def load_words_js(path):
    """解析 words.js 中的 export default {...}; 并返回 dict"""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"export\s+default\s*(\{.*\});?\s*$", text, re.S)
    if not m:
        raise SystemExit("无法从 words.js 中解析出数据对象")
    return json.loads(m.group(1))


def save_words_js(data, path):
    """把 dict 写回 words.js"""
    body = json.dumps(data, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8") as f:
        f.write("// 词库数据(由 scripts/ 生成流水线产出,勿手改)\n")
        f.write("export default ")
        f.write(body)
        f.write("\n")


def slugify(word):
    """单词 → 唯一 id"""
    s = word.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def extract_json(text):
    """从模型回复中提取 JSON(兼容 ```json 代码块)"""
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\[[\s\S]*\]", text)
        if m:
            return json.loads(m.group(0))
    raise ValueError("模型返回的不是合法 JSON: " + text[:200])


def llm_chat(config, messages, temperature=None):
    """调用 OpenAI 兼容的 chat completions 接口"""
    url = config["base_url"].rstrip("/") + "/chat/completions"
    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": temperature if temperature is not None else config.get("temperature", 0.4),
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + config["api_key"],
        },
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            return body["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore")[:300]
            log(f"HTTP {e.code}: {detail} (第 {attempt+1} 次重试)")
            if e.code in (400, 401, 403, 404):
                raise SystemExit(f"接口拒绝(HTTP {e.code}),请检查 base_url / api_key / model: {detail}")
            time.sleep(3)
        except Exception as e:  # noqa: BLE001
            log(f"网络错误: {e} (第 {attempt+1} 次重试)")
            time.sleep(3)
    raise SystemExit("多次重试仍失败,请检查网络与配置")


# ---------------------------------------------------------------------------
# 校验
# ---------------------------------------------------------------------------
def validate_words(words, topic_ids):
    """结构化校验:字段、难度、重复、主题归属。返回 (通过列表, 问题列表)"""
    ok, problems = [], []
    seen_words = set()
    for i, w in enumerate(words):
        errs = []
        for field in REQUIRED_FIELDS:
            if field not in w or w[field] in (None, ""):
                errs.append(f"缺字段 {field}")
        if not errs:
            w = {k: w[k] for k in REQUIRED_FIELDS}
            w["level"] = int(w["level"])
            if w["level"] not in VALID_LEVELS:
                errs.append(f"level 非法: {w['level']}")
        word_l = str(w.get("word", "")).lower().strip()
        if word_l in seen_words:
            errs.append("word 重复")
        if errs:
            problems.append({"index": i, "word": w.get("word", "?"), "errors": errs})
        else:
            seen_words.add(word_l)
            w["id"] = slugify(word_l)
            ok.append(w)
    return ok, problems


# ---------------------------------------------------------------------------
# 生成与审校
# ---------------------------------------------------------------------------
def build_generator_prompt(topic_name, topic_id, count, existing):
    with open(os.path.join(PROMPT_DIR, "generator.txt"), "r", encoding="utf-8") as f:
        tpl = f.read()
    existing_str = "、".join(existing) if existing else "(无,这是该主题的第一批词)"
    return tpl.format(topic_name=topic_name, topic_id=topic_id, count=count, existing=existing_str)


def build_reviewer_prompt(words):
    with open(os.path.join(PROMPT_DIR, "reviewer.txt"), "r", encoding="utf-8") as f:
        tpl = f.read()
    return tpl.format(words=json.dumps(words, ensure_ascii=False, indent=2))


def generate_topic(config, topic, count, existing_words):
    """为一个主题跑完整流水线,返回新词条列表"""
    topic_name, topic_id = topic["name"], topic["id"]
    existing = [w["word"] for w in existing_words if w.get("topicId") == topic_id]

    log(f"主题「{topic_name}」:生成 {count} 词(已有 {len(existing)} 词)")

    # 1) 生成
    gen_msg = [
        {"role": "system", "content": "你是严谨的 AI 术语词库编辑,只输出合法 JSON。"},
        {"role": "user", "content": build_generator_prompt(topic_name, topic_id, count, existing)},
    ]
    raw = llm_chat(config, gen_msg)
    words = extract_json(raw)
    if not isinstance(words, list):
        raise SystemExit("生成结果不是 JSON 数组")

    # 2) 双 AI 互审
    rev_msg = [
        {"role": "system", "content": "你是严谨的 AI 术语审校员,只输出合法 JSON。"},
        {"role": "user", "content": build_reviewer_prompt(words)},
    ]
    log("提交审校…")
    raw2 = llm_chat(config, rev_msg, temperature=0.1)
    reviewed = extract_json(raw2)
    if not isinstance(reviewed, list):
        raise SystemExit("审校结果不是 JSON 数组")

    # 3) 结构化校验
    ok, problems = validate_words(reviewed, {t["id"] for t in [topic]})
    for p in problems:
        log(f"  校验未通过: {p['word']} -> {p['errors']} (已剔除)")
    if ok:
        for w in ok:
            w["topicId"] = topic_id
        log(f"「{topic_name}」通过 {len(ok)} 词,剔除 {len(problems)} 词")
    return ok


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def cmd_generate(args):
    if not os.path.exists(CONFIG_FILE):
        log(f"请先创建配置: cp {CONFIG_EXAMPLE} {CONFIG_FILE} 并填入 api_key")
        return 1
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        config = json.load(f)
    if "sk-" in config.get("api_key", "") or "填入" in config.get("api_key", ""):
        log("config.json 里的 api_key 还是占位符,请先填写真实密钥")
        return 1

    data = load_words_js(WORDS_FILE)
    topics = data["topics"]

    if args.topic == "all":
        targets = topics
    else:
        targets = [t for t in topics if t["name"] == args.topic or t["id"] == args.topic]
        if not targets:
            log(f"找不到主题: {args.topic},可选: {', '.join(t['name'] for t in topics)}")
            return 1

    for topic in targets:
        new_words = generate_topic(config, topic, args.count, data["words"])
        if not new_words:
            log(f"主题「{topic['name']}」没有产出任何有效词条,跳过写入")
            continue
        # 去重合并(全局按 word)
        existing_lower = {w["word"].lower() for w in data["words"]}
        merged = [w for w in new_words if w["word"].lower() not in existing_lower]
        skipped = len(new_words) - len(merged)
        data["words"].extend(merged)
        # 更新主题词数
        topic["wordCount"] = sum(1 for w in data["words"] if w.get("topicId") == topic["id"])
        data["meta"]["version"] = "0.2.0"
        data["meta"]["updatedAt"] = time.strftime("%Y-%m-%d")
        if skipped:
            log(f"跳过 {skipped} 个全局重复词")
        log(f"主题「{topic['name']}」现共 {topic['wordCount']} 词")

    save_words_js(data, WORDS_FILE)
    log(f"已写回 {WORDS_FILE},共 {len(data['words'])} 词")
    return 0


def cmd_validate(args):
    data = load_words_js(WORDS_FILE)
    topic_ids = {t["id"] for t in data["topics"]}
    ok, problems = validate_words(data["words"], topic_ids)
    log(f"共 {len(data['words'])} 词:通过 {len(ok)} 条,问题 {len(problems)} 条")
    for p in problems:
        log(f"  [{p['index']}] {p['word']} -> {p['errors']}")
    return 0 if not problems else 1


def main():
    parser = argparse.ArgumentParser(description="AI 词库生成流水线")
    sub = parser.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="生成词条")
    g.add_argument("--topic", required=True, help="主题名/ID,或 all")
    g.add_argument("--count", type=int, default=25, help="每主题生成数量")

    v = sub.add_parser("validate", help="校验现有词库")
    v.add_argument("--quiet", action="store_true", help="仅输出错误")

    args = parser.parse_args()
    if args.cmd == "generate":
        sys.exit(cmd_generate(args))
    else:
        sys.exit(cmd_validate(args))


if __name__ == "__main__":
    main()
