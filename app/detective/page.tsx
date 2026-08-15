"use client";

import { useState } from "react";
import { ExperimentFrame } from "@/components/experiment-frame";
import { useLearning } from "@/components/learning-provider";
import { detectiveCases } from "@/lib/data";
import type { DetectiveResult } from "@/lib/types";

type Slot = "detail" | "source" | "cross";
type Work = {
  detail?: number;
  source?: number;
  cross?: number;
  conclusion?: DetectiveResult["conclusion"];
  reasoning: string;
  attempted: boolean;
  submitted: boolean;
};

const stageNames = ["领取案卷", "查看细节", "追踪来源", "交叉核验", "提交结论"];
const initialWork = (): Record<string, Work> => Object.fromEntries(
  detectiveCases.map((item) => [item.id, { reasoning: "", attempted: false, submitted: false }]),
);

const slotInfo: Record<Slot, { title: string; icon: string; hint: string }> = {
  detail: { title: "哪条细节更关键？", icon: "⌕", hint: "选与主张直接相关的异常，不要只凭审美和感觉。" },
  source: { title: "哪条来源更可靠？", icon: "◎", hint: "转发很多次不等于来源可靠，要找原始发布者。" },
  cross: { title: "怎样独立核对？", icon: "≋", hint: "另一个AI不是事实来源，优先寻找互相独立的正式渠道。" },
};

