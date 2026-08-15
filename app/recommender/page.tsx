"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ExperimentFrame } from "@/components/experiment-frame";
import { useLearning } from "@/components/learning-provider";
import {
  applyRecommendationAction,
  initialWeights,
  recommendationCategories,
  recommendationStats,
  type RecommendationCategory,
} from "@/lib/algorithms";
import type { RecommendationAction } from "@/lib/types";

const steps = ["留下第一条线索", "放大一个偏好", "看见推荐偏移", "主动改写泡泡", "把规则变成助手"];
const preferenceTarget = 5;

const content = {
  音乐: { icon: "♫", title: "为什么同一段旋律会让人上头？", meta: "声音实验室 · 2 分钟", tone: "violet", cue: "节奏与情绪" },
  游戏: { icon: "▣", title: "游戏里的敌人怎样找到最短路线？", meta: "寻路挑战 · 3 分钟", tone: "blue", cue: "路径与决策" },
  动漫: { icon: "✦", title: "一帧动画要画多少个关键动作？", meta: "动画工坊 · 2 分钟", tone: "pink", cue: "视觉与叙事" },
  运动: { icon: "◒", title: "旋转的足球为什么会拐弯？", meta: "运动科学 · 3 分钟", tone: "green", cue: "力与轨迹" },
  科技: { icon: "⌘", title: "机器人如何看懂教室里的障碍？", meta: "未来观察 · 2 分钟", tone: "cyan", cue: "感知与判断" },
  校园生活: { icon: "⌂", title: "课间十分钟怎样安排更高效？", meta: "校园频道 · 1 分钟", tone: "amber", cue: "时间与选择" },
} satisfies Record<RecommendationCategory, { icon: string; title: string; meta: string; tone: string; cue: string }>;

const guideMessages = [
  {
    message: "先挑一张你愿意看的内容，再给算法一个真实信号。",
    detail: "点赞、停留和跳过都会留下不同强度的线索。你不需要猜答案，只要观察它如何记住你。",
  },
  {
    message: "把同一种喜欢连续告诉算法，它会越来越确信。",
    detail: "连续给锁定类别点赞 5 次。每次点赞都会增加 3 点权重，看看推荐会不会开始偏向它。",
  },
  {
    message: "停一下，看见你的选择怎样挪动下一屏。",
    detail: "雷达图看权重，比例条看下一屏，泡泡分数看视野是否正在收窄。",
  },
  {
    message: "别让算法只喂你熟悉的内容，去低比例区捡一条新线索。",
    detail: "给当前最低比例类别一个点赞信号，再比较泡泡范围是否恢复。一次主动探索，就能改写下一轮。",
  },
  {
    message: "算法没有读心术，它只是重复计算你留下的信号。",
    detail: "操作先改变权重，权重再换算成比例，比例最后影响下一屏推荐。下一步，你可以把这套规则做成一个有边界的校园助手。",
  },
];

