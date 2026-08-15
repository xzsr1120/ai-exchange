import type { EmotionLabel, FeatureVector } from "./types";

export type LabeledExpressionFeatures = {
  label: EmotionLabel;
  features: FeatureVector;
};

export type ImageExpressionResult = {
  label: EmotionLabel;
  confidence: number;
  features: FeatureVector;
  distances: Partial<Record<EmotionLabel, number>>;
  trainingSampleCount: number;
  note: string;
};

type FaceBox = { x: number; y: number; width: number; height: number };
type FaceDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: FaceBox }>>;
};
type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function extractExpressionFeatures(source: string): Promise<FeatureVector> {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const size = 192;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法读取图片");

  let crop: FaceBox = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const FaceDetectorApi = (globalThis as typeof globalThis & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
  if (FaceDetectorApi) {
    const detector = new FaceDetectorApi({ fastMode: true, maxDetectedFaces: 2 });
    const faces = await detector.detect(image);
    if (faces.length === 0) throw new Error("没有检测到清晰人脸，请使用光线充足的正脸照片。");
    if (faces.length > 1) throw new Error("画面中检测到多张脸，请只保留一位同学再试。");
    const face = faces[0].boundingBox;
    const paddingX = face.width * .18;
    const paddingY = face.height * .2;
    crop = {
      x: Math.max(0, face.x - paddingX),
      y: Math.max(0, face.y - paddingY),
      width: Math.min(image.naturalWidth, face.width + paddingX * 2),
      height: Math.min(image.naturalHeight, face.height + paddingY * 2),
    };
    crop.width = Math.min(crop.width, image.naturalWidth - crop.x);
    crop.height = Math.min(crop.height, image.naturalHeight - crop.y);
  }
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;

  const region = (x1: number, y1: number, x2: number, y2: number) => {
    let brightness = 0;
    let saturation = 0;
    let contrast = 0;
    let count = 0;
    const values: number[] = [];
    for (let y = Math.floor(y1 * size); y < Math.floor(y2 * size); y += 2) {
      for (let x = Math.floor(x1 * size); x < Math.floor(x2 * size); x += 2) {
        const offset = (y * size + x) * 4;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];
        const light = (r + g + b) / 3;
        brightness += light;
        saturation += Math.max(r, g, b) - Math.min(r, g, b);
        values.push(light);
        count++;
      }
    }
    const mean = brightness / Math.max(1, count);
    for (const value of values) contrast += Math.abs(value - mean);
    return { brightness: mean, saturation: saturation / Math.max(1, count), contrast: contrast / Math.max(1, count) };
  };

  const eyesRegion = region(.18, .28, .82, .54);
  const browRegion = region(.18, .18, .82, .37);
  const mouthRegion = region(.22, .58, .78, .86);
  const full = region(.08, .08, .92, .92);

  const eyes = clamp(28 + eyesRegion.contrast * 2.2 + (eyesRegion.brightness - full.brightness) * .5);
  const brows = clamp(30 + browRegion.contrast * 1.7 + Math.abs(browRegion.brightness - eyesRegion.brightness) * .8);
  const mouth = clamp(22 + mouthRegion.contrast * 1.6 + mouthRegion.saturation * .75 + (mouthRegion.brightness - full.brightness) * .35);
  return { eyes, brows, mouth };
}

const distance = (a: FeatureVector, b: FeatureVector) =>
  Math.sqrt((a.eyes - b.eyes) ** 2 + (a.brows - b.brows) ** 2 + (a.mouth - b.mouth) ** 2);

export function classifyExpressionFeatures(
  features: FeatureVector,
  trainingSamples: LabeledExpressionFeatures[],
): ImageExpressionResult {
  if (!trainingSamples.length) throw new Error("训练集为空，请先采集并训练模型");

  const labels = [...new Set(trainingSamples.map((sample) => sample.label))];
  const centroids = Object.fromEntries(labels.map((label) => {
    const samples = trainingSamples.filter((sample) => sample.label === label);
    return [label, {
      eyes: samples.reduce((sum, sample) => sum + sample.features.eyes, 0) / samples.length,
      brows: samples.reduce((sum, sample) => sum + sample.features.brows, 0) / samples.length,
      mouth: samples.reduce((sum, sample) => sum + sample.features.mouth, 0) / samples.length,
    }];
  })) as Partial<Record<EmotionLabel, FeatureVector>>;

  const distances = Object.fromEntries(labels.map((label) => [label, distance(features, centroids[label]!)])) as Partial<Record<EmotionLabel, number>>;
  const ranked = labels.toSorted((a, b) => distances[a]! - distances[b]!);
  const nearest = distances[ranked[0]]!;
  const second = ranked[1] ? distances[ranked[1]]! : nearest + 4;
  const margin = Math.max(0, second - nearest);
  const confidence = clamp(54 + margin * 1.45 - nearest * .22 + Math.min(7, Math.sqrt(trainingSamples.length) * 1.6), 51, 94);

  return {
    label: ranked[0],
    confidence,
    features,
    distances,
    trainingSampleCount: trainingSamples.length,
    note: `这是 ${trainingSamples.length} 张样本的教学特征匹配结果，不是真实情绪概率；光线、角度和遮挡都会改变结果。`,
  };
}

export async function analyzeExpressionImage(
  source: string,
  trainingSamples: LabeledExpressionFeatures[],
): Promise<ImageExpressionResult> {
  const hasNativeFaceDetector = Boolean((globalThis as typeof globalThis & { FaceDetector?: FaceDetectorConstructor }).FaceDetector);
  const features = await extractExpressionFeatures(source);
  const result = classifyExpressionFeatures(features, trainingSamples);
  return {
    ...result,
    note: hasNativeFaceDetector
      ? `已先确认单人脸，再与 ${trainingSamples.length} 张样本做教学特征匹配；结果不是真实情绪概率。`
      : `当前浏览器无原生人脸检测，已降级为整图教学匹配；无法确认是否为单人脸，结果不可用于真实判断。`,
  };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = source;
  });
}
