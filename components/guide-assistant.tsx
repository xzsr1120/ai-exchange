"use client";

import { useEffect, useState } from "react";

type GuideAssistantProps = {
  message: string;
  detail?: string;
  name?: string;
  compact?: boolean;
};

export function GuideAssistant({
  message,
  detail,
  name = "阿界博士",
  compact = false,
}: GuideAssistantProps) {
  const [speaking, setSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    setSpeaking(false);
    setExpanded(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [message, detail]);

  function toggleSpeech() {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${name}提示：${message}${detail ? `。${detail}` : ""}`,
      );
      utterance.lang = "zh-CN";
      utterance.rate = 0.94;
      utterance.pitch = 1.04;
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"));
      if (chineseVoice) utterance.voice = chineseVoice;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    } catch {
      setSupported(false);
      setSpeaking(false);
    }
  }

  return (
    <aside className={`guide-assistant ${compact ? "guide-compact" : ""}`} aria-label={`${name}学习引导`}>
      <div className="guide-character" aria-hidden="true">
        <span className="guide-antenna" />
        <span className="guide-ear guide-ear-left" />
        <span className="guide-ear guide-ear-right" />
        <span className="guide-face"><i /><i /><b /></span>
        <span className="guide-body"><i /></span>
        <span className="guide-shadow" />
      </div>
      <div className="guide-copy">
        <div className="guide-name"><span>AI 导航员</span><b>{name}</b></div>
        <p aria-live="polite">{message}</p>
        {detail && expanded && <small>{detail}</small>}
        <div className="guide-actions">
          <button type="button" className={speaking ? "is-speaking" : ""} onClick={toggleSpeech} disabled={!supported}>
            <span>{speaking ? "■" : "▶"}</span>{speaking ? "停止" : "听博士讲"}
          </button>
          {detail && <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起字幕" : "展开字幕"}</button>}
        </div>
        {!supported && <small className="guide-unsupported">当前浏览器不能朗读，请直接看助手提示。</small>}
      </div>
    </aside>
  );
}
