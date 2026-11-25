# 修复说明：v1.2.4 站点停用边缘信封接口，业务请求改直连 REST

## 根因（2026-11-25 深夜定位，服务端可复现）

站点已停用边缘信封接口。用 app 的原样请求复现：

```
POST https://huangguoai.com/api/edge/request
→ HTTP 503（Via: CloudFront，X-Cache: Error from cloudfront）
  {"data":[],"status":0,"msg":"接口已停用","req_time":...}
```

app 的全部业务请求都收敛在这个信封上（`net::edge`），信封一死，
首页就是「服务器请求失败（HTTP 503）」——与代理无关：
v1.2.1 走代理时收到的正是这个源站 503（此前误判为代理/网关问题）；
代理关闭后的 10061 与 v1.2.2 的直连超时，则是传输层问题叠加在上面，
把真因盖住了。直连 REST 接口（`/api/videos`、`/api/videos/{id}/episodes/{ep}/playback`
等）一直正常，服务端全链路实测 200。

## 改动（src-tauri/src/net.rs 的 `edge()`）

- 不再构造 base64 信封、不再 POST `/api/edge/request`；
  改为以原 method 直连 `{base}{path}`，body 为原始 JSON。
- 回包同构（`{data,status,msg}`），拆包、重试、重定向、日志逻辑不变；
  全部调用方（Api::get / authed / post_guest 及登录注册）无改动。
- 移除不再使用的 base64 导入。

## 与 v1.2.3 的关系

v1.2.3 的传输双模式（代理/直连自动切换）保留：站点在大陆被屏蔽，
到达站点仍需代理；本修复解决的是到达之后信封已死的问题。两者缺一不可。
