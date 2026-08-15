import type { EmotionLabel, FeatureVector } from "@/lib/types";

const palettes: Record<EmotionLabel, [string, string]> = {
  自然笑容: ["#5eead4", "#0ea5e9"],
  惊讶: ["#93c5fd", "#8b5cf6"],
  低落: ["#94a3b8", "#475569"],
  紧张笑容: ["#fbbf24", "#f97316"],
};

export function ExpressionFace({ label, features, size = 124 }: { label: EmotionLabel; features: FeatureVector; size?: number }) {
  const [a, b] = palettes[label];
  const eyeOpen = 5 + features.eyes / 16;
  const browY = 43 - features.brows / 10;
  const smile = Math.max(-10, (features.mouth - 48) / 2.8);
  const id = `face-${label}-${features.eyes}-${features.mouth}`.replaceAll(" ", "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${label}原创动漫表情`}>
      <defs><linearGradient id={id} x1="0" x2="1"><stop stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <circle cx="60" cy="60" r="52" fill={`url(#${id})`} opacity=".95" />
      <circle cx="60" cy="60" r="47" fill="#0b1730" opacity=".18" />
      <path d={`M27 ${browY + 7} Q38 ${browY} 48 ${browY + 6}`} stroke="#eaf6ff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d={`M72 ${browY + 6} Q82 ${browY} 93 ${browY + 7}`} stroke="#eaf6ff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="39" cy="53" rx="7" ry={eyeOpen} fill="#061224" />
      <ellipse cx="81" cy="53" rx="7" ry={eyeOpen} fill="#061224" />
      <circle cx="41" cy="50" r="2" fill="#fff" /><circle cx="83" cy="50" r="2" fill="#fff" />
      <path d={`M34 79 Q60 ${79 + smile} 86 79`} stroke="#061224" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="68" r="5" fill="#fb7185" opacity=".45" /><circle cx="96" cy="68" r="5" fill="#fb7185" opacity=".45" />
    </svg>
  );
}
