# AI破界实验室

面向初中生的本地互动 AI 科普竞赛演示版。学习主线为：体验 AI → 驯练 AI → 识破 AI → 创造 AI。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>。核心实验不依赖账号、外部服务或付费 AI 接口，学习证据仅保存在浏览器 `localStorage` 中。

## 工程验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

主要路由：`/emotion`、`/recommender`、`/detective`、`/agent`、`/results`、`/demo`。
