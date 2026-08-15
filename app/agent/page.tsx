"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLearning } from "@/components/learning-provider";
import { agentTemplates } from "@/lib/data";
import type { AgentDesign, AgentModel } from "@/lib/types";

const emptyDesign: AgentDesign = {
  template: "我的校园AI",
  pain: "",
  data: "",
  excludedData: "",
  judgment: "",
  boundary: "",
  model: "轻快对话模型",
  prompt: "",
  welcome: "你好，我可以帮你解决一个校园小问题。",
  plugins: [],
  knowledge: [],
  safety: [false, false, false],
  completed: false,
};

const sections = [
  { id: "identity", title: "角色设定", short: "它是谁", icon: "✦", description: "先告诉它要帮谁、解决什么小麻烦。", tip: "把问题说小一点：一个清楚的任务，比一个什么都做的万能助手更靠谱。" },
  { id: "prompt", title: "提示词", short: "怎么工作", icon: "⌁", description: "用几句话写清楚它应该怎样回答。", tip: "提示词就像给助手的工作说明书：身份、任务、步骤、不能做什么。" },
  { id: "model", title: "模型选择", short: "大脑", icon: "◈", description: "选一台适合任务的 AI 大脑。", tip: "轻快模型像短跑选手，推理模型像会慢慢检查的解题员，图文模型能看图片。" },
  { id: "capabilities", title: "插件与知识库", short: "工具箱", icon: "⊞", description: "给它连接工具和资料，但每一项都要有理由。", tip: "插件是它的手，知识库是它的笔记本；没有用处的能力不要随便打开。" },
  { id: "safety", title: "安全边界", short: "红线", icon: "△", description: "写清楚哪些信息不能拿，什么时候必须交给人。", tip: "AI 能给建议，但不能替老师、家长或专业人员做重要决定。" },
  { id: "publish", title: "运行与发布", short: "试一试", icon: "▶", description: "先在本地沙盒试问，再保存成你的智能体成果。", tip: "先试运行，看看回答是否有依据、有没有越过你写下的红线。" },
] as const;

const modelOptions: Array<{ id: AgentModel; title: string; icon: string; tone: string; speed: string; detail: string; best: string }> = [
  { id: "轻快对话模型", title: "轻快对话", icon: "⚡", tone: "mint", speed: "响应快", detail: "适合查时间、给提醒、做简单问答。", best: "校园导航、通知助手" },
  { id: "推理增强模型", title: "推理增强", icon: "◎", tone: "violet", speed: "会复核", detail: "会拆步骤、比对信息，回答更稳但稍慢。", best: "错题教练、反诈判断" },
  { id: "图文理解模型", title: "图文理解", icon: "▧", tone: "blue", speed: "能看图", detail: "除了文字，还能读懂图片里的线索。", best: "失物匹配、海报检查" },
];

const pluginOptions = [
  { id: "校历与时间", icon: "◷", title: "校历与时间", detail: "查询日期、课间和开放时段。", kind: "校园工具" },
  { id: "校园通知", icon: "◫", title: "校园通知", detail: "读取学校公开发布的通知和临时安排。", kind: "校园工具" },
  { id: "失物登记查询", icon: "⌕", title: "失物登记查询", detail: "在脱敏的失物记录里查找相似物品。", kind: "校园工具" },
  { id: "校园地图", icon: "⌖", title: "校园地图", detail: "帮同学找到楼栋、教室或服务点。", kind: "校园工具" },
  { id: "错题整理", icon: "✎", title: "错题整理", detail: "把主动录入的错题按知识点和错因归类。", kind: "学习工具" },
  { id: "知识点检索", icon: "⌁", title: "知识点检索", detail: "从课程资料里找相关概念。", kind: "学习工具" },
  { id: "风险规则扫描", icon: "!", title: "风险规则扫描", detail: "找出链接、通知里的可疑信号。", kind: "安全工具" },
  { id: "校园通知核验", icon: "✓", title: "校园通知核验", detail: "把可疑消息与学校正式渠道进行核对。", kind: "安全工具" },
];

