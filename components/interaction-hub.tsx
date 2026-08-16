"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";

type VoiceOption = SpeechSynthesisVoice;

const VOICE_STORAGE_KEY = "ai-lab-preferred-voice";
const MUSIC_STORAGE_KEY = "ai-lab-ambient-enabled";
const HUB_POSITION_STORAGE_KEY = "ai-lab-hub-position";
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
  step: number;
};

type HubPosition = { left: number; top: number };

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  moved: boolean;
};

const studyChords = [
  [261.63, 329.63, 392, 493.88],
  [220, 261.63, 329.63, 392],
  [174.61, 220, 261.63, 329.63],
  [196, 246.94, 293.66, 392],
];
const studyBass = [130.81, 110, 87.31, 98];
const studyMelody = [
  329.63, null, 392, 493.88, null, 392, 329.63, null,
  329.63, null, 392, 440, null, 392, 329.63, null,
  349.23, null, 440, 523.25, null, 440, 349.23, null,
  293.66, null, 392, 493.88, 440, null, 392, null,
];

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
  const [position, setPosition] = useState<HubPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const audioRef = useRef<AudioGraph | null>(null);
  const toastTimer = useRef<number | null>(null);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const positionRef = useRef<HubPosition | null>(null);
  const ignoreClickRef = useRef(false);

  useEffect(() => {
    const storedMusic = window.localStorage.getItem(MUSIC_STORAGE_KEY) === "true";
    setMusicOn(false);
    if (storedMusic) showToast("上次使用了氛围音乐，本次仍需点击播放才会启动。");
    try {
      const storedPosition = JSON.parse(window.localStorage.getItem(HUB_POSITION_STORAGE_KEY) ?? "null") as HubPosition | null;
      if (storedPosition && Number.isFinite(storedPosition.left) && Number.isFinite(storedPosition.top)) {
        positionRef.current = storedPosition;
        setPosition(storedPosition);
      }
    } catch {
      window.localStorage.removeItem(HUB_POSITION_STORAGE_KEY);
    }

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
    const keepHubOnScreen = () => {
      const current = positionRef.current;
      const hub = hubRef.current;
      if (!current || !hub) return;
      const edge = 8;
      const next = {
        left: Math.min(Math.max(edge, current.left), Math.max(edge, window.innerWidth - hub.offsetWidth - edge)),
        top: Math.min(Math.max(edge, current.top), Math.max(edge, window.innerHeight - hub.offsetHeight - edge)),
      };
      positionRef.current = next;
      setPosition(next);
      window.localStorage.setItem(HUB_POSITION_STORAGE_KEY, JSON.stringify(next));
    };
    window.addEventListener("ai-lab:open-hub", openHub);
    window.addEventListener("resize", keepHubOnScreen);

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.removeEventListener("ai-lab:open-hub", openHub);
      window.removeEventListener("resize", keepHubOnScreen);
      window.clearTimeout(reminderTimer);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      stopAmbient();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.master.gain.value = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const current = positionRef.current;
      const hub = hubRef.current;
      if (!current || !hub) return;
      const edge = 8;
      const next = {
        left: Math.min(Math.max(edge, current.left), Math.max(edge, window.innerWidth - hub.offsetWidth - edge)),
        top: Math.min(Math.max(edge, current.top), Math.max(edge, window.innerHeight - hub.offsetHeight - edge)),
      };
      positionRef.current = next;
      setPosition(next);
      window.localStorage.setItem(HUB_POSITION_STORAGE_KEY, JSON.stringify(next));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4600);
  }

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const context = new AudioContext();
    const master = context.createGain();
    const warmth = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    master.gain.value = musicVolume;
    warmth.type = "lowpass";
    warmth.frequency.value = 5200;
    warmth.Q.value = 0.55;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.35;
    master.connect(warmth);
    warmth.connect(compressor);
    compressor.connect(context.destination);
    audioRef.current = { context, master, timer: null, step: 0 };
    return audioRef.current;
  }

  function playTone(graph: AudioGraph, frequency: number, duration: number, volume: number, type: OscillatorType = "triangle", startOffset = 0) {
    const now = graph.context.currentTime + startOffset;
    const oscillator = graph.context.createOscillator();
    const noteGain = graph.context.createGain();
    const filter = graph.context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.detune.setValueAtTime(-3 + Math.random() * 6, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(780, now + duration);
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(graph.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
  }

  function playPad(graph: AudioGraph, chord: number[]) {
    chord.forEach((frequency, index) => playTone(graph, frequency, 3.25, index === 0 ? 0.026 : 0.018, "sine", index * 0.014));
  }

  function playKick(graph: AudioGraph) {
    const now = graph.context.currentTime;
    const oscillator = graph.context.createOscillator();
    const gain = graph.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(118, now);
    oscillator.frequency.exponentialRampToValueAtTime(46, now + 0.16);
    gain.gain.setValueAtTime(0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    oscillator.connect(gain);
    gain.connect(graph.master);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  function playNoise(graph: AudioGraph, kind: "hat" | "snare") {
    const duration = kind === "hat" ? 0.045 : 0.12;
    const length = Math.ceil(graph.context.sampleRate * duration);
    const buffer = graph.context.createBuffer(1, length, graph.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) samples[index] = Math.random() * 2 - 1;
    const source = graph.context.createBufferSource();
    const filter = graph.context.createBiquadFilter();
    const gain = graph.context.createGain();
    source.buffer = buffer;
    filter.type = kind === "hat" ? "highpass" : "bandpass";
    filter.frequency.value = kind === "hat" ? 6200 : 1800;
    filter.Q.value = kind === "hat" ? 0.7 : 1.2;
    gain.gain.setValueAtTime(kind === "hat" ? 0.018 : 0.052, graph.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, graph.context.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(graph.master);
    source.start();
  }

  function playStudyBeat(graph: AudioGraph) {
    const step = graph.step % studyMelody.length;
    const withinBar = step % 8;
    const chordIndex = Math.floor(step / 8) % studyChords.length;
    if (withinBar === 0) playPad(graph, studyChords[chordIndex]);
    if (withinBar === 0 || withinBar === 4) playKick(graph);
    if (withinBar === 2 || withinBar === 6) playNoise(graph, "snare");
    playNoise(graph, "hat");
    if ([0, 3, 4, 6].includes(withinBar)) playTone(graph, studyBass[chordIndex], 0.42, 0.06, "triangle");
    const melodyNote = studyMelody[step];
    if (melodyNote) playTone(graph, melodyNote, 0.28, 0.045, "triangle", 0.018);
    graph.step = (graph.step + 1) % studyMelody.length;
  }

  function startAmbient() {
    try {
      const graph = ensureAudio();
      void graph.context.resume();
      graph.step = 0;
      playStudyBeat(graph);
      graph.timer = window.setInterval(() => playStudyBeat(graph), 366);
      setMusicOn(true);
      window.localStorage.setItem(MUSIC_STORAGE_KEY, "true");
      showToast("“放学后的实验室”已开启：82 BPM 校园 Lo-Fi，适合边做边想。");
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

  function applyHubPosition(next: HubPosition, persist = false) {
    positionRef.current = next;
    setPosition(next);
    if (persist) window.localStorage.setItem(HUB_POSITION_STORAGE_KEY, JSON.stringify(next));
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = hubRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const hub = hubRef.current;
    if (!drag || !hub || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return;
    drag.moved = true;
    const edge = 8;
    applyHubPosition({
      left: Math.min(Math.max(edge, drag.left + deltaX), Math.max(edge, window.innerWidth - hub.offsetWidth - edge)),
      top: Math.min(Math.max(edge, drag.top + deltaY), Math.max(edge, window.innerHeight - hub.offsetHeight - edge)),
    });
    event.preventDefault();
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved && positionRef.current) {
      window.localStorage.setItem(HUB_POSITION_STORAGE_KEY, JSON.stringify(positionRef.current));
      ignoreClickRef.current = true;
      window.setTimeout(() => { ignoreClickRef.current = false; }, 0);
    }
    dragRef.current = null;
    setDragging(false);
  }

  function togglePanel() {
    if (ignoreClickRef.current) return;
    setOpen((value) => !value);
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
      <div ref={hubRef} className={`interaction-hub ${open ? "is-open" : ""} ${dragging ? "is-dragging" : ""}`} style={position ? { left: position.left, top: position.top, right: "auto", bottom: "auto" } : undefined}>
        <button type="button" className="interaction-launcher" onClick={togglePanel} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} aria-expanded={open} aria-controls="interaction-panel" aria-label={open ? "关闭阿界博士互动控制台" : "打开或拖动阿界博士互动控制台"} title="点击打开，按住可以拖动">
          <span className="interaction-avatar" aria-hidden="true">✦</span>
          <span><b>阿界博士</b><small>{musicOn ? "Lo-Fi 正在播放" : "点击打开 · 按住拖动"}</small></span>
          <i aria-hidden="true">{open ? "×" : "⌃"}</i>
        </button>

        {open && <section className="interaction-panel" id="interaction-panel" aria-label="阿界博士互动控制台">
          <header><div><span>AI COMPANION</span><h2>让探索更有感觉</h2></div><div className="interaction-panel-tools"><b className={`interaction-panel-status ${musicOn ? "is-live" : ""}`}><i />{musicOn ? "LIVE" : "READY"}</b><button type="button" className="interaction-drag-handle" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} aria-label="拖动互动控制台" title="按住拖动">⠿</button></div></header>
          <div className="interaction-dialog"><span className="interaction-dialog-avatar">✦</span><div><b>阿界博士</b><p>{activeReminder}</p></div></div>

          <div className="interaction-section interaction-music"><div className="interaction-section-title"><span>♫</span><div><b>校园 Lo-Fi</b><small>82 BPM · 暖和弦 + 轻鼓点</small></div><button type="button" className={`interaction-switch ${musicOn ? "is-on" : ""}`} role="switch" aria-checked={musicOn} onClick={toggleAmbient}><i /></button></div><div className="interaction-track"><span>NOW PLAYING</span><b>放学后的实验室</b><small>原创生成 · 无人声 · 适合学习</small></div><label><span>音量</span><input aria-label="校园 Lo-Fi 音量" type="range" min="0" max="0.35" step="0.01" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /><b>{Math.round((musicVolume / 0.35) * 100)}%</b></label></div>

          <div className="interaction-section interaction-voice"><div className="interaction-section-title"><span>◒</span><div><b>博士音色</b><small>先试听，找到你喜欢的声音</small></div></div>{chineseVoices.length ? <select aria-label="博士音色" value={voiceName} onChange={(event) => chooseVoice(event.target.value)}>{chineseVoices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select> : <p className="interaction-muted">浏览器没有找到中文音色，将使用系统默认声音。</p>}<div className="interaction-voice-sliders"><label><span>语速</span><input aria-label="博士语速" type="range" min="0.75" max="1.2" step="0.05" value={voiceRate} onChange={(event) => setVoiceRate(Number(event.target.value))} /></label><label><span>音调</span><input aria-label="博士音调" type="range" min="0.8" max="1.3" step="0.05" value={voicePitch} onChange={(event) => setVoicePitch(Number(event.target.value))} /></label></div><button type="button" className={`interaction-preview-button ${speaking ? "is-speaking" : ""}`} onClick={() => speak("你好，我是阿界博士。我们先观察，再动手，发现不确定时就一起找证据。")}>{speaking ? "■ 停止试听" : "▶ 试听这句"}</button></div>

          <div className="interaction-actions"><button type="button" onClick={nextReminder}>↻ 换一条提醒</button><button type="button" onClick={() => speak(activeReminder)}>{speaking ? "■ 停止" : "♬ 听提醒"}</button></div>
          <footer>⠿ 按住顶部可以拖动 · 声音只在点击后播放</footer>
        </section>}
      </div>
      {toast && <div className="interaction-toast" role="status"><span>✦</span><p>{toast}</p><button type="button" onClick={() => setToast(null)} aria-label="关闭提醒">×</button></div>}
    </>
  );
}
