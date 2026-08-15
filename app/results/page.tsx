"use client";

import Link from "next/link";
import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLearning } from "@/components/learning-provider";
import { EmptyState, PageHeader } from "@/components/ui";
import { calculateAbilities } from "@/lib/algorithms";

const kindIcons = { 预测: "?", 变量: "⇄", 推荐: "⌁", 核验: "◇", 设计: "△", 反思: "✦" };

export default function ResultsPage() {
  const { state, resetAll } = useLearning();
  const abilities = calculateAbilities(state);
  const completed = [Boolean(state.emotionReport), state.recommendationActions.length >= 5, state.detectiveResults.length >= 1, Boolean(state.agentDesign?.completed)].filter(Boolean).length;
  const hasEvidence = state.evidence.length > 0;
  const [mobilePage, setMobilePage] = useState(0);
  const [timelinePage, setTimelinePage] = useState(0);
  const timelinePageCount = Math.max(1, Math.ceil(state.evidence.length / 3));
  const visibleEvidence = state.evidence.slice(timelinePage * 3, timelinePage * 3 + 3);

  return (
    <div className="page-shell results-page">
      <PageHeader eyebrow="LEARNING EVIDENCE / 学习成果" title="AI能力图谱" description="这里不按速度或点击次数打分。每一级能力都能回溯到预测、变量对照、证据链和责任边界。" badge="四级评价量规" />

      {!hasEvidence ? <EmptyState title="还没有学习证据" detail="从任意实验开始。第一次预测、改变变量或完成核验后，证据会保存在本机浏览器中。" href="/emotion" action="开始第一项实验" /> : <>
        <nav className="results-page-nav" aria-label="成果分页">
          {["能力图", "评分依据", "成果卡", "证据回放"].map((label, index) => <button type="button" key={label} className={mobilePage === index ? "active" : ""} onClick={() => setMobilePage(index)}><span>{index + 1}</span>{label}</button>)}
        </nav>
        <section className="results-hero">
          <div className={`panel panel-pad ability-chart-panel results-mobile-page ${mobilePage === 0 ? "is-active" : ""}`}>
            <div className="panel-title"><div><h2>六维能力图谱</h2><p>1 级需要支持 · 2 级正在发展 · 3 级达到目标 · 4 级表现突出</p></div><span className="tag tag-green">{completed}/4 阶段形成成果</span></div>
            <div className="ability-chart">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={abilities} outerRadius="70%">
                  <PolarGrid stroke="rgba(118,169,218,.25)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "#b7cad9", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fill: "#6e89a1", fontSize: 9 }} axisLine={false} />
                  <Radar name="量规等级" dataKey="level" stroke="#2dd4bf" fill="#0ea5e9" fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: "#0b1d35", border: "1px solid rgba(118,169,218,.25)", borderRadius: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`panel panel-pad rubric-panel results-mobile-page ${mobilePage === 1 ? "is-active" : ""}`}>
            <div className="panel-title"><div><h2>评分依据</h2><p>每一维都指向真实作品或操作</p></div></div>
            <div className="rubric-list">{abilities.map((item) => <div key={item.dimension}><span className={`level level-${item.level}`}>L{item.level}</span><div><b>{item.dimension}</b><small>{item.evidence}</small></div></div>)}</div>
            <div className="notice notice-blue"><span>i</span><span>能力图谱用于形成性反馈与自我反思，不用于公开排名。</span></div>
          </div>
        </section>

        <section className={`artifact-grid results-mobile-page ${mobilePage === 2 ? "is-active" : ""}`}>
          <article className={`artifact-card panel ${state.emotionReport ? "ready" : ""}`}><header><span>01</span><b>模型测试报告</b><i>{state.emotionReport ? "✓" : "○"}</i></header>{state.emotionReport ? <div><strong>{state.emotionReport.beforeAccuracy}% <em>→</em> {state.emotionReport.afterAccuracy}%</strong><p>{state.emotionReport.variable}</p><small>{state.emotionReport.explanation}</small></div> : <div><p>还未形成对照报告</p><Link href="/emotion">前往表情捕手 →</Link></div>}</article>
          <article className={`artifact-card panel ${state.recommendationActions.length >= 5 ? "ready" : ""}`}><header><span>02</span><b>推荐操作对照</b><i>{state.recommendationActions.length >= 5 ? "✓" : "○"}</i></header><div><strong>{state.recommendationActions.length}<em> 次模拟行为</em></strong><p>记录点赞、跳过和主动停留的权重变化</p><small>仅来自本次本地模拟，不是真实浏览画像。</small></div></article>
          <article className={`artifact-card panel ${state.detectiveResults.length ? "ready" : ""}`}><header><span>03</span><b>证据链卡片</b><i>{state.detectiveResults.length ? "✓" : "○"}</i></header><div><strong>{state.detectiveResults.length}<em> / 3 个案卷</em></strong><p>{state.detectiveResults.map((item) => `${item.caseTitle}：${item.conclusion}`).join("；") || "等待三证核验"}</p><small>按相关性、可靠性和独立性评估证据。</small></div></article>
          <article className={`artifact-card panel ${state.agentDesign?.completed ? "ready" : ""}`}><header><span>04</span><b>智能体成果卡</b><i>{state.agentDesign?.completed ? "✓" : "○"}</i></header><div><strong>{state.agentDesign?.template ?? "尚未设计"}</strong><p>{state.agentDesign?.completed ? "痛点—数据—判断—边界完整" : "等待完成四步设计与安全门"}</p><small>{state.agentDesign?.completed ? `明确不收集：${state.agentDesign.excludedData}` : "三个安全开关缺一不可。"}</small></div></article>
        </section>

        <section className={`panel panel-pad timeline-panel results-mobile-page ${mobilePage === 3 ? "is-active" : ""}`}>
          <div className="panel-title"><div><p className="eyebrow">TRACEABLE TIMELINE</p><h2>可追溯学习证据时间线</h2><p>评委能看到学生如何从初始预测走到有边界的创造</p></div><span className="tag">本机保存 {state.evidence.length} 条</span></div>
          <div className="evidence-timeline">
            {visibleEvidence.map((event) => <article key={event.id}><div className="timeline-icon">{kindIcons[event.kind]}</div><div><span>{event.kind} · {new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.at))}</span><h3>{event.title}</h3><p>{event.detail}</p><Link href={event.route}>查看对应实验 →</Link></div></article>)}
          </div>
          {timelinePageCount > 1 && <div className="results-timeline-pager"><button type="button" disabled={timelinePage === 0} onClick={() => setTimelinePage((page) => page - 1)}>← 上一组</button><span>{timelinePage + 1} / {timelinePageCount}</span><button type="button" disabled={timelinePage === timelinePageCount - 1} onClick={() => setTimelinePage((page) => page + 1)}>下一组 →</button></div>}
          <div className="results-privacy-inline"><p>人脸照片不上传、不写入学习记录，仅在表情实验当前页面内存中临时处理，刷新后清除。</p><button className="button button-danger" onClick={() => window.confirm("确定清除全部本地学习证据吗？此操作无法撤销。") && resetAll()}>清除记录</button></div>
        </section>

        <section className="results-footer panel panel-pad"><div><h2>你的数据只在这台设备上</h2><p>人脸照片不上传、不写入学习记录，仅在表情实验当前页面内存中临时处理，刷新后清除。其他匿名学习证据可随时清除。</p></div><button className="button button-danger" onClick={() => window.confirm("确定清除全部本地学习证据吗？此操作无法撤销。") && resetAll()}>清除全部本地记录</button></section>
      </>}
    </div>
  );
}