const knowledgeOptions = [
  { id: "校园安全手册", icon: "▤", title: "校园安全手册", detail: "突发情况、人工接管和求助方式。" },
  { id: "食堂开放规则", icon: "◷", title: "食堂开放规则", detail: "窗口开放时间、用餐区域和错峰说明。" },
  { id: "失物招领规则", icon: "◇", title: "失物招领规则", detail: "登记、候选匹配与人工认领流程。" },
  { id: "校园地图与楼栋表", icon: "⌖", title: "校园地图与楼栋表", detail: "楼栋名称、功能区域和公开服务点。" },
  { id: "校历与校园规则", icon: "▥", title: "校历与校园规则", detail: "开放时间、场所规则和公开流程。" },
  { id: "七年级数学知识点", icon: "∑", title: "七年级数学知识点", detail: "按章节整理的概念、公式和例题索引。" },
  { id: "错题复盘方法", icon: "✎", title: "错题复盘方法", detail: "把错误拆成步骤，而不是直接给答案。" },
  { id: "校园反诈手册", icon: "△", title: "校园反诈手册", detail: "常见骗局、风险信号与正确求助方式。" },
  { id: "常见仿冒通知样例", icon: "◇", title: "仿冒通知样例", detail: "练习识别紧急语气和可疑索取。" },
];

const sampleQuestions = ["现在可以问你什么？", "我该怎么做才安全？", "请说说你的判断依据。"];

function promptFor(design: AgentDesign) {
  return `你是“${design.template || "校园助手"}”。\n你的任务：${design.pain || "帮助同学解决一个清楚的校园问题"}\n工作步骤：先理解问题，再使用必要信息，最后给出简短建议并说明依据。\n回答规则：${design.judgment || "不确定时先说不知道，不要编造答案。"}\n安全边界：${design.boundary || "遇到重要决定或风险情况，提醒用户交给老师、家长或专业人员。"}`;
}

