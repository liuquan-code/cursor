# 小程序登录 / Token 检测 / 退出登录流程（含后端接口与建议）

## 一、问题分析

### 1.1 常见误区

**问题：**

- ❌ 在小程序前端使用 `AppSecret` 或直接请求 `api.weixin.qq.com` 获取 `access_token`
- ❌ 前端保存 `expiresAt` 并以此判断过期（可被篡改，安全性弱）
- ❌ 只验证“token 是否有效”，不验证“token 是否属于当前微信用户”（切号复用风险）
- ❌ `getUserProfile` 不在用户点击回调里调用（会报手势限制）

**结论：**

- token 的签发/过期/吊销必须由 **后端** 判定
- 若要严格防止“同设备切换微信号仍复用 token”，校验时需要引入 **`code`** 做“当前微信用户证明”（可选策略）

---

## 二、总体目标与原则

### 2.1 目标

- **登录**：用户点击 →（可选）获取用户资料 → `Taro.login()` 获取 `code` → 后端签发业务 token → 前端保存 token
- **检测**：前端携带 token 调后端校验（过期/吊销/绑定一致性）→ 返回有效/无效
- **退出**：后端吊销 token（可选但推荐）+ 前端清本地 token

### 2.2 原则

- **敏感信息后端化**：`AppSecret/access_token/session_key` 永远在后端
- **过期后端判定**：前端不存 `expiresAt`（或只作展示，最终以后端为准）
- **身份强绑定**：token 绑定 `openid/unionid/userId`，不要用手机号做唯一主键

---

## 三、前端流程（Taro）

> 约定：前端本地只保存 `auth_token`（不保存过期时间）。

### 3.1 登录流程（login）

**目的：** 获取业务 token 并完成登录。

**流程：**

- **步骤 1（可选）：获取用户资料（必须用户点击触发）**
  - 调用 `Taro.getUserProfile({ desc })`
  - 仅用于获取昵称/头像等资料（不含手机号）
- **步骤 2：获取微信登录 `code`**
  - 调用 `Taro.login()` 获取 `code`
- **步骤 3：请求后端签发 token**
  - 调用后端 `POST /auth/login`，传 `{ code, profile? }`
  - 后端返回 `{ token }`
- **步骤 4：本地保存 token**
  - `Taro.setStorage({ key: 'auth_token', data: token })`

**注意：**

- `getUserProfile` 必须直接由用户点击触发，否则可能报：
  - `getUserProfile:fail can only be invoked by user tap gesture`
  - `getUserProfile:fail getUserAvatarInfo fail`

---

### 3.2 Token 检测流程（tokenDetection）

**目的：** 判断当前 token 是否仍可用。

#### 模式 A：轻校验（不带 `code`，性能更好）

**流程：**

- 读取本地 token
- 调用后端 `POST /auth/verify`（或 `GET /auth/verify`）
  - Header：`Authorization: Bearer <token>`
- 后端返回 `valid: true/false`
- 若无效：前端清理本地 token

**优点：**

- ✅ 少一次 `Taro.login()`，更快

**局限：**

- ⚠️ 只能证明 token 自身有效，无法严格证明“属于当前微信号”（极端 token 被复制/迁移场景）

#### 模式 B：强校验（带 `code`，可防切号复用）

**流程：**

- 读取本地 token
- 调用 `Taro.login()` 获取 `code`
- 调用后端 `POST /auth/verify`
  - Header：`Authorization: Bearer <token>`
  - Body：`{ code }`
- 后端用 `code -> openid/unionid` 与 token 绑定身份比对
  - 一致：`valid=true`
  - 不一致：`valid=false`（要求重新登录）

**优点：**

- ✅ 可严格防“同设备切换微信号仍复用 token”

**代价：**

- ⚠️ 多一次 `Taro.login()` + 后端 `jscode2session` 调用（建议做缓存/限流）

---

### 3.3 退出登录流程（logout）

**目的：** 使 token 失效并清理本地登录态。

**流程：**

- 读取本地 token
-（推荐）调用后端 `POST /auth/logout` 吊销 token
- 前端删除本地 `auth_token`

---

## 四、后端接口清单（Node）

### 4.1 最小必需接口

- **POST `/auth/login`**
  - **入参**：`{ code, profile? }`
  - **出参**：`{ token, userId? }`
- **POST `/auth/verify`**（或 `GET`）
  - **Header**：`Authorization: Bearer <token>`
  - **Body（可选）**：`{ code }`（强校验模式）
  - **出参**：`{ valid: boolean, reason?: string }`
- **POST `/auth/logout`**
  - **Header**：`Authorization: Bearer <token>`
  - **出参**：`{ success: true }`

---

## 五、后端流程建议（关键实现点）

### 5.1 登录（/auth/login）

**推荐流程：**

- 用 `code` 调微信接口 `jscode2session` 获取：`openid/session_key/unionid?`
- 以 `unionid`（优先）或 `openid`（次选）确定用户唯一身份
- 签发业务 token（建议带 `jti`，或随机高熵 token）
- 存储 token 记录：
  - `token(or jti)`、`userId`、`openid/unionid`、`expiresAt`、`revoked`
- 返回 token

**建议：**

- token 存 Redis（TTL）或 DB（字段含过期与吊销）
- 需要“单点登录”则新登录吊销旧 token；允许多端则保留多 token

### 5.2 校验（/auth/verify）

**轻校验：**

- 校验 token 是否存在/签名正确/未过期/未吊销

**强校验（带 code）：**

- `code -> jscode2session -> openid/unionid`
- 比对是否与 token 绑定身份一致
- 不一致则返回 `valid=false`（要求重新登录）

### 5.3 退出（/auth/logout）

- 将 token 标记吊销（`revoked=true`）或从 Redis 删除

---

## 六、手机号能力（单独链路，不能和登录混为一谈）

### 6.1 获取手机号（推荐新链路）

**前端：**

- 使用 `<Button openType="getPhoneNumber" />` 获取 `e.detail.code`
- 将 `code` 发送给后端

**后端：**

- 用 `access_token` 调微信接口：`wxa/business/getuserphonenumber`
- 返回手机号给前端或绑定到用户

**注意：**

- `access_token` 只能后端使用 `appid + secret` 获取并缓存
- 不要在小程序前端存储/请求 `AppSecret`

---

## 七、如何避免“同一手机号不同微信 token 公用”

### 7.1 根因

- 手机号不是可靠唯一身份；同手机号可能对应不同微信号

### 7.2 正确做法

- **账号唯一主键** 使用 `unionid`（优先）或 `openid`
- 手机号仅作为“可绑定信息”，可配置：
  - 允许一手机号绑定多个账号（更贴近现实）
  - 或限制一手机号只绑定一个账号（需要解绑/二次验证流程）

---

## 八、示例：强校验 verify 请求

```typescript
// 前端：tokenDetection（强校验）
const tokenRes = await Taro.getStorage({ key: 'auth_token' })
const loginRes = await Taro.login()

await Taro.request({
  url: 'https://api.example.com/auth/verify',
  method: 'POST',
  header: {
    Authorization: `Bearer ${tokenRes.data}`,
    'content-type': 'application/json',
  },
  data: { code: loginRes.code },
})
```