export default function RecommenderPage() {
  const { state, saveRecommendationAction, resetRecommendation, addEvidence } = useLearning();
  const [currentStep, setCurrentStep] = useState(0);
  const [category, setCategory] = useState<RecommendationCategory>("科技");
  const [firstActionDone, setFirstActionDone] = useState(false);
  const [focusCategory, setFocusCategory] = useState<RecommendationCategory | null>(null);
  const [preferenceCount, setPreferenceCount] = useState(0);
  const [breakTarget, setBreakTarget] = useState<RecommendationCategory | null>(null);
  const [breakComplete, setBreakComplete] = useState(false);
  const [bubbleBefore, setBubbleBefore] = useState(100);
  const [lastReason, setLastReason] = useState("六类内容从相同基础权重开始，系统还没有偏好依据。");
  const [lastAction, setLastAction] = useState<{ action: RecommendationAction["action"]; target: RecommendationCategory; delta: number } | null>(null);

  const weights = useMemo(() => {
    let result = initialWeights();
    for (const item of state.recommendationActions) {
      if (recommendationCategories.includes(item.category as RecommendationCategory)) {
        result = applyRecommendationAction(result, item.category as RecommendationCategory, item.action);
      }
    }
    return result;
  }, [state.recommendationActions]);

  const stats = recommendationStats(weights);
  const actions = state.recommendationActions;
  const selectedContent = content[category];
  const favorite = focusCategory ?? category;
  const favoriteContent = content[favorite];
  const lowest = stats.ratios.toSorted((a, b) => a.ratio - b.ratio)[0];
  const breakCategory = breakTarget ?? lowest.category;
  const breakContent = content[breakCategory];
  const breakRatio = stats.ratios.find((item) => item.category === breakCategory)?.ratio ?? 0;
  const selectedRatio = stats.ratios.find((item) => item.category === category)?.ratio ?? 0;
  const confidence = lastAction ? Math.min(98, 62 + actions.length * 4 + (selectedRatio > 20 ? 8 : 0)) : 0;
  const profileTop = stats.ratios.toSorted((a, b) => b.weight - a.weight).slice(0, 3);
  const bubbleSize = 80 + stats.diversity * 1.05;
  const beforeBubbleSize = 80 + bubbleBefore * 1.05;
  const diversityChange = stats.diversity - bubbleBefore;

  function act(action: RecommendationAction["action"], target: RecommendationCategory = category) {
    const delta = action === "点赞" ? 3 : action === "停留查看" ? 1 : -1;
    saveRecommendationAction({ category: target, action, delta });
    setCategory(target);
    setLastAction({ action, target, delta });
    const verb = delta > 0 ? `增加 ${delta}` : "减少 1";
    setLastReason(`你对“${target}”执行了${action}，该类兴趣权重${verb}；六类权重重新换算后，推荐比例随之改变。`);
    addEvidence({
      kind: "推荐",
      title: `${action} · ${target}`,
      detail: `公开规则：${action}使${target}权重${verb}`,
      route: "/recommender",
    });
  }

  function performFirstAction(action: RecommendationAction["action"]) {
    act(action);
    setFirstActionDone(true);
  }

  function reinforcePreference() {
    if (preferenceCount >= preferenceTarget) return;
    const target = focusCategory ?? category;
    setFocusCategory(target);
    act("点赞", target);
    setPreferenceCount((count) => Math.min(preferenceTarget, count + 1));
  }

  function exploreLowRatio() {
    if (breakComplete) return;
    act("点赞", breakCategory);
    setBreakComplete(true);
  }

  function reset() {
    resetRecommendation();
    setCurrentStep(0);
    setCategory("科技");
    setFirstActionDone(false);
    setFocusCategory(null);
    setPreferenceCount(0);
    setBreakTarget(null);
    setBreakComplete(false);
    setBubbleBefore(100);
    setLastReason("记录已清空，六类内容恢复为相同基础权重 5。");
    setLastAction(null);
    addEvidence({
      kind: "变量",
      title: "重置推荐记录",
      detail: "六类兴趣权重恢复一致，信息泡泡恢复最大范围。",
      route: "/recommender",
    });
  }

  function goNext() {
    if (currentStep === 0) {
      setFocusCategory(category);
      setCurrentStep(1);
      return;
    }
    if (currentStep === 2) {
      setBreakTarget(lowest.category);
      setBubbleBefore(stats.diversity);
      setBreakComplete(false);
      setCurrentStep(3);
      return;
    }
    if (currentStep < steps.length - 1) setCurrentStep((step) => step + 1);
  }

  const nextDisabled = currentStep === 0
    ? !firstActionDone
    : currentStep === 1
      ? preferenceCount < preferenceTarget
      : currentStep === 3
        ? !breakComplete
        : false;

  const nextLabel = currentStep === 0
    ? "锁定这次信号"
    : currentStep === 1
      ? preferenceCount < preferenceTarget
        ? `还差 ${preferenceTarget - preferenceCount} 次`
        : "观察推荐变化"
      : currentStep === 2
        ? "去打破泡泡"
        : currentStep === 3
          ? "查看公开规则"
          : "领取奖励 · 下一关";

  return (
    <ExperimentFrame
      level="02"
      title="算法读心局"
      mission="让算法猜你，亲手把泡泡打开"
      steps={steps}
      current={currentStep}
      tone="violet"
      guide={guideMessages[currentStep].message}
      guideDetail={guideMessages[currentStep].detail}
      reward="+20 判断力"
      onPrevious={currentStep > 0 ? () => setCurrentStep((step) => step - 1) : undefined}
      onNext={goNext}
      nextDisabled={nextDisabled}
      nextLabel={nextLabel}
      nextHref={currentStep === steps.length - 1 ? "/detective" : undefined}
    >
      {currentStep === 0 && (
        <div className="rec-choice-layout">
          <section className="rec-stream-card" aria-label="模拟推荐内容流">
            <header className="rec-feed-header">
              <div><span className="rec-live-indicator" /> <b>FOR YOU / 模拟内容流</b><small>这不是你的画像，只是一次可逆实验</small></div>
              <span className="rec-feed-count">第 01 屏</span>
            </header>
            <div className="rec-category-list" role="tablist" aria-label="选择内容类别">
              {recommendationCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={category === item}
                  className={`rec-category-button ${category === item ? "rec-is-active" : ""}`}
                  onClick={() => setCategory(item)}
                >
                  <span>{content[item].icon}</span><b>{item}</b>
                </button>
              ))}
            </div>

            <article className={`rec-content-card rec-tone-${selectedContent.tone}`}>
              <div className="rec-card-noise" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="rec-content-visual">
                <span className="rec-visual-label">{selectedContent.cue}</span>
                <div className="rec-scan-line" />
                <div className="rec-content-icon" aria-hidden="true">{selectedContent.icon}</div>
                <small>AI SIGNAL / 0{Math.min(9, actions.length + 1)}</small>
              </div>
              <div className="rec-content-copy">
                <span>{category} · DISCOVER</span>
                <h3>{selectedContent.title}</h3>
                <p>{selectedContent.meta}</p>
                <div className="rec-card-tags"><b>适合探索</b><b>+{Math.max(4, Math.round(selectedRatio))}% 可能出现</b></div>
              </div>
            </article>

            <div className="rec-actions" aria-label="选择对内容的操作">
              <button type="button" className="rec-action rec-action-skip" onClick={() => performFirstAction("跳过")}><span>×</span><b>跳过</b><small>权重 -1</small></button>
              <button type="button" className="rec-action rec-action-watch" onClick={() => performFirstAction("停留查看")}><span>◷</span><b>停留</b><small>权重 +1</small></button>
              <button type="button" className="rec-action rec-action-like" onClick={() => performFirstAction("点赞")}><span>♡</span><b>点赞</b><small>权重 +3</small></button>
            </div>
          </section>

          <aside className="rec-signal-note">
            <div className="rec-reading-head"><span className="rec-signal-icon">⌁</span><span><small>ALGORITHM READOUT</small><b>{firstActionDone ? "正在更新" : "等待输入"}</b></span></div>
            <div className="rec-reading-copy"><h3>{firstActionDone ? "我记住了这一条线索" : "你会留下哪种线索？"}</h3><p>{firstActionDone ? lastReason : "先选择类别，再点击一个操作按钮。每一次操作都能被看见、被解释。"}</p></div>
            <div className="rec-profile-stack" aria-label="当前偏好排行">
              <header><span>当前猜测</span><small>{firstActionDone ? "按权重实时排序" : "初始状态完全均衡"}</small></header>
              {profileTop.map((item, index) => (
                <div key={item.category} className={item.category === category ? "rec-is-selected" : ""}>
                  <span>0{index + 1}</span><b>{content[item.category].icon} {item.category}</b><i><em style={{ width: `${Math.max(18, (item.weight / Math.max(...profileTop.map((profile) => profile.weight))) * 100)}%` }} /></i><small>{item.weight} 点</small>
                </div>
              ))}
            </div>
            <div className="rec-reading-meter"><div><span>算法确信度</span><b>{confidence}%</b></div><i><em style={{ width: `${confidence}%` }} /></i></div>
            <div className="rec-signal-map" aria-label="信号传递路径"><div><span>01</span><b>你的动作</b><small>{lastAction ? `${lastAction.action} · ${lastAction.delta > 0 ? `+${lastAction.delta}` : lastAction.delta}` : "等待选择"}</small></div><i>→</i><div><span>02</span><b>兴趣权重</b><small>{category} · {stats.ratios.find((item) => item.category === category)?.weight ?? 5} 点</small></div><i>→</i><div><span>03</span><b>下一屏</b><small>{selectedRatio}% 可能出现</small></div></div>
          </aside>
        </div>
      )}

      {currentStep === 1 && (
        <div className="rec-streak-layout">
          <article className={`rec-content-card rec-streak-preview rec-tone-${favoriteContent.tone}`}>
            <div className="rec-lock-badge">已锁定类别</div>
            <div className="rec-content-icon" aria-hidden="true">{favoriteContent.icon}</div>
            <div className="rec-content-copy"><span>{favorite}</span><h3>{favoriteContent.title}</h3><p>连续偏好会把同一个信号放大</p></div>
          </article>

          <section className="rec-streak-console">
            <p className="rec-kicker">SIGNAL AMPLIFIER / 01</p>
            <h3>连续告诉它：我喜欢 {preferenceTarget} 次</h3>
            <p className="rec-streak-intro">偏好不是一句自我介绍，而是一串反复出现的行为。</p>
            <div className="rec-streak-dots" aria-label={`已完成 ${preferenceCount} 次，共 ${preferenceTarget} 次`}>
              {Array.from({ length: preferenceTarget }, (_, index) => (
                <span key={index} className={`rec-streak-dot ${index < preferenceCount ? "rec-is-filled" : ""}`}>{index < preferenceCount ? "♡" : index + 1}</span>
              ))}
            </div>
            <button type="button" className="rec-streak-button" onClick={reinforcePreference} disabled={preferenceCount >= preferenceTarget}>
              <span>♡</span>{preferenceCount >= preferenceTarget ? "偏好强化完成" : `给“${favorite}”点赞`}
            </button>
            <div className="rec-streak-stats">
              <div className="rec-mini-stat"><small>当前最高偏好</small><b>{stats.top.category}</b></div>
              <div className="rec-mini-stat"><small>最高推荐比例</small><b>{stats.top.ratio}%</b></div>
              <div className="rec-mini-stat"><small>内容多样性</small><b>{stats.diversity}</b></div>
            </div>
          </section>
        </div>
      )}

      {currentStep === 2 && (
        <div className="rec-observe-layout">
          <section className="rec-chart-card">
            <header className="rec-section-heading"><div><small>LIVE WEIGHTS</small><h3>兴趣权重雷达</h3></div><span>实时</span></header>
            <div className="rec-radar">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={stats.ratios} outerRadius="72%">
                  <PolarGrid stroke="rgba(118,169,218,.25)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#a9bfd1", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, Math.max(12, ...stats.ratios.map((item) => item.weight))]} tick={false} axisLine={false} />
                  <Radar name="兴趣权重" dataKey="weight" stroke="#38bdf8" fill="#7c3aed" fillOpacity={0.42} isAnimationActive />
                  <Tooltip contentStyle={{ background: "#0b1730", border: "1px solid rgba(118,169,218,.3)", borderRadius: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="rec-observe-side">
            <section className="rec-bubble-card">
              <div className="rec-bubble" style={{ width: bubbleSize, height: bubbleSize }}><div><b>{stats.diversity}</b><small>多样性 / 100</small></div></div>
              <div className="rec-bubble-copy"><small>INFORMATION BUBBLE</small><h3>{stats.diversity >= 92 ? "视野仍然多样" : stats.diversity >= 82 ? "泡泡正在收缩" : "内容已经明显集中"}</h3><p>最高偏好是 <b>{stats.top.category}</b>，占下一屏约 <b>{stats.top.ratio}%</b>。</p></div>
            </section>

            <section className="rec-ratio-card">
              <header className="rec-section-heading"><div><small>NEXT SCREEN</small><h3>下一屏推荐比例</h3></div></header>
              <div className="rec-ratio-list">
                {stats.ratios.toSorted((a, b) => b.ratio - a.ratio).map((item) => (
                  <div className="rec-ratio-row" key={item.category}>
                    <span>{item.category}</span><i className="rec-ratio-track"><em className="rec-ratio-fill" style={{ width: `${item.ratio}%` }} /></i><b>{item.ratio}%</b>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="rec-break-layout">
          <section className="rec-bubble-compare">
            <div className="rec-bubble-snapshot">
              <small>探索前</small>
              <div className="rec-bubble rec-bubble-before" style={{ width: beforeBubbleSize, height: beforeBubbleSize }}><b>{bubbleBefore}</b></div>
            </div>
            <div className="rec-compare-arrow">→<small>主动探索</small></div>
            <div className="rec-bubble-snapshot">
              <small>现在</small>
              <div className="rec-bubble rec-bubble-after" style={{ width: bubbleSize, height: bubbleSize }}><b>{stats.diversity}</b></div>
            </div>
          </section>

          <section className="rec-break-card">
            <p className="rec-kicker">ESCAPE THE BUBBLE / 03</p>
            <div className="rec-target-header">
              <span className={`rec-target-icon rec-tone-${breakContent.tone}`}>{breakContent.icon}</span>
              <div className="rec-target-copy"><small>当前低比例探索目标</small><h3>{breakCategory}</h3><p>现在只占下一屏的 {breakRatio}%</p></div>
            </div>
            <button type="button" className="rec-break-button" onClick={exploreLowRatio} disabled={breakComplete}>
              {breakComplete ? "✓ 已发出新的探索信号" : `去看看“${breakCategory}”并点赞 +3`}
            </button>
            <div className={`rec-break-result ${breakComplete ? "rec-is-complete" : ""}`}>
              <span>{breakComplete ? "✓" : "!"}</span>
              <p>{breakComplete ? `多样性变化 ${diversityChange >= 0 ? "+" : ""}${diversityChange}。一次主动探索，已经开始改写推荐。` : "完成一次跨类别探索，比较泡泡有没有重新打开。"}</p>
            </div>
          </section>
        </div>
      )}

      {currentStep === 4 && (
        <div className="rec-rules-layout">
          <section className="rec-rule-main">
            <div className="rec-flow" aria-label="推荐计算流程">
              <div className="rec-flow-step"><span>1</span><b>你的操作</b><small>点赞 · 停留 · 跳过</small></div>
              <i className="rec-flow-arrow">→</i>
              <div className="rec-flow-step"><span>2</span><b>改变权重</b><small>每类至少保留 1 点</small></div>
              <i className="rec-flow-arrow">→</i>
              <div className="rec-flow-step"><span>3</span><b>换算比例</b><small>权重 ÷ 总权重</small></div>
              <i className="rec-flow-arrow">→</i>
              <div className="rec-flow-step"><span>4</span><b>决定下一屏</b><small>高比例更常出现</small></div>
            </div>

            <div className="rec-rule-cards">
              <div className="rec-rule-card rec-rule-like"><span>♡</span><div><b>点赞</b><small>强偏好信号</small></div><em>+3</em></div>
              <div className="rec-rule-card rec-rule-watch"><span>◷</span><div><b>主动停留</b><small>弱偏好信号</small></div><em>+1</em></div>
              <div className="rec-rule-card rec-rule-skip"><span>×</span><div><b>跳过</b><small>负向信号</small></div><em>-1</em></div>
            </div>

            <div className="rec-reason-box"><strong>刚才发生了什么？</strong><p>{lastReason}</p></div>
          </section>

          <aside className="rec-rule-side">
            <header className="rec-section-heading"><div><small>EXPERIMENT LOG</small><h3>最近操作</h3></div><span>{actions.length} 条</span></header>
            <div className="rec-log-list">
              {actions.length ? actions.slice(-4).toReversed().map((item, index) => (
                <div className="rec-log-item" key={`${item.category}-${item.action}-${index}`}><span>{content[item.category as RecommendationCategory]?.icon ?? "·"}</span><b>{item.action} · {item.category}</b><em>{item.delta > 0 ? "+" : ""}{item.delta}</em></div>
              )) : <p className="rec-empty-log">还没有操作记录</p>}
            </div>
            <p className="rec-privacy-note"><span>i</span>这是确定、可复现的教学模型，只记录本实验里的匿名按钮操作。</p>
            <div className="rec-agent-bridge"><span>下一站 · 智能体工作台</span><b>把“推荐”改造成一个会解释、会拒绝越界请求的校园助手。</b><Link href="/agent">带着这条规则去设计 <span>→</span></Link></div>
            <button type="button" className="rec-reset-button" onClick={reset}>↻ 清空记录，重新挑战</button>
          </aside>
        </div>
      )}
    </ExperimentFrame>
  );
}
