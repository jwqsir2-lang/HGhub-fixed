# 功能说明：v1.2.6 首页新增「首页板块」（黄果原创 / 最近上新 / 精选推荐）

## 背景

站点首页（huangguoai.com）有三个内容板块：黄果原创、最近上新、精选推荐，
app 首页此前只有沉浸式推荐流，没有这三个板块。本版补齐：首页左上角加
「首页板块」入口，进入板块总览页（每板块一排横向卡片），点「全部」进
分页网格页，点卡片进播放流（与分类/搜索同一套 push feed 机制）。

## 数据源（2026-11-26 服务端实测）

站点有现成的首页板块接口（此前 app 未用）：

```
GET /api/home/latest?page={p}&size={s}      → 最近上新（发布时间倒序）
GET /api/home/recommends?page={p}&size={s}  → 精选推荐（站方推荐序）
```

两者回包都是 `{data:{items,total,page,size},status:1}`——注意与
`/api/videos` 的 `{items,pagination}` 形状不同，Rust 侧
`normalize_home_page` 归一化为应用统一的 `{items,pagination}` 后再给前端。

**黄果原创没有独立接口**（`/api/home/original`、`/api/videos/original`、
`/api/videos?badge=…` 均实测不存在/无效；站方该板块与 `/original/` 列表页
都是服务端渲染）。原创作品在各列表接口里带 `badge="黄果原创"` 角标字段
（`/api/videos` 的 `is_original` 在首页接口里不下发，只有 badge），故：

- 板块总览：扫 `/api/home/latest` 前 3 页（每页 20 条）按 badge 过滤取 10 条；
- 板块全部页：逐页扫上新列表过滤角标，直到扫完上新列表为止。

两者都是「最新在前」，与站点首页该板块的取向一致；与站方 `/original/`
页的站内排序（偏热度/编辑序）不完全相同，这是无官方接口时的取舍。

## 改动

- `src-tauri/src/api.rs`：新增 `api_home_latest` / `api_home_recommends`
  命令与 `normalize_home_page`；`src-tauri/src/lib.rs` 注册。
- `src/api.ts`：新增 `api.homeLatest` / `api.homeRecommends`；
  `src/types.ts` 的 `VideoCard` 补 `badge?: string`。
- `src/pages/Sections.tsx`（新）：`SectionsPage` 板块总览 +
  `SectionPage` 分页网格（按板块切换数据源，原创走角标过滤游标）。
- `src/store.tsx`：`Page`/`PageInput` 新增 `sections` / `section` 两种页面；
  `src/App.tsx` 的 `StackPage` 接线。
- `src/pages/Home.tsx`：推荐流左上角加「首页板块」入口按钮（仅在流已加载时显示）。
- 版本号 1.2.5 → 1.2.6（package.json、src-tauri/tauri.conf.json）。

## 验证

- 接口均为 2026-11-26 当晚以站点现行域名直连实测（回包结构、分页、
  badge 取值逐项核对），不是按文档猜测。
- 前端 `tsc --noEmit` 通过；Release 构建与真机手感由站长确认。

## v1.2.7 入口改版（2026-11-27）

站长反馈：v1.2.6 的首页悬浮按钮位置不行。改版：

- 删除推荐流左上角的「首页板块」悬浮按钮与板块总览页（SectionsPage 一并移除）；
- 三个板块改为桌面左侧栏的正式菜单项，插在「分类」与「我的」之间：
  首页 / 分类 / **黄果原创 / 最近上新 / 精选推荐** / 我的 / 排行榜 / 设置；
- 点击菜单项直接打开对应板块页（SectionPage 不变），高亮逻辑与
  排行榜/设置同套（栈顶为该板块页时亮起、在该页时重复点击不叠页）。
- 图标：黄果原创=场记板（IClapper）、最近上新=时钟（IClock）、精选推荐=星标（IStar）。
