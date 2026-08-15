"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ExperimentFrame } from "@/components/experiment-frame";
import { ExpressionFace } from "@/components/expression-face";
import { EmotionCamera } from "@/components/emotion-camera";
import { useLearning } from "@/components/learning-provider";
import {
  emotionLabels,
  emotionTrainingSamples,
  buildEmotionTrainingSet,
  runEmotionModel,
  type EmotionSample,
  type EmotionConfig,
} from "@/lib/algorithms";
import type { EmotionLabel, FeatureVector } from "@/lib/types";
import { analyzeExpressionImage, extractExpressionFeatures, type ImageExpressionResult } from "@/lib/image-emotion";

const missionSteps = ["接受挑战", "采集训练集", "训练模型", "真人挑战", "实验报告"];
const happySample = emotionTrainingSamples.find((item) => item.id === "h2")!;
const maskedSmileSample = emotionTrainingSamples.find((item) => item.id === "m2")!;
const featureKeys = ["eyes", "brows", "mouth"] as const;
type UserExpressionSample = { id: string; image: string; label: EmotionLabel; features: FeatureVector };

export default function EmotionPage() {
  const { addEvidence, saveEmotionReport } = useLearning();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<EmotionConfig>({ sampleSize: "large", diversity: "diverse", labelOverrides: {} });
  const [prediction, setPrediction] = useState("");
  const [predictionSaved, setPredictionSaved] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [reportReady, setReportReady] = useState(false);
  const [captureImage, setCaptureImage] = useState("");
  const [captureLabel, setCaptureLabel] = useState<EmotionLabel | null>(null);
  const [userSamples, setUserSamples] = useState<UserExpressionSample[]>([]);
  const [savingSample, setSavingSample] = useState(false);
  const [sampleError, setSampleError] = useState("");
  const [modelTrained, setModelTrained] = useState(false);
  const [training, setTraining] = useState(false);
  const [scanImage, setScanImage] = useState("");
  const [scanResult, setScanResult] = useState<ImageExpressionResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const nextUserId = useRef(1);

  const baseline = useMemo(() => runEmotionModel({ sampleSize: "large", diversity: "diverse" }), []);
  const userModelSamples = useMemo<EmotionSample[]>(() => userSamples.map((sample) => ({
    id: sample.id,
    label: sample.label,
    features: sample.features,
    note: "本地采集的真人贴标签样本",
  })), [userSamples]);
  const modelConfig = useMemo<EmotionConfig>(() => ({ ...config, additionalSamples: userModelSamples }), [config, userModelSamples]);
  const metrics = useMemo(() => runEmotionModel(modelConfig), [modelConfig]);
  const trainingSet = useMemo(() => buildEmotionTrainingSet(modelConfig), [modelConfig]);
  const builtInSampleCount = trainingSet.length - userSamples.length;
  const removedSampleCount = emotionTrainingSamples.length - builtInSampleCount;
  const trainingRecipe = `${builtInSampleCount} 张内置${userSamples.length ? ` + ${userSamples.length} 张真人` : ""}`;
  const variableSummary = `${config.sampleSize === "large" ? "较多" : "少量"}内置样本 + ${userSamples.length}张真人样本 / ${config.diversity === "diverse" ? "多样" : "单一"}覆盖 / ${metrics.labelErrors ? `${metrics.labelErrors}个错误标签` : "正确标签"}`;
  const modelReadiness = Math.min(96, 64 + metrics.sampleCount + userSamples.length * 3 - metrics.labelErrors * 8 - (config.diversity === "narrow" ? 6 : 0));

  useEffect(() => {
    if (!scanImage) setScanResult(null);
  }, [scanImage]);

  function updateVariable(next: EmotionConfig, detail: string) {
    const before = metrics.accuracy;
    const after = runEmotionModel({ ...next, additionalSamples: userModelSamples }).accuracy;
    setConfig(next);
    setModelTrained(false);
    setScanResult(null);
    setReportReady(false);
    addEvidence({ kind: "变量", title: "改变表情模型训练条件", detail: `${detail}，测试准确率 ${before}% → ${after}%`, route: "/emotion" });
  }

  function injectWrongLabels() {
    updateVariable(
      { ...config, labelOverrides: { h2: "紧张笑容", s2: "低落" } },
      "注入 2 个错误标签（其他条件不变）",
    );
  }

  function savePrediction() {
    if (!prediction.trim()) return;
    setPredictionSaved(true);
    addEvidence({ kind: "预测", title: "表情模型初始预测", detail: prediction.trim(), route: "/emotion" });
  }

  function generateReport() {
    if (!predictionSaved || explanation.trim().length < 8) return;
    saveEmotionReport({
      prediction,
      variable: variableSummary,
      beforeAccuracy: baseline.accuracy,
      afterAccuracy: metrics.accuracy,
      confidence: metrics.averageConfidence,
      explanation: explanation.trim(),
      sampleSize: metrics.sampleCount,
      diversity: config.diversity === "diverse" ? "多样" : "单一",
      labelErrors: metrics.labelErrors,
      realSampleCount: userSamples.length,
      scanCount,
      scanLabel: scanResult?.label,
      scanConfidence: scanResult?.confidence,
    });
    addEvidence({ kind: "反思", title: "生成模型测试报告", detail: explanation.trim(), route: "/emotion" });
    setReportReady(true);
  }

  async function saveCapturedSample() {
    if (!captureImage || !captureLabel) return;
    setSavingSample(true);
    setSampleError("");
    try {
      const features = await extractExpressionFeatures(captureImage);
      const sample = { id: `U${nextUserId.current++}`, image: captureImage, label: captureLabel, features };
      setUserSamples((current) => [...current, sample].slice(-8));
      setCaptureImage("");
      setCaptureLabel(null);
      setModelTrained(false);
      setScanResult(null);
      setReportReady(false);
      addEvidence({ kind: "变量", title: "采集真人训练样本", detail: `${sample.id} 已贴标签“${sample.label}”并提取本地特征，照片仅保留在当前页面内存。`, route: "/emotion" });
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "图片分析失败，请换一张正脸照片。");
    } finally {
      setSavingSample(false);
    }
  }

  async function scanExpression() {
    if (!scanImage || !modelTrained) return;
    setScanning(true);
    setScanError("");
    try {
      const result = await analyzeExpressionImage(scanImage, trainingSet);
      setScanResult(result);
      setScanCount((count) => count + 1);
      setReportReady(false);
      addEvidence({ kind: "预测", title: "真人未见样本挑战", detail: `本地教学分类器判断为“${result.label}”，匹配度 ${result.confidence}%`, route: "/emotion" });
    } catch (error) {
      setScanResult(null);
      setScanError(error instanceof Error ? error.message : "扫描失败，请换一张清晰的单人正脸照片。");
    } finally {
      setScanning(false);
    }
  }

  async function trainCurrentModel() {
    if (training) return;
    setTraining(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setTraining(false);
    setModelTrained(true);
    setScanResult(null);
    setReportReady(false);
    addEvidence({ kind: "变量", title: "训练真人表情模型", detail: `${metrics.sampleCount} 张样本参与训练，模型准备度 ${modelReadiness}%。`, route: "/emotion" });
  }

  function renderPredictionStep() {
    return (
      <div className="mission-content fx-prediction-step">
        <div className="fx-step-lead">
          <span className="fx-step-kicker">挑战 01</span>
          <h3>同样是笑，AI 能看出区别吗？</h3>
          <p>先留下猜想，实验结束后再回来核对。</p>
        </div>

        <div className="fx-prediction-grid">
          <div className="fx-face-duel" aria-label="自然笑容与紧张笑容表情对照">
            <article className="fx-face-card">
              <span>A</span>
              <ExpressionFace label={happySample.label} features={happySample.features} size={118} />
              <b>自然笑容</b>
              <small>眼睛放松 · 嘴角上扬</small>
            </article>
            <div className="fx-versus">VS</div>
            <article className="fx-face-card fx-face-card-warm">
              <span>B</span>
              <ExpressionFace label={maskedSmileSample.label} features={maskedSmileSample.features} size={118} />
              <b>勉强笑容</b>
              <small>眼睛紧张 · 嘴角上扬</small>
            </article>
          </div>

          <div className="fx-prediction-form">
            <label htmlFor="emotion-prediction">我的预测</label>
            <textarea
              id="emotion-prediction"
              className="fx-textarea"
              rows={3}
              value={prediction}
              onChange={(event) => {
                setPrediction(event.target.value);
                setPredictionSaved(false);
                setReportReady(false);
              }}
              placeholder="例如：不一定，因为嘴角相似，但眼睛特征不同。"
            />
            <button type="button" className="fx-lock-button" onClick={savePrediction} disabled={!prediction.trim()}>
              {predictionSaved ? "✓ 预测已记录，可继续修改" : "锁定我的预测"}
            </button>
            <small className={predictionSaved ? "fx-save-tip fx-is-ready" : "fx-save-tip"}>
              {predictionSaved ? "已存入学习证据" : "写一句话就能解锁下一步"}
            </small>
          </div>
        </div>
      </div>
    );
  }

  function renderSampleStep() {
    return (
      <div className="mission-content real-collect-step">
        <div className="fx-step-lead fx-step-lead-inline">
          <div><span className="fx-step-kicker">DATA STUDIO</span><h3>自己拍、自己标，造一组真人训练数据</h3></div>
          <p>每增加一张，样本计数就会真实变化。</p>
        </div>
        <div className="real-collect-layout">
          <EmotionCamera mode="capture" image={captureImage} onImage={(image) => { setCaptureImage(image); setCaptureLabel(null); setSampleError(""); setReportReady(false); }} />
          <section className="real-label-console">
            <header><div><span>STEP 02</span><h3>给照片贴上你认为正确的标签</h3></div><b>{userSamples.length} / 3</b></header>
            <div className="real-label-buttons">
              {emotionLabels.map((label) => <button type="button" key={label} disabled={!captureImage} className={captureLabel === label ? "is-active" : ""} onClick={() => setCaptureLabel(label)}><ExpressionFace label={label} features={emotionTrainingSamples.find((sample) => sample.label === label)!.features} size={42} /><span>{label}</span></button>)}
            </div>
            <button type="button" className="real-save-sample" disabled={!captureImage || !captureLabel || savingSample} onClick={saveCapturedSample}>{savingSample ? "正在提取特征…" : "＋ 加入训练集"}</button>
            {sampleError && <p className="real-operation-error" role="alert">{sampleError}</p>}
            <div className="real-count-board">
              {emotionLabels.map((label) => <div key={label}><span>{label}</span><b>{emotionTrainingSamples.filter((sample) => sample.label === label).length + userSamples.filter((sample) => sample.label === label).length}</b><i><em style={{ width: `${Math.min(100, (userSamples.filter((sample) => sample.label === label).length / 3) * 100)}%` }} /></i></div>)}
            </div>
          </section>
        </div>
        <div className="real-sample-strip">
          <header><b>我的真人样本</b><small>{userSamples.length ? "点击 × 可删除重采" : "先采集至少 1 张；推荐 3 张不同表情"}</small></header>
          <div>{userSamples.map((sample) => <article key={sample.id}><Image unoptimized src={sample.image} alt={`${sample.label}真人训练样本`} width={62} height={40} style={{ width: "100%", height: "auto" }} /><span>{sample.label}</span><button type="button" aria-label={`删除${sample.id}`} onClick={() => { setUserSamples((current) => current.filter((item) => item.id !== sample.id)); setModelTrained(false); setScanResult(null); setReportReady(false); }}>×</button></article>)}{!userSamples.length && <p>摄像头拍照或上传图片 → 选择标签 → 加入训练集</p>}</div>
        </div>
      </div>
    );
  }

  function renderTestStep() {
    return (
      <div className="mission-content real-train-step">
        <div className="fx-step-lead fx-step-lead-inline">
          <div><span className="fx-step-kicker">MODEL RECIPE LAB</span><h3>配一组训练数据，观察模型会怎么变</h3></div>
          <p>按 ①②③ 操作；左侧样本会实时增减。</p>
        </div>
        <div className="real-train-layout">
          <section className="real-dataset-stack">
            <header><div><span>本轮训练集</span><small>{trainingRecipe}</small></div><b key={metrics.sampleCount}>{metrics.sampleCount} 张</b></header>
            <div className="real-dataset-grid" aria-live="polite">
              {trainingSet.map((sample) => {
                const userSample = userSamples.find((item) => item.id === sample.id);
                const originalLabel = emotionTrainingSamples.find((item) => item.id === sample.id)?.label;
                const isMislabeled = Boolean(originalLabel && originalLabel !== sample.label);
                return (
                  <div key={sample.id} className={`${userSample ? "is-real" : ""}${isMislabeled ? " is-mislabeled" : ""}`} title={isMislabeled ? `这张图片被错误标成“${sample.label}”` : sample.note}>
                    {userSample
                      ? <Image unoptimized src={userSample.image} alt="真人训练样本" width={48} height={48} />
                      : <ExpressionFace label={originalLabel ?? sample.label} features={sample.features} size={50} />}
                    <span>{sample.label}</span>
                    {isMislabeled && <em>错标</em>}
                  </div>
                );
              })}
            </div>
            <div className="real-dataset-status">
              <span>{removedSampleCount ? `已从完整组移除 ${removedSampleCount} 张` : "完整 12 张内置样本已装入"}</span>
              <b>{config.diversity === "diverse" ? "覆盖更广" : "覆盖较窄"}</b>
            </div>
          </section>
          <section className="real-training-controls">
            <header><span>训练配方台</span><b>选完再启动</b></header>
            <fieldset>
              <legend><i>1</i><span>先选数量<small>直接决定装入几张内置样本</small></span></legend>
              <div><button type="button" aria-pressed={config.sampleSize === "small"} className={config.sampleSize === "small" ? "is-active" : ""} onClick={() => updateVariable({ ...config, sampleSize: "small" }, "切换为精简 4 张样本")}><b>精简组</b><small>4 张 · 每类 1 张</small></button><button type="button" aria-pressed={config.sampleSize === "large"} className={config.sampleSize === "large" ? "is-active" : ""} onClick={() => updateVariable({ ...config, sampleSize: "large" }, "切换为完整 12 张样本")}><b>完整组</b><small>12 张 · 每类 3 张</small></button></div>
            </fieldset>
            <fieldset>
              <legend><i>2</i><span>再选覆盖<small>对比只看典型表情和保留细微差异</small></span></legend>
              <div><button type="button" aria-pressed={config.diversity === "narrow"} className={config.diversity === "narrow" ? "is-active" : ""} onClick={() => updateVariable({ ...config, diversity: "narrow" }, "缩窄表情覆盖")}><b>典型表情</b><small>差异少 · 更难泛化</small></button><button type="button" aria-pressed={config.diversity === "diverse"} className={config.diversity === "diverse" ? "is-active" : ""} onClick={() => updateVariable({ ...config, diversity: "diverse" }, "恢复多样表情覆盖")}><b>多样表情</b><small>差异多 · 更接近真实</small></button></div>
            </fieldset>
            <fieldset>
              <legend><i>3</i><span>最后查标签<small>故意犯错，看看 AI 会不会学歪</small></span></legend>
              <div><button type="button" aria-pressed={metrics.labelErrors === 0} className={metrics.labelErrors === 0 ? "is-active" : ""} onClick={() => updateVariable({ ...config, labelOverrides: {} }, "修正全部错误标签")}><b>标签正确</b><small>老师教对答案</small></button><button type="button" aria-pressed={metrics.labelErrors > 0} className={metrics.labelErrors > 0 ? "is-active is-danger" : "is-danger"} onClick={injectWrongLabels}><b>错标 2 张</b><small>观察错误怎样传给 AI</small></button></div>
            </fieldset>
          </section>
          <section className={modelTrained ? "real-training-result is-trained" : "real-training-result"}>
            <span>{modelTrained ? "训练结果" : "实时预估"}</span>
            <strong>{modelReadiness}%</strong>
            <small>预计稳定度</small>
            <i><em style={{ width: `${modelReadiness}%` }} /></i>
            <div className="real-recipe-chips"><b>{metrics.sampleCount} 张样本</b><b>{metrics.labelErrors ? `${metrics.labelErrors} 张错标` : "标签正确"}</b></div>
            <p>{metrics.reason}</p>
            {modelTrained && <em className="real-trained-hint">训练完成，可以进入真人测试台</em>}
            <button type="button" className="real-train-button" disabled={training} onClick={trainCurrentModel}>{training ? "正在学习样本特征…" : modelTrained ? `✓ 已用 ${metrics.sampleCount} 张训练 · 再训练` : `▶ 用 ${metrics.sampleCount} 张样本启动训练`}</button>
          </section>
        </div>
      </div>
    );
  }

  function renderCompareStep() {
    return (
      <div className="mission-content real-scan-step">
        <div className="fx-step-lead fx-step-lead-inline">
          <div><span className="fx-step-kicker">UNSEEN FACE</span><h3>用一张全新的脸，挑战刚才的模型</h3></div>
          <p>不要使用训练集中出现过的同一张照片。</p>
        </div>
        <div className="real-scan-layout">
          <EmotionCamera mode="scan" image={scanImage} onImage={(image) => { setScanImage(image); setScanResult(null); setScanError(""); setReportReady(false); }} title="扫描未见样本" />
          <section className="real-scan-console">
            <header><div><span>LOCAL SCANNER</span><h3>可见表情判断</h3></div><b>{scanCount} 次挑战</b></header>
            {!scanResult ? <div className="real-scan-wait"><span>⌁</span><b>{scanning ? "正在检查照片…" : "等待一张新照片"}</b><p>这是本地教学分类器，只比较画面区域的明暗与颜色特征。</p>{scanError && <em className="real-operation-error" role="alert">{scanError}</em>}</div> : <div className="real-scan-result"><small>本次判断 · {scanResult.trainingSampleCount} 张训练样本</small><strong>{scanResult.label}</strong><div><span>特征匹配度</span><b>{scanResult.confidence}%</b></div><i><em style={{ width: `${scanResult.confidence}%` }} /></i>{featureKeys.map((key) => <p key={key}><span>{key === "eyes" ? "上部区域" : key === "brows" ? "中部区域" : "下部区域"}</span><b>{scanResult.features[key]}</b></p>)}<em>{scanResult.note}</em></div>}
            <button type="button" className="real-run-scan" disabled={!scanImage || scanning || !modelTrained} onClick={scanExpression}>{scanning ? "分析中…" : scanResult ? "重新扫描" : "开始扫描表情"}</button>
          </section>
        </div>
      </div>
    );
  }

  function renderReportStep() {
    return (
      <div className="mission-content fx-report-step">
        <div className="fx-step-lead">
          <span className="fx-step-kicker">最终任务</span>
          <h3>用“改变—结果—原因”破解这一关</h3>
          <p>不用写长文，一句话说清证据就够了。</p>
        </div>

        <div className="fx-report-grid">
          <section className="fx-report-summary">
            <header><span>实验回放</span><b>{reportReady ? "✓ 已归档" : "待提交"}</b></header>
            <dl>
              <div><dt>我的预测</dt><dd>{prediction}</dd></div>
              <div><dt>改变条件</dt><dd>{variableSummary}</dd></div>
              <div><dt>真人训练</dt><dd>{userSamples.length} 张已参与模型</dd></div>
              <div><dt>真人挑战</dt><dd>{scanResult ? `${scanResult.label} · 匹配度 ${scanResult.confidence}%（共扫描 ${scanCount} 次）` : "尚未完成"}</dd></div>
              <div><dt>准确率</dt><dd><strong>{baseline.accuracy}%</strong><span>→</span><strong>{metrics.accuracy}%</strong></dd></div>
              <div><dt>置信度</dt><dd>{metrics.averageConfidence}%</dd></div>
            </dl>
          </section>

          <section className="fx-report-form">
            <label htmlFor="emotion-explanation">我的实验结论</label>
            <textarea
              id="emotion-explanation"
              className="fx-textarea"
              rows={5}
              value={explanation}
              onChange={(event) => {
                setExplanation(event.target.value);
                setReportReady(false);
              }}
              placeholder={`我改变了……，准确率从 ${baseline.accuracy}% 变为 ${metrics.accuracy}%，因为……`}
            />
            <div className="fx-writing-meter">
              <span><i style={{ width: `${Math.min(100, (explanation.trim().length / 8) * 100)}%` }} /></span>
              <b>{Math.min(8, explanation.trim().length)} / 8 字</b>
            </div>
            {reportReady && <div className="fx-report-success"><span>✓</span><div><b>模型测试报告已保存</b><small>预测、变量和解释已写入能力图谱。</small></div></div>}
          </section>
        </div>

        <div className="fx-safety-note"><span>!</span><p><b>别忘了：</b>教学分类器只比较照片中的画面特征，不能据此断言真实情绪；匹配度也不是真实概率。</p></div>
      </div>
    );
  }

  function renderCurrentStep() {
    if (currentStep === 0) return renderPredictionStep();
    if (currentStep === 1) return renderSampleStep();
    if (currentStep === 2) return renderTestStep();
    if (currentStep === 3) return renderCompareStep();
    return renderReportStep();
  }

  const guides = [
    { message: "科学家不会先看答案。先写下你的猜想，我来帮你记住。", detail: "观察两张脸的眼睛和嘴角：相似之处会让分类变难，不同之处可能成为关键特征。" },
    { message: userSamples.length ? `训练集里已有 ${userSamples.length} 张真人样本。再换一个表情，模型会学得更全面。` : "打开摄像头或上传图片，拍一张脸，再贴上你看到的表情标签。", detail: "推荐采集 3 张不同表情。标签是模型的老师：贴错了，模型也会学错。" },
    { message: modelTrained ? `训练完成：${metrics.sampleCount} 张样本已生成 4 个类别中心。` : `当前模型用了 ${metrics.sampleCount} 张样本，设置好条件后点“启动训练”。`, detail: "你可以减少样本、缩窄覆盖或故意错标，观察模型为什么变得不可靠。" },
    { message: scanResult ? `教学分类结果是“${scanResult.label}”，特征匹配度 ${scanResult.confidence}%。` : "换一张训练时没见过的脸，让分类器现场比较。", detail: "它只比较照片中的可见特征，匹配度不是真实概率，更不能读取一个人的内心情绪。" },
    { message: "最后一句话：你改了什么、结果怎样、为什么会这样？", detail: `本次加入 ${userSamples.length} 张真人样本、完成 ${scanCount} 次扫描。写满 8 个字即可提交。` },
  ];
  const nextDisabled = currentStep === 0
    ? !predictionSaved
    : currentStep === 1
      ? userSamples.length < 1
      : currentStep === 2
        ? !modelTrained
        : currentStep === 3
          ? !scanResult
          : currentStep === 4
            ? !reportReady && (!predictionSaved || explanation.trim().length < 8 || !scanResult)
            : false;
  const nextLabels = ["去采集真人样本", "训练我的模型", "去真人测试台", "生成挑战记录", reportReady ? "查看能力图谱" : "生成实验报告"];

  return (
    <ExperimentFrame
      level="01"
      title="AI 表情捕手"
      mission="识破训练数据如何改变 AI 的判断"
      steps={missionSteps}
      current={currentStep}
      tone="blue"
      guide={guides[currentStep].message}
      guideDetail={guides[currentStep].detail}
      reward="+20 探索值 · 模型报告"
      onPrevious={currentStep > 0 ? () => { setReportReady(false); setCurrentStep((step) => Math.max(0, step - 1)); } : undefined}
      onNext={currentStep < missionSteps.length - 1 ? () => setCurrentStep((step) => Math.min(missionSteps.length - 1, step + 1)) : generateReport}
      nextDisabled={nextDisabled}
      nextLabel={nextLabels[currentStep]}
      nextHref={currentStep === missionSteps.length - 1 && reportReady ? "/results" : undefined}
    >
      {renderCurrentStep()}
    </ExperimentFrame>
  );
}
