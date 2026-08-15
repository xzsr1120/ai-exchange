import type { AgentDesign, DetectiveResult } from "./types";

export type DetectiveCase = {
  id: string;
  badge: string;
  title: string;
  claim: string;
  content: string;
  expected: DetectiveResult["conclusion"];
  feedback: string;
  evidence: {
    detail: Array<{ text: string; quality: number; note: string }>;
    source: Array<{ text: string; quality: number; note: string }>;
    cross: Array<{ text: string; quality: number; note: string }>;
  };
};

export const detectiveCases: DetectiveCase[] = [
  {
    id: "poster",
    badge: "教学合成海报",
    title: "AI生成校园海报",
    claim: "学校将于 6 月 31 日举行‘星海科技节’，扫码即可报名。",
    content: "海报色彩精美、校徽相似，但日期写着不存在的 6 月 31 日，二维码下方没有主办部门。",
    expected: "存疑",
    feedback: "不存在的日期是强疑点，但视觉异常本身不能证明海报一定由AI生成；在正式渠道没有发布前，应保持存疑。",
    evidence: {
      detail: [
        { text: "日期写成不存在的 6 月 31 日", quality: 3, note: "与主张直接相关的强线索" },
        { text: "背景星星看起来很梦幻", quality: 1, note: "审美感受不能证明真伪" },
      ],
      source: [
        { text: "未标注主办部门，二维码也无法追溯", quality: 3, note: "来源缺失，需要保持怀疑" },
        { text: "同学群里转发了很多次", quality: 1, note: "转发次数不等于来源可靠" },
      ],
      cross: [
        { text: "学校官网与公众号均没有该活动通知", quality: 3, note: "两个正式渠道相互印证" },
        { text: "问了一位同桌，他也没听说", quality: 1, note: "单个同学不是独立权威来源" },
      ],
    },
  },
  {
    id: "answer",
    badge: "教学合成回答",
    title: "看似正确的AI知识回答",
    claim: "AI回答：‘植物在夜间只进行呼吸作用，不会进行任何光合作用。该结论见《中学生物新论》林海，2022。’",
    content: "表述流畅、带有书名和作者，但图书馆目录查不到该书；教材说明光合作用取决于是否有光，而不是简单取决于昼夜。",
    expected: "错误",
    feedback: "引用无法核实，且教材与独立科普资料都指出关键条件是‘光照’。看似专业的引用不能替代可追溯证据。",
    evidence: {
      detail: [
        { text: "回答使用‘只、任何’等绝对化表述", quality: 2, note: "是可疑线索，但不能单独定论" },
        { text: "句子很通顺，还有书名号", quality: 1, note: "流畅与格式不是事实证据" },
      ],
      source: [
        { text: "图书馆目录与出版社检索均无此书", quality: 3, note: "原始引用无法追溯" },
        { text: "搜索结果里有人复制了同一句话", quality: 1, note: "重复内容可能来自同一错误来源" },
      ],
      cross: [
        { text: "教材和两家独立科普机构均说明关键条件是光照", quality: 3, note: "可靠且相互独立的交叉验证" },
        { text: "让另一个聊天机器人再回答一次", quality: 1, note: "另一个模型回答不是可靠事实来源" },
      ],
    },
  },
  {
    id: "notice",
    badge: "教学合成通知",
    title: "非正式渠道的校园通知",
    claim: "群聊截图：‘明天统一停课，点击短链接填写姓名和家长手机号确认。教务处。’",
    content: "截图没有学校抬头，短链接域名与学校官网不一致，还要求提交与停课确认无关的联系方式。",
    expected: "错误",
    feedback: "正式渠道明确辟谣，域名与信息收集也异常。不要点击可疑链接，应向教师或学校正式渠道核实。",
    evidence: {
      detail: [
        { text: "无正式抬头，短链接要求填写无关个人信息", quality: 3, note: "同时涉及格式与隐私风险" },
        { text: "截图用了红色感叹号", quality: 1, note: "颜色不能判断通知真伪" },
      ],
      source: [
        { text: "只在非官方群聊传播，域名并非学校域名", quality: 3, note: "发布渠道和域名都不匹配" },
        { text: "转发人头像看起来像老师", quality: 1, note: "头像可复制，不能证明身份" },
      ],
      cross: [
        { text: "班主任与学校官网均确认正常上课", quality: 3, note: "正式渠道的独立核对" },
        { text: "在另一个群里也看到了截图", quality: 1, note: "重复传播仍可能来自同一来源" },
      ],
    },
  },
];

