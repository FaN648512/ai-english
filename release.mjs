// 创建 GitHub Release 并上传发行版软件包
// 用法: node release.mjs  (或直接双击 release.bat)
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import readline from "node:readline/promises";

const REPO = "FaN648512/ai-english";
const TAG = "v1.0.0";
const NAME = "AI 英语卡 v1.0.0";
const ASSETS = [
  "release/ai-english-h5-v1.0.0.zip",
  "release/ai-english-mp-weixin-v1.0.0.zip",
];

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const url = execSync("git remote get-url origin").toString().trim();
    const m = url.match(/https:\/\/([^@]+)@github\.com/);
    if (m && m[1].includes(":")) return m[1].split(":")[1];
  } catch {}
  return null;
}

async function main() {
  let token = getToken();
  if (!token) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    token = (await rl.question("请输入 GitHub Token (ghp_...): ")).trim();
    rl.close();
  }
  if (!token) {
    console.error("未提供 Token，无法创建 Release。");
    process.exit(1);
  }

  const body = readFileSync("RELEASE_NOTES.md", "utf8");
  const auth = { Authorization: `token ${token}`, Accept: "application/vnd.github+json" };

  // 1. 创建 Release
  const createRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ tag_name: TAG, name: NAME, body, draft: false, prerelease: false }),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    console.error("创建 Release 失败:", err.message || JSON.stringify(err));
    process.exit(1);
  }
  const release = await createRes.json();
  console.log("Release 创建成功:", release.html_url);

  // 2. 上传软件包
  for (const asset of ASSETS) {
    const data = readFileSync(asset);
    const name = asset.split("/").pop();
    const upRes = await fetch(
      `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/octet-stream" },
        body: data,
      }
    );
    if (!upRes.ok) {
      const err = await upRes.json();
      console.error(`上传 ${name} 失败:`, err.message || JSON.stringify(err));
    } else {
      console.log(`已上传软件包: ${name}`);
    }
  }
  console.log("发布完成! 访问:", release.html_url);
}

main();
