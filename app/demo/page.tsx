"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { ExpressionFace } from "@/components/expression-face";
import { useLearning } from "@/components/learning-provider";
import {
  applyRecommendationAction,
  calculateAbilities,
  initialWeights,
  recommendationStats,
  runEmotionModel,
} from "@/lib/algorithms";
import { agentTemplates, detectiveCases } from "@/lib/data";

const demoSteps = [
  { time: "0:20—0:55", title: "一张错标签，模型立即反转", short: "数据会改变AI" },
  { time: "0:55—1:25", title: "连续点赞，信息泡泡收缩", short: "行为改变推荐" },
  { time: "1:25—2:05", title: "三证核验，纠正可信错答", short: "证据胜过语气" },
  { time: "2:05—2:35", title: "为校园AI装上安全门", short: "创造同时划边界" },
  { time: "2:35—3:00", title: "学习证据形成能力图谱", short: "评价真实可回溯" },
];

export default function DemoPage() {
  const learning = useLearning();
  const [step, setStep] = useState(0);
  const [wrongLabel, setWrongLabel] = useState(false);
  const [demoWeights, setDemoWeights] = useState(initialWeights);
  const [techLikes, setTechLikes] = useState(0);
  const [proofs, setProofs] = useState([false, false, false]);
  const [submittedProof, setSubmittedProof] = useState(false);
  const [safety, setSafety] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [agentSaved, setAgentSaved] = useState(false);
  const cleanModel = useMemo(() => runEmotionModel({ sampleSize: "large", diversity: "diverse" }), []);
  const currentModel = runEmotionModel({ sampleSize: "large", diversity: "diverse", labelOverrides: wrongLabel ? { h2: "紧张笑容", h3: "紧张笑容" } : {} });
  const recStats = recommendationStats(demoWeights);
  const abilities = calculateAbilities(learning.state);
  const answerCase = detectiveCases[1];
  const agent = agentTemplates[3];

  function changeLabel() {
    const next = !wrongLabel;
    setWrongLabel(next);
    const after = next ? runEmotionModel({ sampleSize: "large", diversity: "diverse", labelOverrides: { h2: "紧张笑容", h3: "紧张笑容" } }) : cleanModel;
    learning.saveEmotionReport({ prediction: "错误标签可能误导模型", variable: next ? "只改变2个自然笑容样本的标签" : "修正错误标签", beforeAccuracy: cleanModel.accuracy, afterAccuracy: after.accuracy, confidence: after.averageConfidence, explanation: "标签错误把自然笑容类别中心拉向紧张笑容，模型学到的规律也随之改变。", sampleSize: after.sampleCount, diversity: "多样", labelErrors: after.labelErrors });
    learning.addEvidence({ kind: "变量", title: next ? "演示：注入错误标签" : "演示：修正错误标签", detail: `只改变标签，准确率 ${cleanModel.accuracy}% → ${after.accuracy}%`, route: "/demo" });
  }

  function likeTech() {
    setDemoWeights((current) => applyRecommendationAction(current, "科技", "点赞"));
    setTechLikes((value) => value + 1);
    learning.saveRecommendationAction({ category: "科技", action: "点赞", delta: 3 });
    learning.addEvidence({ kind: "推荐", title: "演示：点赞科技", detail: "科技权重 +3，推荐比例集中，信息泡泡缩小。", route: "/demo" });
  }

  function explore() {
    let next = demoWeights;
    for (const category of ["音乐", "游戏", "动漫", "运动", "校园生活"] as const) next = applyRecommendationAction(next, category, "点赞");
    setDemoWeights(next);
    learning.addEvidence({ kind: "变量", title: "演示：主动探索其他内容", detail: "五个低比例类别权重上升，推荐多样性恢复。", route: "/demo" });
  }

  function submitProof() {
    if (!proofs.every(Boolean)) return;
    learning.saveDetectiveResult({ caseId: answerCase.id, caseTitle: answerCase.title, detailEvidence: answerCase.evidence.detail[0].text, sourceEvidence: answerCase.evidence.source[0].text, crossEvidence: answerCase.evidence.cross[0].text, conclusion: "错误", reasoning: "绝对化表述只是线索；引用无法检索，且教材与两个独立来源都指出关键条件是光照。", quality: 100 });
    learning.addEvidence({ kind: "核验", title: "演示：三证纠正AI错答", detail: "细节、来源、交叉验证齐全；结论从“看似可信”修正为“错误”。", route: "/demo" });
    setSubmittedProof(true);
  }

  function toggleSafety(index: number) {
    const next: [boolean, boolean, boolean] = [...safety];
    next[index] = !next[index];
    setSafety(next);
    if (next.every(Boolean)) {
      const complete = { ...agent, safety: next, completed: true };
      learning.saveAgentDesign(complete);
      learning.addEvidence({ kind: "设计", title: "演示：校园反诈智能体通过安全门", detail: `不收集：${agent.excludedData}；高风险交给教师、家长或警方。`, route: "/demo" });
      setAgentSaved(true);
    } else setAgentSaved(false);
  }

  function resetDemo() {
    learning.resetAll();
    setStep(0); setWrongLabel(false); setDemoWeights(initialWeights()); setTechLikes(0); setProofs([false, false, false]); setSubmittedProof(false); setSafety([false, false, false]); setAgentSaved(false);
  }

  return (
    <div className="page-shell demo-page">
      <header className="demo-header">
        <div><p className="eyebrow">3-MINUTE COMPETITION MODE</p><h1>三分钟竞赛演示</h1><p>五个关键“变化瞬间”，每一步都是真实可操作、可解释的本地教学模型。</p></div>
        <div className="button-group"><button className="button button-danger" onClick={resetDemo}>↻ 一键重置演示</button><Link href="/" className="button">退出演示</Link></div>
      </header>
      <nav className="demo-step-nav" aria-label="演示步骤">{demoSteps.map((item, index) => <button key={item.title} onClick={() => setStep(index)} className={step === index ? "active" : index < step ? "done" : ""}><span>{index < step ? "✓" : index + 1}</span><div><small>{item.time}</small><b>{item.short}</b></div></button>)}</nav>

      <section className="demo-stage panel">
        <header><div><small>{demoSteps[step].time} / STEP {String(step + 1).padStart(2, "0")}</small><h2>{demoSteps[step].title}</h2></div><span className="tag">现场操作区</span></header>

        {step === 0 && <div className="demo-emotion">
          <div className="demo-face-pair"><div><ExpressionFace label="自然笑容" features={{ eyes: 68, brows: 57, mouth: 78 }} size={120} /><small>H2 · 原标签“自然笑容”</small></div><span>贴到</span><div className={wrongLabel ? "wrong-bin" : "clean-bin"}><b>{wrongLabel ? "紧张笑容" : "自然笑容"}</b><small>{wrongLabel ? "错误标签" : "正确标签"}</small></div></div>
          <div className="demo-metrics"><div><small>测试准确率</small><strong className={wrongLabel ? "drop" : ""}>{currentModel.accuracy}%</strong><em>{wrongLabel ? `下降 ${cleanModel.accuracy - currentModel.accuracy} 个百分点` : "正确多样基准"}</em></div><div><small>错误标签</small><strong>{currentModel.labelErrors}</strong><em>个样本</em></div><div><small>平均置信度</small><strong>{currentModel.averageConfidence}%</strong><em>不等于一定正确</em></div></div>
          <div className="demo-explain"><p><b>为什么变化：</b>{currentModel.reason}</p><button className={`button ${wrongLabel ? "button-success" : "button-warning"}`} onClick={changeLabel}>{wrongLabel ? "✓ 修正错误标签" : "把自然笑容错贴为紧张笑容"}</button></div>
        </div>}

        {step === 1 && <div className="demo-recommendation">
          <div className="demo-like-card"><span>⌘</span><div><small>科技 / FUTURE</small><h3>机器人如何看懂教室？</h3></div><button className="button button-primary" onClick={likeTech}>♡ 点赞科技 +3</button><b>已连续点赞 {techLikes} 次</b></div>
          <div className="demo-bars">{recStats.ratios.map((item) => <div key={item.category}><span>{item.category}</span><i><em style={{ width: `${item.ratio * 3}%` }} /></i><b>{item.ratio}%</b></div>)}</div>
          <div className="demo-bubble" style={{ width: 110 + recStats.diversity, height: 110 + recStats.diversity }}><b>{recStats.diversity}</b><small>多样性</small></div>
          <div className="demo-explain"><p><b>{techLikes >= 3 ? "泡泡正在收缩：" : "公开规则："}</b>每次点赞使科技权重 +3，类别越集中，多样性越低。</p><button className="button" onClick={explore} disabled={techLikes < 3}>主动探索五类内容，恢复多样性</button></div>
        </div>}

        {step === 2 && <div className="demo-detective">
          <div className="demo-claim"><span>教学合成AI回答</span><blockquote>“植物在夜间只进行呼吸作用，不会进行任何光合作用。见《中学生物新论》林海，2022。”</blockquote><p>它有书名、有作者、语气专业——但这些是证据吗？</p></div>
          <div className="demo-proof-grid">{[
            ["看细节", "发现‘只、任何’等绝对化表述", "⌕"],
            ["找来源", "图书馆与出版社均无此书", "◎"],
            ["交叉验证", "教材和两个独立来源都指向‘光照’", "≋"],
          ].map((item, index) => <button key={item[0]} className={proofs[index] ? "on" : ""} onClick={() => setProofs((current) => current.map((value, i) => i === index ? !value : value))}><span>{item[2]}</span><small>证据 0{index + 1}</small><b>{item[0]}</b><p>{item[1]}</p><em>{proofs[index] ? "✓ 已加入证据链" : "+ 点亮证据"}</em></button>)}</div>
          <div className="demo-verdict"><span>证据链 {proofs.filter(Boolean).length}/3</span><button className="button button-warning" disabled={!proofs.every(Boolean)} onClick={submitProof}>提交结论：错误</button>{submittedProof && <b>✓ 已纠正：流畅表达不能代替可靠来源</b>}</div>
        </div>}

        {step === 3 && <div className="demo-agent">
          <div className="demo-agent-board"><header><span>校园反诈智能体</span><b>{agentSaved ? "READY" : "DRAFT"}</b></header>{[["痛点", agent.pain], ["数据", agent.data], ["判断", agent.judgment], ["边界", agent.boundary]].map(([label, value], index) => <div key={label}><span>0{index + 1}</span><b>{label}</b><p>{value}</p></div>)}</div>
          <div className="demo-safety"><h3>安全门 <span>{safety.filter(Boolean).length}/3</span></h3>{["不收集无关个人信息", "重要结果由人工确认", "明确提示AI可能出错"].map((item, index) => <button role="switch" aria-checked={safety[index]} className={safety[index] ? "on" : ""} key={item} onClick={() => toggleSafety(index)}><span><i /></span><b>{item}</b><em>{safety[index] ? "已开启" : "待确认"}</em></button>)}<p className={safety.every(Boolean) ? "notice notice-green" : "notice"}><span>{safety.every(Boolean) ? "✓" : "!"}</span><span>{safety.every(Boolean) ? "安全门已通过：成果已写入学习证据。" : "三个开关未全部开启，智能体不能提交。"}</span></p></div>
        </div>}

        {step === 4 && <div className="demo-results">
          <div className="demo-radar"><ResponsiveContainer width="100%" height="100%"><RadarChart data={abilities} outerRadius="70%"><PolarGrid stroke="rgba(118,169,218,.25)" /><PolarAngleAxis dataKey="dimension" tick={{ fill: "#b7cad9", fontSize: 11 }} /><PolarRadiusAxis domain={[0,4]} tick={false} axisLine={false} /><Radar dataKey="level" stroke="#2dd4bf" fill="#0ea5e9" fillOpacity={.4} /></RadarChart></ResponsiveContainer></div>
          <div className="demo-timeline"><h3>学习证据时间线</h3>{learning.state.evidence.slice(0,5).map((event) => <div key={event.id}><span>{event.kind}</span><p><b>{event.title}</b><small>{event.detail}</small></p></div>)}{!learning.state.evidence.length && <p className="muted">请先完成前四个演示步骤。</p>}</div>
          <div className="demo-rubric"><p className="eyebrow">RUBRIC, NOT CLICKS</p><h3>图谱由四级量规生成</h3><p>依据变量对照、三证核验、四步设计和责任边界；不根据通关速度或点击次数随意打分。</p><Link className="button button-success" href="/results">打开完整成果页 →</Link></div>
        </div>}
      </section>

      <footer className="demo-controls"><button className="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← 上一步</button><div><span style={{ width: `${((step + 1) / 5) * 100}%` }} /><small>{step + 1} / 5</small></div>{step < 4 ? <button className="button button-primary" onClick={() => setStep(step + 1)}>下一幕 →</button> : <Link className="button button-primary" href="/results">查看成果 →</Link>}</footer>
    </div>
  );
}