export default function AgentPage() {
  const { state, hydrated, saveAgentDesign, addEvidence } = useLearning();
  const [section, setSection] = useState(0);
  const [design, setDesign] = useState<AgentDesign>(emptyDesign);
  const [generated, setGenerated] = useState(false);
  const [testInput, setTestInput] = useState(sampleQuestions[0]);
  const [testOutput, setTestOutput] = useState("");
  const [runCount, setRunCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || loaded) return;
    if (state.agentDesign) {
      setDesign({ ...emptyDesign, ...state.agentDesign, plugins: state.agentDesign.plugins ?? [], knowledge: state.agentDesign.knowledge ?? [] });
      setGenerated(Boolean(state.agentDesign.completed));
    }
    setLoaded(true);
  }, [hydrated, loaded, state.agentDesign]);

  function commit(next: AgentDesign) {
    const draft = { ...next, completed: false };
    setDesign(draft);
    setGenerated(false);
    saveAgentDesign(draft);
  }

  function update<K extends keyof AgentDesign>(key: K, value: AgentDesign[K]) {
    commit({ ...design, [key]: value });
  }

  function loadTemplate(index: number) {
    const template = agentTemplates[index];
    commit({ ...template, safety: [false, false, false], completed: false });
    setTestOutput("");
    addEvidence({ kind: "设计", title: `选择智能体草案 · ${template.template}`, detail: "载入可编辑的模型、提示词、插件和知识库草案。", route: "/agent" });
  }

  function toggleList(key: "plugins" | "knowledge", id: string) {
    const current = design[key];
    update(key, current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSafety(index: number) {
    const safety: AgentDesign["safety"] = [...design.safety];
    safety[index] = !safety[index];
    update("safety", safety);
  }

  function fillPrompt() {
    update("prompt", promptFor(design));
    addEvidence({ kind: "设计", title: "使用提示词句式助手", detail: "按身份、任务、步骤和安全边界生成一版可编辑草稿。", route: "/agent" });
  }

  function insertPromptLine(line: string) {
    const next = design.prompt.trim() ? `${design.prompt.trim()}\n${line}` : line;
    update("prompt", next);
  }

  function runPreview() {
    const question = testInput.trim() || "请告诉我你能做什么。";
    const toolText = design.plugins.length ? `我会先使用：${design.plugins.join("、")}。` : "我现在没有连接额外插件，只会使用你提供的信息。";
    const knowledgeText = design.knowledge.length ? `我参考的资料：${design.knowledge.join("、")}。` : "我还没有连接知识库，遇到不确定内容会先说明。";
    const answer = design.judgment || "我会先理解问题，再给建议，并说明判断依据。";
    setTestOutput(`收到：“${question}”\n\n${toolText}${knowledgeText}\n\n我的回答方式：${answer}\n\n如果涉及重要决定，我会提醒你找老师、家长或专业人员确认。`);
    setRunCount((value) => value + 1);
  }

  function publish() {
    if (!canPublish || generated) return;
    const completed = { ...design, prompt: design.prompt.trim() || promptFor(design), completed: true };
    setDesign(completed);
    setGenerated(true);
    saveAgentDesign(completed);
    addEvidence({ kind: "设计", title: `发布校园智能体 · ${design.template}`, detail: `模型：${design.model}；插件 ${design.plugins.length} 个；知识库 ${design.knowledge.length} 个；三个安全开关已确认。`, route: "/agent" });
    addEvidence({ kind: "反思", title: "智能体先试运行再发布", detail: `已完成 ${runCount} 次本地预览，重要结果交给人工确认。`, route: "/agent" });
  }

  const identityReady = design.template.trim().length >= 2 && design.pain.trim().length >= 10;
  const promptReady = design.prompt.trim().length >= 30 || (design.pain.trim().length >= 10 && design.judgment.trim().length >= 12);
  const modelReady = Boolean(design.model);
  const capabilitiesReady = design.plugins.length > 0 || design.knowledge.length > 0;
  const safetyReady = design.data.trim().length >= 8 && design.excludedData.trim().length >= 8 && design.boundary.trim().length >= 10 && design.safety.every(Boolean);
  const configReady = identityReady && promptReady && modelReady && capabilitiesReady && safetyReady;
  const sectionValid = [identityReady, promptReady, modelReady, capabilitiesReady, safetyReady, generated || (configReady && runCount > 0)];
  const canPublish = configReady && runCount > 0;
  const completedCount = sectionValid.slice(0, 5).filter(Boolean).length;
  const active = sections[section];
  const promptScore = [design.template, design.pain, design.prompt, design.judgment, design.boundary].filter((item) => item.trim().length >= 10).length;
  const selectedModel = modelOptions.find((item) => item.id === design.model) ?? modelOptions[0];
  const previewName = design.template.trim() || "未命名校园助手";

  return (
    <div className="agent-studio">
      <header className="agent-studio-topbar">
        <div className="agent-studio-brand">
          <Link href="/" className="agent-studio-back" aria-label="返回实验地图">←</Link>
          <span className="agent-studio-mark">⌘</span>
          <div><small>校园制造局 / AGENT STUDIO</small><h1>{previewName}</h1></div>
        </div>
        <div className="agent-studio-top-actions">
          <span className="agent-save-status"><i />{generated ? "已发布到学习成果" : loaded ? "本地草稿自动保存" : "正在读取草稿"}</span>
          <button type="button" className="agent-run-top" onClick={() => { setPreviewOpen(true); runPreview(); }}>▶ 试运行</button>
          <Link href="/" className="agent-exit-link">退出工作台</Link>
        </div>
      </header>

      <div className="agent-studio-layout">
        <nav className="agent-studio-nav" aria-label="智能体配置导航">
          <div className="agent-nav-intro"><span>BUILD YOUR AGENT</span><h2>一步步做出<br /><em>你的校园助手</em></h2><p>像搭积木一样配置，每一块都能撤回。</p></div>
          <div className="agent-progress"><div><b>配置进度</b><span>{completedCount}/5</span></div><i><em style={{ width: `${(completedCount / 5) * 100}%` }} /></i></div>
          <ol>
            {sections.map((item, index) => (
              <li key={item.id} className={`${section === index ? "is-active" : ""} ${sectionValid[index] ? "is-done" : ""}`}>
                <button type="button" onClick={() => setSection(index)} aria-current={section === index ? "step" : undefined}><span>{sectionValid[index] ? "✓" : item.icon}</span><b>{item.title}</b><small>{item.short}</small><i>›</i></button>
              </li>
            ))}
          </ol>
          <div className="agent-nav-tip"><span>?</span><div><b>新手小提示</b><p>{active.tip}</p></div></div>
        </nav>

        <main className="agent-studio-canvas">
          <header className="agent-canvas-head"><div><span>MODULE 0{section + 1} / {active.short}</span><h2>{active.title}</h2><p>{active.description}</p></div><b className={sectionValid[section] ? "is-ready" : ""}>{sectionValid[section] ? "已完成" : "待配置"}</b></header>
          <div className="agent-canvas-body">
            {section === 0 && (
              <div className="agent-identity-grid">
                <section className="agent-panel agent-template-panel"><header><div><span>STARTER KITS</span><h3>先选一个接近的任务</h3></div><small>可随时换</small></header><p className="agent-panel-lead">不用从空白开始，选一个例子再改成自己的版本。</p><div className="agent-template-grid">{agentTemplates.map((template, index) => <button type="button" key={template.template} className={design.template === template.template ? "is-selected" : ""} onClick={() => loadTemplate(index)}><i>{["◴", "⌕", "✎", "!"][index]}</i><span><b>{template.template}</b><small>{["少排队", "快找回", "会复盘", "防骗局"][index]}</small></span><em>{design.template === template.template ? "已载入" : "载入草案"}</em></button>)}</div></section>
                <section className="agent-panel agent-identity-form"><span className="agent-field-kicker">01 / IDENTITY</span><label>给它一个容易记的名字<input aria-label="智能体名字" value={design.template} onChange={(event) => update("template", event.target.value)} placeholder="例如：食堂小导航" /></label><label>它要解决什么小麻烦？<textarea aria-label="要解决的问题" rows={6} value={design.pain} onChange={(event) => update("pain", event.target.value)} placeholder="谁遇到了什么麻烦？它准备怎样帮忙？" /></label><div className="agent-example"><span>句式参考</span><p>“午餐排队太久，同学不知道什么时候去更合适。”</p></div><small className="agent-counter">{design.pain.trim().length}/10 字起</small></section>
              </div>
            )}

            {section === 1 && (
              <div className="agent-prompt-layout"><section className="agent-panel agent-prompt-editor"><header><div><span>INSTRUCTIONS</span><h3>告诉它应该怎样工作</h3></div><button type="button" className="agent-soft-button" onClick={fillPrompt}>✦ 一键生成新手版</button></header><div className="agent-prompt-hint"><span>提示词 = 工作说明书</span><p>把“它是谁、做什么、按什么步骤、不能做什么”写进去，回答就不容易跑偏。</p></div><textarea aria-label="智能体提示词" className="agent-prompt-textarea" value={design.prompt} onChange={(event) => update("prompt", event.target.value)} placeholder="例如：你是校园食堂助手……" /><div className="agent-prompt-toolbar"><b>快速补一句</b><button type="button" onClick={() => insertPromptLine("回答前先复述问题，回答后用一句话说明依据。")}>先说依据</button><button type="button" onClick={() => insertPromptLine("不知道时直接说不知道，不要编造信息。")}>不确定就说不知道</button><button type="button" onClick={() => insertPromptLine("涉及安全、纪律或归属时，提醒找老师确认。")}>重要事交给人</button></div></section><aside className="agent-panel agent-prompt-coach"><div className="agent-score-ring"><b>{promptScore}</b><small>/ 5</small></div><h3>提示词清晰度</h3><p>{promptScore >= 4 ? "很清楚，已经像一份工作说明书。" : "再补一点身份、步骤或边界，助手会更稳。"}</p><ul><li className={design.template ? "on" : ""}>有名字和身份</li><li className={design.pain ? "on" : ""}>知道要解决什么</li><li className={design.judgment ? "on" : ""}>有判断步骤</li><li className={design.boundary ? "on" : ""}>知道什么时候停下</li></ul></aside></div>
            )}

            {section === 2 && (
              <div className="agent-model-stage"><div className="agent-stage-intro"><span>MODEL HUB</span><h3>给它选一台合适的“大脑”</h3><p>不是越强越好，而是和任务匹配。下面的说明可以直接看懂。</p></div><div className="agent-model-grid">{modelOptions.map((model) => <button type="button" key={model.id} className={`agent-model-card agent-model-${model.tone} ${design.model === model.id ? "is-selected" : ""}`} onClick={() => update("model", model.id)}><div className="agent-model-icon">{model.icon}</div><div className="agent-model-copy"><span>{model.speed}</span><h3>{model.title}</h3><p>{model.detail}</p><small>适合：{model.best}</small></div><i>{design.model === model.id ? "✓ 已选择" : "选择"}</i></button>)}</div><div className="agent-model-explain"><span>⌘</span><p>把模型想成发动机：<b>{selectedModel.title}</b>负责理解问题，插件和知识库则决定它手里有什么工具、脑中有什么资料。</p></div></div>
            )}

            {section === 3 && (
              <div className="agent-capability-layout"><section className="agent-panel agent-capability-panel"><header><div><span>PLUGINS / 给它一双手</span><h3>需要哪些工具？</h3></div><b>{design.plugins.length} 已连接</b></header><p className="agent-panel-lead">插件会让它做更多事，但只打开完成任务需要的那几项。</p><div className="agent-option-grid">{pluginOptions.map((plugin) => <button type="button" key={plugin.id} className={design.plugins.includes(plugin.id) ? "is-selected" : ""} onClick={() => toggleList("plugins", plugin.id)} aria-pressed={design.plugins.includes(plugin.id)}><i>{plugin.icon}</i><span><b>{plugin.title}</b><small>{plugin.detail}</small></span><em>{plugin.kind} · {design.plugins.includes(plugin.id) ? "已连接" : "连接"}</em></button>)}</div></section><section className="agent-panel agent-capability-panel agent-knowledge-panel"><header><div><span>KNOWLEDGE / 给它一本笔记</span><h3>它可以参考哪些资料？</h3></div><b>{design.knowledge.length} 已选择</b></header><p className="agent-panel-lead">知识库是它可以查阅的公开资料，不是用来收集同学的隐私。</p><div className="agent-option-grid">{knowledgeOptions.map((item) => <button type="button" key={item.id} className={design.knowledge.includes(item.id) ? "is-selected" : ""} onClick={() => toggleList("knowledge", item.id)} aria-pressed={design.knowledge.includes(item.id)}><i>{item.icon}</i><span><b>{item.title}</b><small>{item.detail}</small></span><em>{design.knowledge.includes(item.id) ? "已放入" : "放入知识库"}</em></button>)}</div></section></div>
            )}

            {section === 4 && (
              <div className="agent-safety-layout"><section className="agent-panel agent-data-panel"><header><span>DATA GATE</span><h3>只拿完成任务必须的信息</h3></header><label><b>可以使用什么？</b><textarea aria-label="必要数据" rows={4} value={design.data} onChange={(event) => update("data", event.target.value)} placeholder="例如：匿名客流总量、窗口是否开放……" /></label><label><b>绝对不收集什么？</b><textarea aria-label="不收集的数据" rows={4} value={design.excludedData} onChange={(event) => update("excludedData", event.target.value)} placeholder="例如：姓名、密码、精确位置……" /></label></section><section className="agent-panel agent-boundary-panel"><header><span>HUMAN HANDOFF</span><h3>什么时候必须交给人？</h3></header><textarea aria-label="人工接管边界" rows={6} value={design.boundary} onChange={(event) => update("boundary", event.target.value)} placeholder="遇到什么情况，AI必须停下并提醒找老师、家长或专业人员？" /><div className="agent-boundary-note">边界不是限制创意，而是让别人敢放心使用。</div></section><section className="agent-panel agent-safety-panel"><header><span>SAFETY GATE</span><h3>三个安全开关</h3></header>{["不收集无关信息", "重要结果由人确认", "明确提示AI会出错"].map((label, index) => <button type="button" role="switch" aria-checked={design.safety[index]} key={label} className={design.safety[index] ? "is-on" : ""} onClick={() => toggleSafety(index)}><i /><span><b>{label}</b><small>{["只用完成任务需要的数据", "安全、纪律和归属不交给AI拍板", "展示依据，也允许反馈纠错"][index]}</small></span><em>{design.safety[index] ? "已开启" : "点击开启"}</em></button>)}</section></div>
            )}

            {section === 5 && (
              <div className="agent-publish-layout"><section className={`agent-panel agent-blueprint-panel ${generated ? "is-ready" : ""}`}><header><div><span>AGENT BLUEPRINT</span><h3>{previewName}</h3></div><b>{generated ? "READY" : "DRAFT"}</b></header><div className="agent-blueprint-badges"><span>{selectedModel.title}</span><span>{design.plugins.length} 个插件</span><span>{design.knowledge.length} 个知识库</span><span>{design.safety.filter(Boolean).length}/3 安全门</span><span>{runCount} 次试运行</span></div><div className="agent-blueprint-list">{[["它要解决", design.pain], ["它怎样回答", design.prompt || design.judgment], ["它不能拿", design.excludedData], ["它何时停下", design.boundary]].map(([label, value], index) => <div key={label}><i>0{index + 1}</i><span><b>{label}</b><small>{value || "还没有填写"}</small></span></div>)}</div></section><aside className="agent-panel agent-publish-side"><div className={`agent-publish-check ${canPublish ? "is-ready" : ""}`}><span>{canPublish ? "✓" : "!"}</span><div><b>{canPublish ? "配置和试运行都完成了" : configReady ? "发布前还差一次试运行" : "还有几块拼图没完成"}</b><p>{canPublish ? "已经检查过一次回答，可以发布到学习成果。" : configReady ? "点击右上角“试运行”，看看它会怎样回答。" : "左侧导航会告诉你还缺什么。"}</p></div></div><button type="button" className="agent-publish-button" onClick={publish} disabled={!canPublish || generated}>{generated ? "✓ 已发布到学习成果" : runCount === 0 && configReady ? "先试运行一次" : "发布智能体"}</button>{generated && <Link href="/results" className="agent-results-link">查看能力图谱 →</Link>}</aside></div>
            )}
          </div>
          <footer className="agent-canvas-footer"><button type="button" onClick={() => setSection((value) => Math.max(0, value - 1))} disabled={section === 0}>← 上一步</button><div><span>{section + 1} / {sections.length}</span><i><em style={{ width: `${((section + 1) / sections.length) * 100}%` }} /></i></div><button type="button" className="agent-next-button" onClick={() => section === 5 ? publish() : setSection((value) => Math.min(5, value + 1))} disabled={section === 5 ? !canPublish || generated : !sectionValid[section]}>{section === 5 ? (generated ? "已发布" : "发布智能体") : "下一步 →"}</button></footer>
        </main>

        <aside className={`agent-studio-preview ${previewOpen ? "is-open" : ""}`} aria-label="智能体运行预览"><header><div><span>LOCAL SANDBOX</span><h2>运行预览</h2></div><b className={generated ? "is-ready" : ""}><i />{generated ? "READY" : "DRAFT"}</b><button type="button" className="agent-preview-close" onClick={() => setPreviewOpen(false)} aria-label="关闭运行预览">×</button></header><div className="agent-preview-app"><span className="agent-preview-avatar">⌘</span><div><b>{previewName}</b><small>{selectedModel.title} · 本地模拟</small></div></div><div className="agent-preview-thread"><div className="agent-preview-message agent-preview-welcome">{design.welcome || "你好，我可以帮你解决一个校园小问题。"}</div>{testOutput && <div className="agent-preview-message agent-preview-user">{testInput}</div>}{testOutput && <div className="agent-preview-message agent-preview-answer">{testOutput}</div>}</div><div className="agent-preview-capabilities"><span>已连接能力</span><div>{design.plugins.slice(0, 3).map((item) => <b key={item}>⌘ {item}</b>)}{design.knowledge.slice(0, 2).map((item) => <b key={item}>▤ {item}</b>)}{!design.plugins.length && !design.knowledge.length && <small>还没有连接工具或资料</small>}</div></div><div className="agent-preview-input"><textarea aria-label="试运行输入" rows={2} value={testInput} onChange={(event) => setTestInput(event.target.value)} /><button type="button" onClick={runPreview}>发送 <span>→</span></button></div><div className="agent-preview-samples"><small>试试这样问</small>{sampleQuestions.map((question) => <button type="button" key={question} onClick={() => { setTestInput(question); setTestOutput(""); }}>{question}</button>)}</div><footer><span>i</span>这是本地教学预览，不会向外发送消息。</footer></aside>
      </div>
    </div>
  );
}
