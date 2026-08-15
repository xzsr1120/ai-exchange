import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </div>
      {badge && <span className="teaching-badge">◎ {badge}</span>}
    </header>
  );
}

export function StepRail({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="step-rail" aria-label="学习闭环">
      {steps.map((step, index) => (
        <li key={step} className={index <= current ? "done" : ""}>
          <span>{index + 1}</span>{step}
        </li>
      ))}
    </ol>
  );
}

export function Stat({ label, value, suffix, tone = "blue" }: { label: string; value: string | number; suffix?: string; tone?: "blue" | "green" | "amber" }) {
  return (
    <div className={`stat stat-${tone}`}>
      <small>{label}</small>
      <strong>{value}<em>{suffix}</em></strong>
    </div>
  );
}

export function EmptyState({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <div className="empty-state">
      <span>◌</span><h3>{title}</h3><p>{detail}</p><Link className="button button-primary" href={href}>{action}</Link>
    </div>
  );
}