export default function DetectivePage() {
  const { state, saveDetectiveResult, addEvidence } = useLearning();
  const firstOpen = Math.max(0, detectiveCases.findIndex((item) => !state.detectiveResults.some((result) => result.caseId === item.id)));
  const [stage, setStage] = useState(0);
  const [caseIndex, setCaseIndex] = useState(firstOpen);
  const [works, setWorks] = useState(initialWork);
  const activeCase = detectiveCases[caseIndex];
  const work = works[activeCase.id];
  const slotForStage: Slot | undefined = stage === 1 ? "detail" : stage === 2 ? "source" : stage === 3 ? "cross" : undefined;
  const slotsComplete = (["detail", "source", "cross"] as Slot[]).filter((slot) => work[slot] !== undefined).length;
  const canSubmit = slotsComplete === 3 && Boolean(work.conclusion) && work.reasoning.trim().length >= 8;

  function update(patch: Partial<Work>) {
    setWorks((current) => ({
      ...current,
      [activeCase.id]: current[activeCase.id].submitted
        ? current[activeCase.id]
        : { ...current[activeCase.id], ...patch, attempted: false },
    }));
  }

  function next() {
    if (stage < stageNames.length - 1) setStage((value) => value + 1);
  }

  function submit() {
    if (!canSubmit || work.submitted) return;
    if (work.conclusion !== activeCase.expected) {
      setWorks((current) => ({
        ...current,
        [activeCase.id]: { ...current[activeCase.id], attempted: true },
      }));
      return;
    }
    const evidenceScore = (["detail", "source", "cross"] as Slot[]).reduce(
      (sum, slot) => sum + activeCase.evidence[slot][work[slot]!].quality,
      0,
    );
    const quality = Math.round((evidenceScore / 9) * 85 + 15);
    const result: DetectiveResult = {
      caseId: activeCase.id,
      caseTitle: activeCase.title,
      detailEvidence: activeCase.evidence.detail[work.detail!].text,
      sourceEvidence: activeCase.evidence.source[work.source!].text,
      crossEvidence: activeCase.evidence.cross[work.cross!].text,
      conclusion: work.conclusion!,
      reasoning: work.reasoning.trim(),
      quality,
    };
    saveDetectiveResult(result);
    addEvidence({ kind: "核验", title: `完成案卷 · ${activeCase.title}`, detail: `三证齐全，结论：${result.conclusion}，证据质量 ${quality}%`, route: "/detective" });
    setWorks((current) => ({ ...current, [activeCase.id]: { ...current[activeCase.id], attempted: true, submitted: true } }));
  }

  const guide = stage === 0
    ? "先领一份案卷。完成一份，就能通过主线关卡。"
    : stage === 1
      ? "只看与主张直接相关的异常。漂亮或奇怪，都不等于真假。"
      : stage === 2
        ? "追到最初的发布者。转发次数和头像都不能证明身份。"
        : stage === 3
          ? "找两个独立可靠的渠道核对，别让同一个错误重复骗你。"
          : "把三块证据串起来，再保留一句‘还需要确认什么’。";

  const nextDisabled = stage === 0
    ? false
    : stage === 1
      ? work.detail === undefined
      : stage === 2
        ? work.source === undefined
        : stage === 3
          ? work.cross === undefined
          : work.submitted || !canSubmit;

  return (
    <ExperimentFrame
      level="03"
      title="真假侦探社"
      mission="集齐三块可靠证据，拆穿一条可疑信息"
      steps={stageNames}
      current={stage}
      tone="amber"
      guide={guide}
      guideDetail="证据要看三件事：是否相关、来源是否可靠、能否被独立核对。"
      onPrevious={() => setStage((value) => Math.max(0, value - 1))}
      onNext={stage === 4 ? submit : next}
      nextDisabled={nextDisabled}
      nextLabel={stage === 4 ? (work.submitted ? "已保存证据链" : work.attempted ? "修改后再提交" : "提交证据链") : undefined}
      reward="证据猎人徽章"
      complete={work.submitted}
    >
      {stage === 0 && (
        <div className="dx-case-stage">
          <div className="dx-stage-intro"><span>CASE FILES</span><h3>今天想调查哪一案？</h3><p>三份都是教学合成案例，选一份开始。</p></div>
          <div className="dx-case-grid">
            {detectiveCases.map((item, index) => {
              const completed = state.detectiveResults.some((result) => result.caseId === item.id);
              return (
                <button key={item.id} className={`${caseIndex === index ? "active" : ""} ${completed ? "complete" : ""}`} onClick={() => setCaseIndex(index)}>
                  <span>案卷 {String(index + 1).padStart(2, "0")}</span><i>{["▧", "AI", "!"][index]}</i><h3>{item.title}</h3><p>{item.badge}</p><b>{completed ? "✓ 已完成" : caseIndex === index ? "已领取" : "领取案卷"}</b>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stage > 0 && stage < 4 && slotForStage && (
        <div className="dx-evidence-stage">
          <article className="dx-claim-card">
            <header><span>待核验主张</span><b>CASE {String(caseIndex + 1).padStart(2, "0")}</b></header>
            <h3>{activeCase.title}</h3><blockquote>{activeCase.claim}</blockquote><p>{activeCase.content}</p>
          </article>
          <section className="dx-choice-panel">
            <header><span>{slotInfo[slotForStage].icon}</span><div><small>证据 {String(stage).padStart(2, "0")}</small><h3>{slotInfo[slotForStage].title}</h3></div></header>
            <div className="dx-evidence-options">
              {activeCase.evidence[slotForStage].map((option, index) => (
                <button key={option.text} className={work[slotForStage] === index ? "selected" : ""} onClick={() => update({ [slotForStage]: index })}>
                  <span>{work[slotForStage] === index ? "✓" : String.fromCharCode(65 + index)}</span>
                  <div><b>{option.text}</b><small>{work[slotForStage] === index ? option.note : "点击选为本案证据"}</small></div>
                </button>
              ))}
            </div>
            <p className="dx-hint">✦ {slotInfo[slotForStage].hint}</p>
          </section>
        </div>
      )}

      {stage === 4 && (
        <div className="dx-verdict-stage">
          <section className="dx-chain-summary">
            <header><span>证据链</span><b>{slotsComplete}/3</b></header>
            {(["detail", "source", "cross"] as Slot[]).map((slot, index) => (
              <div key={slot}><span>{index + 1}</span><p><b>{["关键细节", "原始来源", "交叉验证"][index]}</b><small>{work[slot] === undefined ? "尚未选择" : activeCase.evidence[slot][work[slot]!].text}</small></p><i>{work[slot] === undefined ? "○" : "✓"}</i></div>
            ))}
          </section>
          <section className="dx-verdict-panel">
            <p>我的结论</p>
            <div className="dx-verdict-choices">{(["可信", "存疑", "错误", "证据不足"] as const).map((item) => <button key={item} disabled={work.submitted} className={work.conclusion === item ? "active" : ""} onClick={() => update({ conclusion: item })}>{work.conclusion === item ? "●" : "○"} {item}</button>)}</div>
            <label>用证据说一句理由<textarea rows={3} disabled={work.submitted} value={work.reasoning} onChange={(event) => update({ reasoning: event.target.value })} placeholder="我认为……，因为……；还需要确认……" /></label>
            {(work.attempted || work.submitted) && <div className={`dx-feedback ${work.submitted ? "correct" : "revise"}`}><span>{work.submitted ? "✓" : "↻"}</span><div><b>{work.submitted ? "判断有依据，证据链已保存！" : "结论和证据还没对上，再检查三块证据"}</b><p>{activeCase.feedback}</p></div></div>}
          </section>
        </div>
      )}
    </ExperimentFrame>
  );
}