export const agentTemplates: Omit<AgentDesign, "safety" | "completed">[] = [
  {
    template: "食堂错峰",
    pain: "午餐高峰排队时间长，学生难以选择更合适的到达时段。",
    data: "各时段匿名客流总量、窗口开放状态、餐厅容量。",
    excludedData: "不收集姓名、班级、个人位置轨迹。",
    judgment: "比较近几日同星期的匿名客流，给出低/中/高拥挤提示和依据。",
    boundary: "建议不替代现场安全管理；突发拥挤由值班教师确认并接管。",
    model: "轻快对话模型",
    prompt: "你是校园食堂小助手。只根据匿名客流和窗口状态回答，先给结论，再用一句话说明依据。遇到突发拥挤时提醒联系值班老师。",
    welcome: "你好，我可以帮你看看哪个时段更不拥挤。",
    plugins: ["校历与时间", "校园通知"],
    knowledge: ["食堂开放规则", "校园安全手册"],
  },
  {
    template: "失物匹配",
    pain: "失物描述分散，寻找者很难快速找到相似物品。",
    data: "物品类别、颜色、发现区域、模糊时间段、可公开特征。",
    excludedData: "隐藏姓名、联系方式、证件号码和物品内的私人内容。",
    judgment: "按类别、颜色、地点和时间计算相似度，只给出候选列表与匹配依据。",
    boundary: "认领必须由失物招领处人工核验独有特征，AI不能直接决定归属。",
    model: "图文理解模型",
    prompt: "你是失物匹配助手。把用户主动提供的物品描述整理成类别、颜色、地点和时间，再给出候选物品与匹配理由。不要猜测身份。",
    welcome: "可以把物品的颜色、类别和大概地点告诉我，我帮你找相似记录。",
    plugins: ["失物登记查询", "校园地图"],
    knowledge: ["失物招领规则", "校园地图与楼栋表"],
  },
  {
    template: "错题教练",
    pain: "同类错误反复出现，学生难以看清自己的知识薄弱点。",
    data: "学生主动录入的题型、错误步骤和知识点标签。",
    excludedData: "不收集姓名、成绩排名、家庭信息或与错题无关的内容。",
    judgment: "归纳错误类型，展示相似例题思路和对应知识点，不直接代写答案。",
    boundary: "知识结论由学生对照教材核验；连续异常由教师提供个别指导。",
    model: "推理增强模型",
    prompt: "你是错题教练。先问学生卡在哪一步，再把错误归类，给一个相似例题的思路，不直接写出整道题答案。每次都提醒学生对照教材核验。",
    welcome: "把错题步骤发给我，我们一起找出卡住的那一步。",
    plugins: ["错题整理", "知识点检索"],
    knowledge: ["七年级数学知识点", "错题复盘方法"],
  },
  {
    template: "校园反诈",
    pain: "学生可能因紧急语气和仿冒页面误点可疑通知或链接。",
    data: "用户主动粘贴的脱敏文本、链接域名和公开的风险规则。",
    excludedData: "不上传账号、密码、验证码、真实姓名或完整聊天记录。",
    judgment: "标记异常域名、索要敏感信息和紧急转账等风险信号，并公开判断依据。",
    boundary: "只做风险提示；涉及财产或人身安全时立即转交教师、家长或警方。",
    model: "推理增强模型",
    prompt: "你是校园反诈提醒助手。只分析用户主动粘贴的脱敏文本和域名，逐条指出风险信号与依据。不要要求账号、密码、验证码，遇到财产或人身风险时建议联系老师、家长或警方。",
    welcome: "把可疑通知里的文字和域名脱敏后发给我，我帮你找风险信号。",
    plugins: ["风险规则扫描", "校园通知核验"],
    knowledge: ["校园反诈手册", "常见仿冒通知样例"],
  },
];
