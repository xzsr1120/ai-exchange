# AI 破界实验室界面优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变实验算法、状态结构和完成条件的前提下，把全站改造成“深色未来大厅 + 明亮实验卡片”，并加入初中生能立即理解的“小助手 + 就地提示”。

**Architecture:** 保留现有 Next.js 路由、`LearningProvider` 和 `lib` 业务逻辑；新增一个无状态实验引导组件和一个后加载的视觉覆盖样式文件。页面只增加引导内容与语义类名，所有实验事件处理、计算函数和本地存储调用保持原样。

**Tech Stack:** Next.js 15、React 19、TypeScript、CSS、Recharts、Vitest、React DOM Server、Codex Browser。

---

## Execution preflight

- 使用 `build-web-apps:frontend-app-builder` 和 `imagegen`，依据已确认的设计说明生成三张最终参考：桌面首页、桌面实验页、手机实验页。
- 从参考图提取颜色、圆角、阴影、间距、按钮和卡片层级；除非出现技术阻碍，不再改变已确认的信息结构。
- 浏览器验证必须使用 `browser:control-in-app-browser` 和 `build-web-apps:frontend-testing-debugging`；React 修改完成后应用 `build-web-apps:react-best-practices`。
- 不新增 UI 框架、图标包或外部字体依赖。

## File map

- Create: `components/lab-guide.tsx` — 无状态的小智引导卡，统一显示“你现在要做、你要观察、完成标志、接下来”。
- Create: `components/lab-guide.test.tsx` — 使用 `renderToStaticMarkup` 验证引导结构和无障碍标签。
- Create: `components/ui.test.tsx` — 验证步骤轨道只给当前步骤设置 `aria-current="step"`。
- Create: `app/redesign.css` — 新设计令牌、全站外壳、首页、实验页、成果页、演示页和响应式覆盖规则。
- Modify: `app/layout.tsx` — 在旧样式之后加载 `redesign.css`。
- Modify: `components/ui.tsx` — 增强 `StepRail` 的当前状态语义。
- Modify: `components/shell.tsx` — 优化品牌、顶部入口、学习进度和导航文案，不改变路由。
- Modify: `app/page.tsx` — 重组首页欢迎区、四关卡片、小智助手和实验四步法。
- Modify: `app/emotion/page.tsx` — 插入蓝色实验引导，不改训练与测试逻辑。
- Modify: `app/recommender/page.tsx` — 插入紫色实验引导，不改推荐权重逻辑。
- Modify: `app/detective/page.tsx` — 插入橙色实验引导，不改三证核验逻辑。
- Modify: `app/agent/page.tsx` — 插入绿色实验引导，不改智能体完成条件。
- Modify: `app/results/page.tsx` — 优化成果解释和空状态视觉，不改能力计算。
- Modify: `app/demo/page.tsx` — 优化演示页层级和响应式布局，不改五幕交互。

### Task 1: Add tested learning-guide primitives

**Files:**
- Create: `components/lab-guide.test.tsx`
- Create: `components/ui.test.tsx`
- Create: `components/lab-guide.tsx`
- Modify: `components/ui.tsx`

- [ ] **Step 1: Write the failing guide component test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LabGuide } from "./lab-guide";

describe("LabGuide", () => {
  it("renders the four student-facing guide prompts", () => {
    const html = renderToStaticMarkup(
      <LabGuide
        tone="blue"
        action="先写下你的猜测"
        observe="比较前后两次准确率"
        complete="得到两次测试结果"
        next="建立第一组训练样本"
      />,
    );

    expect(html).toContain('aria-label="本关实验引导"');
    expect(html).toContain("你现在要做");
    expect(html).toContain("你要观察");
    expect(html).toContain("完成标志");
    expect(html).toContain("接下来");
    expect(html).toContain("guide-blue");
  });
});
```

- [ ] **Step 2: Run the guide test and verify it fails**

Run: `pnpm vitest run components/lab-guide.test.tsx`

Expected: FAIL because `./lab-guide` does not exist.

- [ ] **Step 3: Implement the guide component**

```tsx
type LabGuideProps = {
  tone: "blue" | "violet" | "amber" | "green";
  action: string;
  observe: string;
  complete: string;
  next: string;
};

const guideItems = [
  { key: "action", label: "你现在要做", icon: "做" },
  { key: "observe", label: "你要观察", icon: "看" },
  { key: "complete", label: "完成标志", icon: "懂" },
  { key: "next", label: "接下来", icon: "走" },
] as const;

