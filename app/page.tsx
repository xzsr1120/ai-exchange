"use client";

import Link from "next/link";
import { GuideAssistant } from "@/components/guide-assistant";
import { useLearning } from "@/components/learning-provider";

const missions = [
  {
    number: "01",
    label: "训练模型",
    title: "表情训练营",
    short: "改一改数据，看AI会不会学偏。",
    href: "/emotion",
    icon: "◉",
    tone: "blue",
    reward: "数据侦察徽章",
  },
  {
    number: "02",
    label: "识破推荐",
    title: "推荐迷宫",
    short: "点几次喜欢，看看世界如何变窄。",
    href: "/recommender",
    icon: "⌁",
    tone: "violet",
    reward: "破圈行动徽章",
  },
  {
    number: "03",
    label: "核验证据",
    title: "真假侦探社",
    short: "集齐三块证据，拆穿可疑答案。",
    href: "/detective",
    icon: "◇",
    tone: "amber",
    reward: "证据猎人徽章",
  },
  {
    number: "04",
    label: "创造AI",
    title: "校园智造局",
    short: "为校园AI装上清楚的安全边界。",
    href: "/agent",
    icon: "△",
    tone: "green",
    reward: "责任设计师徽章",
  },
];

export default function HomePage() {
  const { state } = useLearning();
  const done = [
    Boolean(state.emotionReport),
    state.recommendationActions.length >= 5,
    state.detectiveResults.length >= 1,
    Boolean(state.agentDesign?.completed),
  ];
  const nextMission = Math.min(done.findIndex((value) => !value) === -1 ? 3 : done.findIndex((value) => !value), 3);
  const completed = done.filter(Boolean).length;

  return (
    <div className="quest-home">
      <section className="quest-hero">
        <div className="quest-copy">
          <span className="quest-kicker"><i /> AI 探索任务已开启</span>
          <h1>今天，去<span>拆开一个AI</span></h1>
          <p>不背答案。亲手改变数据、追踪推荐、核验证据，再造一个有边界的校园AI。</p>
          <div className="quest-actions">
            <Link className="quest-start" href={missions[nextMission].href}>{completed ? "继续闯关" : "开启第一关"}<span>→</span></Link>
            <Link className="quest-demo" href="/demo"><span>▶</span> 3分钟快速挑战</Link>
          </div>
          <div className="quest-status">
            <span><b>{completed}</b><small>已通关</small></span>
            <span><b>{4 - completed}</b><small>待探索</small></span>
            <span><b>{state.evidence.length}</b><small>证据值</small></span>
          </div>
        </div>

        <div className="quest-command" aria-label="AI探索基地指挥舱">
          <div className="command-rings"><i /><i /><i /></div>
          <div className="command-platform"><span /><i /></div>
          <div className="command-robot" aria-hidden="true">
            <span className="command-antenna" />
            <span className="command-head"><i /><i /><b /></span>
            <span className="command-body"><i>AI</i></span>
            <span className="command-arm command-arm-left" />
            <span className="command-arm command-arm-right" />
          </div>
          <div className="command-bubble"><small>阿界博士</small><b>{completed === 4 ? "全关完成！去看看你的能力图谱吧。" : `下一站：${missions[nextMission].title}`}</b></div>
          <div className="command-data command-data-a">MISSION<br /><b>0{nextMission + 1}</b></div>
          <div className="command-data command-data-b">SYSTEM<br /><b>READY</b></div>
        </div>
      </section>

      <section className="quest-map" aria-labelledby="quest-map-title">
        <header>
          <div><span>MISSION MAP</span><h2 id="quest-map-title">选择你的下一场挑战</h2></div>
          <Link href="/results">查看我的战绩 <span>→</span></Link>
        </header>
        <div className="quest-track">
          {missions.map((mission, index) => {
            const locked = index > 0 && !done[index - 1];
            const active = index === nextMission;
            return (
              <div className="quest-node-wrap" key={mission.href}>
                <Link href={mission.href} className={`quest-card quest-${mission.tone} ${active ? "active" : ""} ${done[index] ? "complete" : ""}`}>
                  <div className="quest-card-top"><span>关卡 {mission.number}</span><b>{done[index] ? "✓ 已通关" : active ? "正在进行" : locked ? "推荐顺序" : "可挑战"}</b></div>
                  <div className="quest-card-icon"><i>{mission.icon}</i><span>{done[index] ? "✓" : mission.number}</span></div>
                  <p>{mission.label}</p><h3>{mission.title}</h3><small>{mission.short}</small>
                  <footer><span>✦ {mission.reward}</span><b>{done[index] ? "再次挑战" : active ? "继续挑战" : "进入关卡"} →</b></footer>
                </Link>
                {index < missions.length - 1 && <span className={`quest-path ${done[index] ? "lit" : ""}`}><i /><i /><i /></span>}
              </div>
            );
          })}
        </div>
      </section>

      <GuideAssistant
        compact
        message={completed === 4 ? "四关都完成了！去能力图谱领取你的学习成果。" : "每关只有一个任务。完成它，我会带你进入下一页。"}
        detail="看见结果先别急着相信：先改变一个条件，再比较前后证据，最后说出你的发现。"
      />
    </div>
  );
}
