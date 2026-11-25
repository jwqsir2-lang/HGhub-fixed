# 修复说明：v1.2.2「首页加载失败 503 / tunnel error」——默认改回直连

## 症状（2026-11-25 实测）

- v1.2.1（首个正式发布）首页加载失败：开代理时 HTTP 503，关代理后仍失败。
- 设置 → 网络诊断输出：线路与 DNS 均正常（base=huangguoai.com、解析到真实 IP），
  但 http 一行是 `tunnel error: failed to create underlying connection ← tcp connect
  error ← 由于目标计算机积极拒绝 (os error 10061)`。

## 根因

`net.rs` 的 reqwest 开了 `system-proxy`，会跟随 Windows 系统代理：

1. 代理开着时：全部请求从代理出口走，出口 IP 被站点网关拒绝 → 503。
2. 代理软件退出时：注册表里系统代理开关残留（指向已无人监听的
   127.0.0.1:7897），reqwest 仍往死端口建隧道 → 10061 全灭；
   `heal_client` 的自动重建只是重读同一份注册表，救不回来。

而早期版本（其他构建）一直是直连，代理开着也能正常播放——站点与镜像线路
本身可直连，跟随系统代理对家庭网络用户只有害处。

## 改动

- `src-tauri/src/net.rs` `build_client()`：无 `HGHUB_PROXY` 时加 `.no_proxy()`，
  默认直连、不跟随系统代理；`HGHUB_PROXY` 显式指定时代理照常生效
  （公司内网等受限网络的通道保留）。文件头与相关注释已同步更新。

## 验证

服务端链路已于 2026-11-25 全量实测（直连）：列表 / playback / m3u8 / 分片 /
AES key 全部 200，协议与 v1.2.1 代码一致，本次只改代理行为。