export function LabGuide(props: LabGuideProps) {
  return (
    <aside className={`lab-guide guide-${props.tone}`} aria-label="本关实验引导">
      <div className="guide-avatar" aria-hidden="true"><span>AI</span><i /></div>
      <div className="guide-intro"><small>小智来带路</small><b>一次只做一步，答错也没关系。</b></div>
      <div className="guide-items">
        {guideItems.map((item) => (
          <div className={`guide-item guide-item-${item.key}`} key={item.key}>
            <span aria-hidden="true">{item.icon}</span>
            <p><b>{item.label}</b><small>{props[item.key]}</small></p>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Write the failing StepRail semantics test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StepRail } from "./ui";

describe("StepRail", () => {
  it("marks only the current step with aria-current", () => {
    const html = renderToStaticMarkup(<StepRail steps={["预测", "实验", "解释"]} current={1} />);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('class="done current"');
  });
});
```

- [ ] **Step 5: Run the StepRail test and verify it fails**

Run: `pnpm vitest run components/ui.test.tsx`

Expected: FAIL because the current list item has no `aria-current` and no `current` class.

- [ ] **Step 6: Implement current and completed StepRail states**

Replace the list item in `components/ui.tsx` with:

```tsx
<li
  key={step}
  className={[index < current ? "done" : "", index === current ? "done current" : ""].filter(Boolean).join(" ")}
  aria-current={index === current ? "step" : undefined}
>
  <span>{index + 1}</span>{step}
</li>
```

- [ ] **Step 7: Run both component tests**

Run: `pnpm vitest run components/lab-guide.test.tsx components/ui.test.tsx`

Expected: 2 test files pass with 2 tests.

- [ ] **Step 8: Commit the guidance primitives**

```powershell
git add -- components/lab-guide.tsx components/lab-guide.test.tsx components/ui.tsx components/ui.test.tsx
git commit -m "feat: add student lab guidance primitives"
```

### Task 2: Establish the visual system and responsive shell

**Files:**
- Create: `app/redesign.css`
- Modify: `app/layout.tsx`
- Modify: `components/shell.tsx`

- [ ] **Step 1: Load the redesign stylesheet after existing styles**

`app/layout.tsx` imports must be:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import { LearningProvider } from "@/components/learning-provider";
import { Shell } from "@/components/shell";
```

- [ ] **Step 2: Add the exact design-token foundation**

Create `app/redesign.css` with this foundation before page-specific rules:

```css
:root {
  --space-bg: #061329;
  --space-bg-2: #091c3a;
  --space-panel: rgba(9, 29, 61, 0.92);
  --paper: #f7fbff;
  --paper-blue: #edf6ff;
  --ink: #17345f;
  --ink-soft: #687b98;
  --nav-line: rgba(111, 177, 255, 0.2);
  --blue: #367ff0;
  --violet: #7957df;
  --amber: #d88a19;
  --green: #159c83;
  --cyan: #62ddff;
  --card-radius: 20px;
  --soft-shadow: 0 18px 45px rgba(13, 43, 88, 0.12);
  --space-shadow: 0 24px 70px rgba(0, 9, 32, 0.36);
}

html { color-scheme: light dark; overflow-x: clip; }
body {
  min-width: 320px;
  overflow-x: clip;
  background:
    radial-gradient(circle at 72% 0%, rgba(45, 113, 220, 0.24), transparent 34rem),
    linear-gradient(rgba(105, 174, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(105, 174, 255, 0.035) 1px, transparent 1px),
    var(--space-bg);
  color: #eef7ff;
}

.topbar {
  height: 70px;
  border-bottom-color: var(--nav-line);
  background: rgba(5, 17, 38, 0.9);
  box-shadow: 0 10px 35px rgba(0, 7, 24, 0.2);
}

.sidebar {
  top: 70px;
  width: 232px;
  border-right-color: var(--nav-line);
  background: rgba(5, 17, 38, 0.88);
}

.main-content {
  margin-left: 232px;
  padding: 98px clamp(18px, 3vw, 48px) 64px;
}

.panel {
  border-color: #cfdef1;
  background: linear-gradient(145deg, #ffffff, #f4f9ff);
  color: var(--ink);
  box-shadow: var(--soft-shadow);
}

.panel .muted,
.panel .panel-title p,
.panel .small { color: var(--ink-soft); }

.button-primary {
  border-color: rgba(77, 137, 255, 0.55);
  background: linear-gradient(135deg, #3189ff, #7657ee);
  box-shadow: 0 10px 26px rgba(63, 111, 224, 0.24);
}

@media (max-width: 860px) {
  .topbar { height: 64px; }
  .sidebar { top: 64px; }
  .main-content { margin-left: 0; padding: 84px 16px calc(88px + env(safe-area-inset-bottom)); }
  .mobile-nav { height: calc(64px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); }
}
```

- [ ] **Step 3: Refine the shell markup without changing routes**

In `components/shell.tsx`, keep the `navigation` array and completion calculation, but change the header content to:

```tsx
<header className="topbar">
  <Link href="/" className="brand" aria-label="AI破界实验室首页">
    <span className="brand-mark">AI</span>
    <span><b>AI破界实验室</b><small>未来 AI 探索基地</small></span>
  </Link>
  <nav className="topbar-nav" aria-label="快捷导航">
    <Link className={pathname === "/" ? "active" : ""} href="/">首页</Link>
    <Link className={pathname === "/results" ? "active" : ""} href="/results">学习地图</Link>
    <Link className={pathname === "/demo" ? "active" : ""} href="/demo">竞赛演示</Link>
  </nav>
  <div className="topbar-actions">
    <Link className="progress-chip" href="/results" aria-label={`学习进度 ${completed}/4`}>
      <i style={{ width: `${completed * 25}%` }} />学习进度 {completed}/4
    </Link>
    <Link href="/demo" className="demo-link">▶ 竞赛演示</Link>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航">☰</button>
  </div>
</header>
```

- [ ] **Step 4: Add shell-specific styles**

Append to `app/redesign.css`:

```css
.brand-mark {
  border-color: rgba(98, 221, 255, 0.55);
  background: linear-gradient(145deg, rgba(49, 126, 220, 0.28), rgba(31, 92, 167, 0.08));
  color: var(--cyan);
  box-shadow: inset 0 0 20px rgba(98, 221, 255, 0.1), 0 0 24px rgba(43, 122, 226, 0.12);
}
.topbar-nav { display: flex; align-items: center; gap: 6px; }
.topbar-nav a { padding: 7px 12px; border-radius: 999px; color: #8fa6c3; font-size: 13px; }
.topbar-nav a:hover,
.topbar-nav a.active { color: white; background: rgba(64, 134, 235, 0.14); }
.sidebar nav a { min-height: 50px; border: 1px solid transparent; }
.sidebar nav a.active { border-color: rgba(84, 161, 255, 0.24); background: linear-gradient(90deg, rgba(41, 103, 202, 0.32), rgba(41, 103, 202, 0.06)); }
.privacy-note { margin-top: 20px; }
@media (max-width: 1020px) { .topbar-nav { display: none; } }
```

- [ ] **Step 5: Run structural verification**

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm lint`

Expected: exit code 0 with no errors.

- [ ] **Step 6: Commit the shell and theme foundation**

```powershell
git add -- app/layout.tsx app/redesign.css components/shell.tsx
git commit -m "feat: add futuristic responsive app shell"
```

### Task 3: Rebuild the homepage as an inviting mission hub

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/redesign.css`

- [ ] **Step 1: Replace the homepage return structure**

Keep the existing `labs`, `done`, routes and completion logic. Replace only the returned JSX with:

```tsx
return (
  <div className="page-shell home-page">
    <section className="home-stage">
      <div className="home-hero">
        <div className="hero-copy">
          <span className="hero-kicker">WELCOME, AI EXPLORER</span>
          <h1>看见算法，<br /><em>创造有边界的 AI</em></h1>
          <p>小智会陪你完成四个挑战。你会改变数据、观察推荐、核验证据，最后设计一个负责任的校园 AI。</p>
          <div className="button-group hero-actions">
            <Link className="button button-primary" href="/emotion">从第一关开始 <span>→</span></Link>
            <Link className="button hero-help" href="#how-to-experiment">看看怎么实验</Link>
          </div>
          <div className="hero-facts">
            <span><b>4</b><small>探索关卡</small></span>
            <span><b>{done.filter(Boolean).length}</b><small>已经完成</small></span>
            <span><b>0</b><small>外部 AI 接口</small></span>
          </div>
        </div>
        <div className="hero-bot" aria-hidden="true">
          <div className="hero-bot-orbit orbit-one" />
          <div className="hero-bot-orbit orbit-two" />
          <div className="hero-bot-face"><span>AI</span><i /></div>
          <small>小智已就位</small>
        </div>
      </div>

      <aside className="home-guide-card" aria-label="小智助手">
        <div className="home-guide-avatar" aria-hidden="true">AI</div>
        <div><small>同学你好，我是小智</small><b>每一关，我都会告诉你下一步。</b></div>
        <Link href="/emotion">开始探索 →</Link>
      </aside>
    </section>

    <section className="map-section">
      <div className="section-heading">
        <div><p className="eyebrow">MISSION MAP / 关卡地图</p><h2>今天先破解哪一关？</h2><p>每一关都会留下一个可以展示的学习成果。</p></div>
        <Link href="/results">查看我的能力图谱 →</Link>
      </div>
      <div className="lab-grid">
        {labs.map((lab, index) => (
          <Link key={lab.href} href={lab.href} className={`lab-card lab-${lab.color}`}>
            <div className="lab-card-top"><span>{lab.number}</span>{done[index] ? <i className="complete">✓ 已形成成果</i> : <i>等待探索</i>}</div>
            <div className="lab-icon">{lab.icon}</div>
            <p>{lab.stage}</p><h3>{lab.title}</h3><div className="lab-description">{lab.description}</div>
            <footer><span>你会得到 · {lab.output}</span><b>进入实验 →</b></footer>
          </Link>
        ))}
      </div>
    </section>

    <section className="principle-section" id="how-to-experiment">
      <div><p className="eyebrow">HOW TO EXPERIMENT / 怎么实验</p><h2>记住四步，就能像小科学家一样探索 AI</h2></div>
      <div className="principle-bar">
        <div><span>01</span><p><b>先预测</b><small>把第一感觉写下来</small></p></div>
        <i>→</i><div><span>02</span><p><b>改变量</b><small>一次只改变一个条件</small></p></div>
        <i>→</i><div><span>03</span><p><b>找证据</b><small>比较前后发生了什么</small></p></div>
        <i>→</i><div><span>04</span><p><b>说发现</b><small>用自己的话解释结果</small></p></div>
      </div>
    </section>
  </div>
);
```

- [ ] **Step 2: Add homepage styles matching the approved concept**

Append exact class families to `app/redesign.css`:

```css
.home-stage { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 18px; align-items: stretch; }
.home-hero { min-height: 470px; position: relative; overflow: hidden; display: grid; grid-template-columns: 1.05fr 0.95fr; align-items: center; padding: clamp(28px, 5vw, 64px); border: 1px solid rgba(93, 164, 255, 0.34); border-radius: 30px; background: radial-gradient(circle at 78% 36%, rgba(48, 119, 221, 0.42), transparent 18rem), linear-gradient(135deg, #102f61, #071934 72%); box-shadow: var(--space-shadow); }
.home-hero::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(105, 177, 255, 0.055) 1px, transparent 1px), linear-gradient(rgba(105, 177, 255, 0.045) 1px, transparent 1px); background-size: 34px 34px; mask-image: linear-gradient(90deg, transparent 18%, black); }
.home-hero .hero-copy { position: relative; z-index: 2; }
.home-hero .hero-copy h1 { max-width: 690px; margin: 12px 0 18px; font-size: clamp(46px, 5.4vw, 76px); line-height: 1.02; letter-spacing: -0.055em; }
.home-hero .hero-copy h1 em { color: #69cdff; font-style: normal; }
.home-hero .hero-copy > p { max-width: 650px; color: #b8cbe3; }
.hero-help { border-color: rgba(117, 176, 245, 0.3); background: rgba(72, 129, 203, 0.1); }
.hero-bot { position: relative; z-index: 2; display: grid; place-items: center; min-height: 310px; }
.hero-bot-face { position: relative; z-index: 2; display: grid; place-items: center; width: 132px; height: 108px; border: 5px solid #7be7ff; border-radius: 46% 46% 42% 42%; background: #041126; box-shadow: 0 0 50px rgba(70, 194, 255, 0.38), inset 0 0 28px rgba(60, 158, 255, 0.18); }
.hero-bot-face span { color: #6be5ff; font-size: 38px; font-weight: 900; }
.hero-bot-face i { position: absolute; bottom: 20px; width: 32px; height: 4px; border-radius: 99px; background: #6be5ff; }
.hero-bot-orbit { position: absolute; border: 1px solid rgba(103, 193, 255, 0.25); border-radius: 50%; }
.orbit-one { width: 240px; height: 240px; }
.orbit-two { width: 330px; height: 330px; }
.hero-bot small { margin-top: 148px; color: #79dcff; }
.home-guide-card { display: grid; align-content: start; gap: 14px; padding: 22px; border: 1px solid rgba(91, 159, 246, 0.3); border-radius: 24px; background: linear-gradient(155deg, rgba(22, 58, 108, 0.92), rgba(8, 28, 59, 0.94)); box-shadow: var(--space-shadow); }
.home-guide-avatar { display: grid; place-items: center; width: 66px; height: 66px; border: 3px solid #72e4ff; border-radius: 50%; color: #6ee5ff; background: #071a39; font-weight: 900; }
.home-guide-card small,
.home-guide-card b { display: block; }
.home-guide-card small { color: #7fdcff; }
.home-guide-card b { margin-top: 5px; font-size: 18px; }
.home-guide-card a { margin-top: auto; color: #88e7ff; font-weight: 800; }
.map-section { margin-top: 28px; padding: clamp(20px, 3vw, 34px); border-radius: 28px; background: linear-gradient(145deg, #eef6ff, #f9fcff); color: var(--ink); box-shadow: var(--soft-shadow); }
.section-heading > div > p:last-child { margin: 6px 0 0; color: var(--ink-soft); }
.lab-grid { gap: 16px; }
.lab-card { min-height: 310px; border-color: #d1def0; background: #fff; color: var(--ink); box-shadow: 0 16px 34px rgba(51, 84, 133, 0.09); }
.lab-card:hover { transform: translateY(-5px); box-shadow: 0 22px 42px rgba(51, 84, 133, 0.15); }
.lab-card footer { border-top-color: #e1eaf5; }
.principle-section { margin-top: 22px; padding: clamp(20px, 3vw, 34px); border: 1px solid #cbdcf0; border-radius: 26px; background: #f6fbff; color: var(--ink); box-shadow: var(--soft-shadow); }
.principle-section h2 { margin: 4px 0 18px; }
@media (max-width: 1120px) { .home-stage { grid-template-columns: 1fr; } .home-guide-card { grid-template-columns: auto 1fr auto; align-items: center; } }
@media (max-width: 760px) { .home-hero { min-height: 0; grid-template-columns: 1fr; padding: 28px 22px; } .hero-bot { display: none; } .home-guide-card { grid-template-columns: auto 1fr; } .home-guide-card a { grid-column: 1 / -1; } .home-hero .hero-copy h1 { font-size: 42px; } }
```

- [ ] **Step 3: Run homepage build checks**

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: Next.js build completes and lists `/` as a generated route.

- [ ] **Step 4: Browser-check the homepage**

The flow under test is: `/` loads → “看看怎么实验” scrolls to the four-step explanation → “从第一关开始” navigates to `/emotion`.

Check at 1280×720 and 390×844:

- hero copy and primary button are visible in the first viewport;
- four cards do not overflow horizontally;
- mobile bottom navigation does not cover the final four-step card;
- no console error or framework overlay appears.

- [ ] **Step 5: Commit the homepage redesign**

```powershell
git add -- app/page.tsx app/redesign.css
git commit -m "feat: redesign the AI mission homepage"
```

### Task 4: Add student guidance to emotion and recommendation labs

**Files:**
- Modify: `app/emotion/page.tsx`
- Modify: `app/recommender/page.tsx`
- Modify: `app/redesign.css`

- [ ] **Step 1: Add the emotion guide after StepRail**

Add `import { LabGuide } from "@/components/lab-guide";` and render:

```tsx
<LabGuide
  tone="blue"
  action="先写下你对模型的判断，再只改变一种训练条件。"
  observe="比较准确率、平均置信度和容易混淆的位置。"
  complete="得到前后两次结果，并能说出它们为什么不同。"
  next="完成解释后，生成你的模型测试报告。"
/>
```

- [ ] **Step 2: Add the recommendation guide after StepRail**

Add `import { LabGuide } from "@/components/lab-guide";` and render:

```tsx
<LabGuide
  tone="violet"
  action="先连续做几次点赞、停留或跳过，再主动探索低比例内容。"
  observe="看兴趣权重、推荐比例和信息泡泡怎样变化。"
  complete="完成至少五次操作，并比较探索前后的多样性。"
  next="把操作记录和变化原因整理成兴趣变化对照。"
/>
```

- [ ] **Step 3: Style LabGuide and convert experiment surfaces to light cards**

Append to `app/redesign.css`:

```css
.lab-guide { --guide: var(--blue); display: grid; grid-template-columns: auto minmax(160px, 0.72fr) minmax(0, 2fr); gap: 14px; align-items: center; margin: 0 0 22px; padding: 16px 18px; border: 1px solid color-mix(in srgb, var(--guide) 32%, white); border-radius: 20px; background: linear-gradient(145deg, color-mix(in srgb, var(--guide) 10%, white), #fff); color: var(--ink); box-shadow: var(--soft-shadow); }
.guide-violet { --guide: var(--violet); }
.guide-amber { --guide: var(--amber); }
.guide-green { --guide: var(--green); }
.guide-avatar { position: relative; display: grid; place-items: center; width: 58px; height: 58px; border: 3px solid color-mix(in srgb, var(--guide) 65%, #7be7ff); border-radius: 50%; background: #0a2851; color: #71e5ff; font-weight: 900; }
.guide-avatar i { position: absolute; bottom: 14px; width: 16px; height: 3px; border-radius: 99px; background: currentColor; }
.guide-intro small,
.guide-intro b { display: block; }
.guide-intro small { color: var(--guide); font-weight: 800; }
.guide-intro b { margin-top: 4px; }
.guide-items { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.guide-item { display: grid; grid-template-columns: 28px 1fr; gap: 7px; min-width: 0; padding: 9px; border: 1px solid #dbe6f3; border-radius: 12px; background: rgba(255, 255, 255, 0.78); }
.guide-item > span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: color-mix(in srgb, var(--guide) 12%, white); color: var(--guide); font-size: 11px; font-weight: 900; }
.guide-item p,
.guide-item b,
.guide-item small { display: block; margin: 0; }
.guide-item b { font-size: 11px; }
.guide-item small { margin-top: 2px; color: var(--ink-soft); font-size: 10px; line-height: 1.45; }
.emotion-page,
.recommender-page,
.detective-page,
.agent-page,
.results-page { color: var(--ink); }
.page-header h1 { color: #f4f9ff; }
.page-header .lead { color: #aebfd5; }
.emotion-page .choice,
.recommender-page .choice,
.detective-page .choice,
.agent-page .choice { border-color: #d3e0ef; background: #f5f9ff; color: #526780; }
.emotion-page .choice.active,
.recommender-page .choice.active,
.detective-page .choice.active,
.agent-page .choice.active { color: var(--ink); }
.emotion-page textarea,
.recommender-page textarea,
.detective-page textarea,
.agent-page textarea,
.agent-page input[type="text"] { border-color: #ccdced; background: #f7faff; color: var(--ink); }
@media (max-width: 1180px) { .lab-guide { grid-template-columns: auto 1fr; } .guide-items { grid-column: 1 / -1; } }
@media (max-width: 720px) { .lab-guide { grid-template-columns: auto 1fr; padding: 14px; } .guide-items { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Run component and application checks**

Run: `pnpm vitest run components/lab-guide.test.tsx components/ui.test.tsx lib/algorithms.test.ts`

Expected: all test files pass.

Run: `pnpm typecheck`

Expected: exit code 0.

- [ ] **Step 5: Browser-check both lab interactions**

Emotion flow: `/emotion` → enter and lock a prediction → change one training condition → run the test → verify the result panel updates.

Recommendation flow: `/recommender` → click “点赞” → verify the action count or weight changes → use “带我探索低比例内容” → verify the selected category changes.

At desktop and mobile sizes verify the guide becomes part of normal document flow and does not cover the operation controls.

- [ ] **Step 6: Commit the first two guided labs**

```powershell
git add -- app/emotion/page.tsx app/recommender/page.tsx app/redesign.css
git commit -m "feat: guide students through the first two labs"
```

### Task 5: Add student guidance to detective and agent labs

**Files:**
- Modify: `app/detective/page.tsx`
- Modify: `app/agent/page.tsx`
- Modify: `app/redesign.css`

- [ ] **Step 1: Import LabGuide and add the detective guide after StepRail**

Add `import { LabGuide } from "@/components/lab-guide";` to `app/detective/page.tsx`, then render:

```tsx
<LabGuide
  tone="amber"
  action="选一个案卷，依次找细节、查来源，再做交叉验证。"
  observe="证据是否相关、可靠，而且来自彼此独立的来源。"
  complete="找齐三类证据，并提交一个带理由的结论。"
  next="把结论和证据整理成可回看的证据链卡片。"
/>
```

- [ ] **Step 2: Import LabGuide and add the agent guide after StepRail**

Add `import { LabGuide } from "@/components/lab-guide";` to `app/agent/page.tsx`, then render:

```tsx
<LabGuide
  tone="green"
  action="先选真实校园问题，再写清最少数据、AI判断和人工边界。"
  observe="有没有收集多余数据，重要结果是否交给人确认。"
  complete="四个设计步骤写具体，并打开三个安全开关。"
  next="通过安全门后，生成校园 AI 智能体成果卡。"
/>
```

- [ ] **Step 3: Add tone-aware page accents and safe sticky behavior**

Append to `app/redesign.css`:

```css
.emotion-page { --lab-accent: var(--blue); }
.recommender-page { --lab-accent: var(--violet); }
.detective-page { --lab-accent: var(--amber); }
.agent-page { --lab-accent: var(--green); }
.emotion-page .eyebrow,
.recommender-page .eyebrow,
.detective-page .eyebrow,
.agent-page .eyebrow { color: var(--lab-accent); }
.step-rail li.current { color: var(--lab-accent); font-weight: 800; }
.step-rail li.current span { color: white; border-color: var(--lab-accent); background: var(--lab-accent); box-shadow: 0 0 0 5px color-mix(in srgb, var(--lab-accent) 14%, transparent); }
.case-files,
.sticky-result,
.agent-preview-wrap { top: 88px; }
@media (max-width: 1150px) { .case-files,
  .sticky-result,
  .agent-preview-wrap { position: static; }
}
```

- [ ] **Step 4: Run application checks**

Run: `pnpm lint`

Expected: exit code 0.

Run: `pnpm typecheck`

Expected: exit code 0.

- [ ] **Step 5: Browser-check detective and agent flows**

Detective flow: `/detective` → select one evidence item in each evidence group → verify the evidence count changes → submit the enabled conclusion.

Agent flow: `/agent` → select a template → fill all four design fields → enable all safety switches → verify the result card reaches `READY`.

At 390×844 verify sticky desktop columns are disabled and all fields, switches and action buttons remain reachable above the bottom navigation.

- [ ] **Step 6: Commit the final two guided labs**

```powershell
git add -- app/detective/page.tsx app/agent/page.tsx app/redesign.css
git commit -m "feat: guide evidence and responsible AI labs"
```

### Task 6: Polish results and competition demo surfaces

**Files:**
- Modify: `app/results/page.tsx`
- Modify: `app/demo/page.tsx`
- Modify: `app/redesign.css`

- [ ] **Step 1: Clarify results-page reading order**

Keep `calculateAbilities`, evidence data and reset behavior unchanged. Change the `PageHeader` description to:

```tsx
description="先看六项能力，再点开成果和证据时间线。每一级都能找到你做过的实验，不按速度或点击次数排名。"
```

Change the ability chart panel title copy to:

```tsx
<div><h2>先看六项 AI 能力</h2><p>从 1 级“需要支持”到 4 级“表现突出”，每一级都有学习证据。</p></div>
```

- [ ] **Step 2: Clarify the competition demo header without changing its state machine**

Change the demo header paragraph to:

```tsx
<p>跟着五个“变化瞬间”完成演示：每一幕只看一个关键现象，也能现场操作。</p>
```

Replace the existing `现场操作区` tag inside `.demo-stage > header` with:

```tsx
<div className="demo-stage-meta">
  <span className="tag">现场操作区</span>
  <span className="demo-guide-chip">当前任务：{demoSteps[step].short}</span>
</div>
```

- [ ] **Step 3: Add results and demo visual overrides**

Append to `app/redesign.css`:

```css
.results-hero .panel,
.artifact-card,
.timeline-panel,
.results-footer { background: linear-gradient(145deg, #ffffff, #f5faff); }
.ability-chart-panel,
.rubric-panel { min-width: 0; }
.rubric-list > div { border-color: #d8e4f2; background: #f7faff; }
.evidence-timeline article,
.artifact-card > div { color: var(--ink); }
.demo-stage { border-color: rgba(88, 158, 246, 0.3); background: linear-gradient(145deg, rgba(15, 43, 83, 0.98), rgba(7, 24, 51, 0.98)); color: #eef7ff; }
.demo-guide-chip { display: inline-flex; align-items: center; min-height: 28px; padding: 5px 9px; border: 1px solid rgba(99, 221, 255, 0.25); border-radius: 999px; color: #83e8ff; background: rgba(55, 151, 225, 0.08); font-size: 10px; }
.demo-stage-meta { display: flex; gap: 8px; align-items: center; }
@media (max-width: 760px) { .demo-stage > header { align-items: flex-start; flex-direction: column; } .demo-stage-meta { flex-wrap: wrap; } }
```

- [ ] **Step 4: Run full tests and build**

Run: `pnpm test`

Expected: all Vitest tests pass.

Run: `pnpm build`

Expected: build exits 0 and includes `/results` and `/demo`.

- [ ] **Step 5: Browser-check results and demo**

Results flow: `/results` loads with either the empty state or existing local evidence; verify the primary action is visible and the radar container has non-zero dimensions.

Demo flow: `/demo` → select each of five steps → verify the stage content changes → use “下一幕” until the final results state.

Check that horizontal step navigation scrolls on mobile and does not widen the document.

- [ ] **Step 6: Commit results and demo polish**

```powershell
git add -- app/results/page.tsx app/demo/page.tsx app/redesign.css
git commit -m "feat: polish results and competition demo"
```

### Task 7: Eliminate overlap, clipping, and accidental horizontal scroll

**Files:**
- Modify: `app/redesign.css`

- [ ] **Step 1: Add final layout safety rules**

Append to `app/redesign.css`:

```css
.page-shell,
.panel,
.grid-main,
.grid-2,
.grid-3,
.recommender-layout,
.detective-layout,
.agent-layout,
.results-hero,
.demo-stage { min-width: 0; }
.panel,
.lab-card,
.artifact-card,
.guide-item { overflow-wrap: anywhere; }
.radar-wrap,
.ability-chart,
.demo-radar { min-width: 0; }
.button-group > *,
.action-buttons > *,
.submit-row > * { min-width: 0; }
@media (max-width: 560px) {
  .page-header h1 { font-size: 34px; }
  .page-header { margin-bottom: 18px; }
  .teaching-badge { white-space: normal; }
  .step-rail { margin-inline: -2px; scrollbar-width: thin; }
  .panel-pad { padding: 16px; }
  .button-group { width: 100%; }
  .button-group .button { flex-basis: 100%; }
  .results-footer .button,
  .print-button { margin-bottom: 6px; }
}
@supports (content-visibility: auto) {
  .artifact-grid,
  .timeline-panel,
  .action-log { content-visibility: auto; contain-intrinsic-size: 600px; }
}
```

- [ ] **Step 2: Run static overflow-oriented checks**

Run: `pnpm lint`

Expected: exit code 0.

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: exit code 0.

- [ ] **Step 3: Test the full route matrix in Browser**

The smoke flow is: app loads → first meaningful screen renders → primary visible controls respond without runtime errors.

Routes:

```text
/
/emotion
/recommender
/detective
/agent
/results
/demo
```

Viewports:

```text
1280 × 720 desktop
768 × 1024 tablet
390 × 844 mobile
```

For every route collect:

- URL and title;
- meaningful DOM snapshot;
- console warnings and errors;
- first-viewport screenshot;
- one screenshot after scrolling to the middle or bottom;
- `document.documentElement.scrollWidth <= window.innerWidth + 1`;
- no visible framework error overlay.

- [ ] **Step 4: Check fixed-element overlap at the page bottom**

At mobile size, scroll each page to the bottom and evaluate:

```js
(() => {
  const nav = document.querySelector(".mobile-nav");
  const main = document.querySelector(".main-content");
  const lastInteractive = Array.from(document.querySelectorAll("main a, main button, main input, main textarea, main select"))
    .filter((element) => element.getClientRects().length)
    .at(-1);
  if (!nav || !main || !lastInteractive) return { ok: true, reason: "no mobile nav or final control" };
  const navRect = nav.getBoundingClientRect();
  const controlRect = lastInteractive.getBoundingClientRect();
  return { ok: controlRect.bottom <= navRect.top, navTop: navRect.top, controlBottom: controlRect.bottom };
})()
```

Expected after the page reaches its final scroll position: `ok: true` for each route.

- [ ] **Step 5: Fix every mismatch and rerun the same route/viewport check**

Keep a mismatch ledger with exactly these columns:

```text
Route | Viewport | Reference or requirement | Rendered issue | Fix | Recheck result
```

Do not close this task while any row has a failing recheck.

- [ ] **Step 6: Commit responsive and overlap fixes**

```powershell
git add -- app/redesign.css
git commit -m "fix: prevent responsive layout overlap"
```

### Task 8: Final verification and evidence handoff

**Files:**
- Verify only; modify the smallest relevant file if a failure is found.

- [ ] **Step 1: Run the complete engineering verification**

Run each command fresh:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:

```text
lint: exit 0
typecheck: exit 0
test: all tests pass, 0 failures
build: exit 0, all application routes listed
```

- [ ] **Step 2: Re-run the two required interaction proofs**

Proof A: `/` → “从第一关开始” → `/emotion` → lock a prediction → visible state change.

Proof B: `/recommender` → click “点赞” → weight or action count changes → no console error.

- [ ] **Step 3: Capture final screenshot evidence**

Capture and retain outside the repository:

```text
Desktop homepage first viewport
Desktop emotion lab first viewport
Mobile homepage first viewport
Mobile emotion lab at page bottom
One results or demo screen
```

- [ ] **Step 4: Review the original design requirements line by line**

Confirm with evidence:

```text
Experiment logic unchanged
Student guidance is visible and plain-language
Dark lobby plus bright experiment cards is consistent
Primary next actions are visually dominant
Desktop, tablet, and mobile have no overlap or horizontal overflow
```

- [ ] **Step 5: Inspect the final diff and working tree**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; any remaining changes are identified and belong to this task.

- [ ] **Step 6: Make the final implementation commit if verification fixes changed files**

```powershell
git add -- app/redesign.css app/layout.tsx app/page.tsx app/emotion/page.tsx app/recommender/page.tsx app/detective/page.tsx app/agent/page.tsx app/results/page.tsx app/demo/page.tsx components/lab-guide.tsx components/lab-guide.test.tsx components/ui.tsx components/ui.test.tsx components/shell.tsx
git commit -m "fix: finalize AI lab interface redesign"
```

Only run the final commit when there are verified implementation fixes not already committed. Stage only files inside this project.
