"use client";

import Link from "next/link";
import { GuideAssistant } from "./guide-assistant";

type ExperimentFrameProps = {
  level: string;
  title: string;
  mission: string;
  steps: string[];
  current: number;
  tone?: "blue" | "violet" | "amber" | "green";
  guide: string;
  guideDetail?: string;
  children: React.ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextHref?: string;
  reward?: string;
  complete?: boolean;
};

export function ExperimentFrame({
  level,
  title,
  mission,
  steps,
  current,
  tone = "blue",
  guide,
  guideDetail,
  children,
  onPrevious,
  onNext,
  nextDisabled = false,
  nextLabel,
  nextHref,
  reward = "+20 探索值",
  complete = false,
}: ExperimentFrameProps) {
  const last = current === steps.length - 1;
  const actionLabel = nextLabel ?? (last ? "完成本关" : "下一步");

  return (
    <div className={`mission-screen mission-${tone}`}>
      <header className={`mission-brief ${complete ? "is-complete" : ""}`}>
        <Link className="mission-back" href="/" aria-label="返回实验地图">←</Link>
        <div className="mission-level"><span>{level}</span><small>MISSION</small></div>
        <div className="mission-heading"><p>{mission}</p><h1>{title}</h1></div>
        <div className="mission-reward"><span>{complete ? "挑战完成" : "本关奖励"}</span><b>{complete ? "✓ 已收入战绩" : `✦ ${reward}`}</b></div>
      </header>

      <ol className="mission-stepper" aria-label="实验步骤">
        {steps.map((step, index) => (
          <li key={step} className={index < current || (complete && index === current) ? "done" : index === current ? "active" : ""} aria-current={index === current ? "step" : undefined}>
            <span>{index < current || (complete && index === current) ? "✓" : index + 1}</span><b>{step}</b>
          </li>
        ))}
      </ol>

      <div className="mission-workspace">
        <section className="mission-stage" aria-labelledby="current-step-title">
          <header className="mission-stage-header">
            <div><span>STEP {String(current + 1).padStart(2, "0")}</span><h2 id="current-step-title">{steps[current]}</h2></div>
            <small>完成当前任务，解锁下一步</small>
          </header>
          <div className="mission-stage-body">{children}</div>
        </section>
        <GuideAssistant message={guide} detail={guideDetail} />
      </div>

      <footer className="mission-footer">
        <button type="button" className="mission-prev" onClick={onPrevious} disabled={current === 0 || !onPrevious}>← 上一步</button>
        <div className="mission-footer-progress"><span><i style={{ width: `${((current + 1) / steps.length) * 100}%` }} /></span><b>{current + 1} / {steps.length}</b></div>
        {nextHref ? (
          <Link className={`mission-next ${nextDisabled ? "is-disabled" : ""}`} href={nextDisabled ? "#" : nextHref} aria-disabled={nextDisabled} onClick={(event) => nextDisabled && event.preventDefault()}>{actionLabel} <span>→</span></Link>
        ) : (
          <button type="button" className="mission-next" onClick={onNext} disabled={nextDisabled}>{actionLabel} <span>→</span></button>
        )}
      </footer>
    </div>
  );
}
