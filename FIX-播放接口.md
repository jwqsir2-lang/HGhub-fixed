# 修复说明：播放器「暂无播放地址 / 视频暂时无法加载」

## 根因

上游站点 2026-11 换了播放协议，客户端还在调旧接口。

| | 接口 | 现状 |
|---|---|---|
| 旧 | `GET /api/videos/{id}/play?ep=N&page_texts=0` | 仍然返回 `status:1`，但 `video_url` / `video_key` / `video_api` **全是空串** → 前端 `if (!info?.video_url) throw new Error("暂无播放地址")` |
| 新 | `POST /api/videos/{id}/episodes/{ep}/playback` | 游客可用，回包 `streams.main` 为签好名的 m3u8，并带 `cdn.authKey/authValue/app` 三个媒体鉴权头 |
| 新（吃瓜帖） | `POST /api/posts/{id}/playback` | 回包 `videos[0].url` |

实测（2026-11-10）：新接口 200 → 清单 200（6855 字节，有效 m3u8）→ 首个分片 200（1,680,544 字节）→ AES key 200（16 字节）。旧接口同一次请求 `video_url=""`。

## 改了哪些文件

- `src-tauri/src/api.rs`
  - `api_play` 改为先调新 playback 接口，把 `streams.main` 归一成 `video_url`（保留 `video_url_hevc`），旧接口留作兜底。
  - 新增 `api_post_play`（吃瓜帖播放地址）。
  - `api_post` 取详情后自动补 `video_url`，前端 `hasVideo` / 帖子页无需改动。
  - `pick_stream()` / `remember_cdn()` 两个小工具。
- `src-tauri/src/net.rs`
  - 新增媒体 CDN 鉴权头登记（`set_media_headers`），媒体请求（m3u8 / ts / key）自动追加 `x-cdn-auth` + `x-cdn-app`；业务同源请求和图片不加。头名做白名单校验，防头注入。
- `src-tauri/src/lib.rs`：注册 `api_post_play`。
- `src/api.ts`：新增 `api.playPost(id)`。
- `src/components/Feed.tsx`：拉播放地址时按 `kind` 分流（短剧 / 吃瓜帖）。

## 为什么不改播放器

播放器（hls.js + `/hls`、`/seg` 本地代理 + AES key 透传）链路完好，问题只在「拿不到地址」。地址一到位，现有播放器直接能播。

## 构建

```bash
pnpm install --frozen-lockfile
pnpm build            # tsc --noEmit + vite build，已验证通过
pnpm tauri build      # 需要 Rust + MSVC（Windows 上 GitHub Actions windows-latest 自带）
```

仓库自带 `.github/workflows/build-windows.yml`：push 到 `main` 或手动 dispatch，产 `HGhub-windows-x64` artifact（HGhub.exe）。
