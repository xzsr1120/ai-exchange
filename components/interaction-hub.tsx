"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type VoiceOption = SpeechSynthesisVoice;

const VOICE_STORAGE_KEY = "ai-lab-preferred-voice";
const MUSIC_STORAGE_KEY = "ai-lab-ambient-enabled";
const reminderLines = [
  "先改一个条件，再看结果怎么变。这样才算在做实验。",
  "把你的发现写成一句话：我改了什么，结果有什么不同？",
  "遇到不确定的答案，先找依据，再决定要不要相信。",
  "可以随时暂停声音。专心思考，比一直听提示更重要。",
];

const routeReminders: Record<string, string> = {
  "/": "先挑一关。每次只改变一个条件，你会更容易看懂AI在做什么。",
  "/emotion": "先收集不同表情，再比较数据多少会不会影响识别结果。",
  "/recommender": "多点几次喜欢，看看推荐内容是不是慢慢变窄了。",
  "/detective": "别急着判真假。先问来源是谁，再找第二份证据核对。",
  "/agent": "先说清楚助手要帮谁、解决什么，再给它选择模型和工具。",
  "/results": "这些不是分数，而是你亲手做过实验、找过证据的记录。",
};

function pickChineseVoice(voices: VoiceOption[]) {
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("zh") && /female|女|xiaoxiao|tingting|mei-jia/i.test(voice.name))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("zh"))
    ?? voices[0];
}

function dispatchVoiceChange(voiceName: string) {
  window.dispatchEvent(new CustomEvent("ai-lab:voice-change", { detail: voiceName }));
}

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  timer: number | null;
};

