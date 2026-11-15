# 舊圖

晴耕谷原本用 AI 生成的手繪風美術；2026-11 起整個遊戲改成 LPC（Liberated Pixel Cup）像素風，換掉的舊圖全部收在這裡，遊戲不再載入。

- `圖集/`：遊戲以前載入的圖集（b1、b5 是手繪紙娃娃的零件；b2 地面物件、樹、作物、工具；b3 動物、加工機、礦坑、怪物、料理、魚；b4 建築、居民頭像；b6 夏秋冬作物、果樹）。
- `第0批`～`第6批`：生圖原稿和說明（`*.thumb.png` 縮圖進 git；原圖很大，不進 git，只在本機）。
- `紙娃娃/`：手繪紙娃娃的程式和資料（`doll.js`、`parts.json`、對位結果 `fit.json`、自動對位工具 `fit-doll.mjs`、手動對位工具 `doll-align.html`）。
- `工具/farm-assets/`：以前把生圖切成圖集的素材工具（`build.mjs`、`sheets.json`）。它讀的是 `art-src/farm/第N批/`，搬到這裡後不會再跑。

現在的美術：角色 `tools/lpc/build-characters.mjs`（LPC 角色產生器），其他全部 `tools/lpc/build-world.mjs`（OpenGameArt 的 LPC 素材包，對照表在 `tools/lpc/world/`）。生圖的清單和紀錄（`art-src/farm/待生成/`、`生圖紀錄.jsonl`）是舊流程的文件，先留在原位。