export function InteractionHub() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.18);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [voiceRate, setVoiceRate] = useState(0.95);
  const [voicePitch, setVoicePitch] = useState(1.08);
  const [speaking, setSpeaking] = useState(false);
  const [reminderIndex, setReminderIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<AudioGraph | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const storedMusic = window.localStorage.getItem(MUSIC_STORAGE_KEY) === "true";
    setMusicOn(false);
    if (storedMusic) showToast("上次使用了氛围音乐，本次仍需点击播放才会启动。");

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
      const preferred = available.find((voice) => voice.name === stored) ?? pickChineseVoice(available);
      if (preferred) setVoiceName(preferred.name);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    const reminderTimer = window.setTimeout(() => {
      showToast("小提醒：完成一步后，记下你观察到的变化。");
    }, 45000);
    const openHub = () => setOpen(true);
    window.addEventListener("ai-lab:open-hub", openHub);

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.removeEventListener("ai-lab:open-hub", openHub);
      window.clearTimeout(reminderTimer);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      stopAmbient();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.master.gain.value = musicVolume;
  }, [musicVolume]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4600);
  }

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = musicVolume;
    master.connect(context.destination);
    audioRef.current = { context, master, timer: null };
    return audioRef.current;
  }

  function playAmbientNote(graph: AudioGraph) {
    const now = graph.context.currentTime;
    const notes = [196, 220, 261.63, 293.66, 329.63, 261.63];
    const frequency = notes[Math.floor(Math.random() * notes.length)];
    const oscillator = graph.context.createOscillator();
    const noteGain = graph.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.12, now + 0.38);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
    oscillator.connect(noteGain);
    noteGain.connect(graph.master);
    oscillator.start(now);
    oscillator.stop(now + 2.9);
  }

  function startAmbient() {
    try {
      const graph = ensureAudio();
      void graph.context.resume();
      playAmbientNote(graph);
      graph.timer = window.setInterval(() => playAmbientNote(graph), 1800);
      setMusicOn(true);
      window.localStorage.setItem(MUSIC_STORAGE_KEY, "true");
      showToast("氛围音乐已开启，音量很轻，不会盖住你的思考。");
    } catch {
      showToast("这个浏览器暂时不能播放氛围音乐，其他功能仍可正常使用。");
    }
  }

  function stopAmbient() {
    const graph = audioRef.current;
    if (!graph) return;
    if (graph.timer) window.clearInterval(graph.timer);
    graph.timer = null;
    void graph.context.suspend();
    setMusicOn(false);
    window.localStorage.setItem(MUSIC_STORAGE_KEY, "false");
  }

  function toggleAmbient() {
    if (musicOn) stopAmbient();
    else startAmbient();
  }

  function chooseVoice(nextName: string) {
    setVoiceName(nextName);
    window.localStorage.setItem(VOICE_STORAGE_KEY, nextName);
    dispatchVoiceChange(nextName);
    const selected = voices.find((voice) => voice.name === nextName);
    showToast(selected ? `已换成「${selected.name}」，可以先试听一句。` : "音色设置已保存。");
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器没有朗读功能，直接看字幕也可以继续。");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    const selected = voices.find((voice) => voice.name === voiceName) ?? pickChineseVoice(voices);
    if (selected) utterance.voice = selected;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function nextReminder() {
    const next = (reminderIndex + 1) % reminderLines.length;
    setReminderIndex(next);
    showToast(reminderLines[next]);
  }

  const activeReminder = reminderIndex === 0 ? (routeReminders[pathname] ?? reminderLines[0]) : reminderLines[reminderIndex];
  const chineseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));

  return (
    <>
      <div className={`interaction-hub ${open ? "is-open" : ""}`}>
        <button type="button" className="interaction-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="interaction-panel" aria-label={open ? "关闭阿界博士互动控制台" : "打开阿界博士互动控制台"}>
          <span className="interaction-avatar" aria-hidden="true">✦</span>
          <span><b>阿界博士</b><small>{musicOn ? "氛围已开启" : "点我调节体验"}</small></span>
          <i aria-hidden="true">{open ? "×" : "⌃"}</i>
        </button>

        {open && <section className="interaction-panel" id="interaction-panel" aria-label="阿界博士互动控制台">
          <header><div><span>AI COMPANION</span><h2>让探索更有感觉</h2></div><b className={musicOn ? "is-live" : ""}><i />{musicOn ? "LIVE" : "READY"}</b></header>
          <div className="interaction-dialog"><span className="interaction-dialog-avatar">✦</span><div><b>阿界博士</b><p>{activeReminder}</p></div></div>

          <div className="interaction-section interaction-music"><div className="interaction-section-title"><span>♫</span><div><b>氛围音乐</b><small>轻轻铺底，默认关闭</small></div><button type="button" className={`interaction-switch ${musicOn ? "is-on" : ""}`} role="switch" aria-checked={musicOn} onClick={toggleAmbient}><i /></button></div><label><span>音量</span><input aria-label="氛围音乐音量" type="range" min="0" max="0.35" step="0.01" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /><b>{Math.round((musicVolume / 0.35) * 100)}%</b></label></div>

          <div className="interaction-section interaction-voice"><div className="interaction-section-title"><span>◒</span><div><b>博士音色</b><small>先试听，找到你喜欢的声音</small></div></div>{chineseVoices.length ? <select aria-label="博士音色" value={voiceName} onChange={(event) => chooseVoice(event.target.value)}>{chineseVoices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select> : <p className="interaction-muted">浏览器没有找到中文音色，将使用系统默认声音。</p>}<div className="interaction-voice-sliders"><label><span>语速</span><input aria-label="博士语速" type="range" min="0.75" max="1.2" step="0.05" value={voiceRate} onChange={(event) => setVoiceRate(Number(event.target.value))} /></label><label><span>音调</span><input aria-label="博士音调" type="range" min="0.8" max="1.3" step="0.05" value={voicePitch} onChange={(event) => setVoicePitch(Number(event.target.value))} /></label></div><button type="button" className={`interaction-preview-button ${speaking ? "is-speaking" : ""}`} onClick={() => speak("你好，我是阿界博士。我们先观察，再动手，发现不确定时就一起找证据。")}>{speaking ? "■ 停止试听" : "▶ 试听这句"}</button></div>

          <div className="interaction-actions"><button type="button" onClick={nextReminder}>↻ 换一条提醒</button><button type="button" onClick={() => speak(activeReminder)}>{speaking ? "■ 停止" : "♬ 听提醒"}</button></div>
          <footer>声音只在你点击后播放，随时可以关闭。</footer>
        </section>}
      </div>
      {toast && <div className="interaction-toast" role="status"><span>✦</span><p>{toast}</p><button type="button" onClick={() => setToast(null)} aria-label="关闭提醒">×</button></div>}
    </>
  );
}
