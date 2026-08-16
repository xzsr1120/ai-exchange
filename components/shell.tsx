"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLearning } from "./learning-provider";
import { InteractionHub } from "./interaction-hub";

const navigation = [
  { href: "/", label: "闯关地图", short: "地图", icon: "⌂" },
  { href: "/emotion", label: "模型训练", short: "训练", icon: "◉" },
  { href: "/recommender", label: "推荐迷宫", short: "推荐", icon: "⌁" },
  { href: "/detective", label: "真假侦探", short: "侦探", icon: "◇" },
  { href: "/agent", label: "创造AI", short: "创造", icon: "△" },
  { href: "/results", label: "我的战绩", short: "战绩", icon: "⌗" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { state } = useLearning();
  const completed = [
    Boolean(state.emotionReport),
    state.recommendationActions.length >= 5,
    state.detectiveResults.length >= 1,
    Boolean(state.agentDesign?.completed),
  ].filter(Boolean).length;
  const inMission = ["/emotion", "/recommender", "/detective", "/agent"].includes(pathname);

  return (
    <div className={`app-shell ${inMission ? "mission-mode" : ""}`}>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="AI破界实验室首页">
          <span className="brand-mark"><i>AI</i><em>✦</em></span>
          <span><b>AI破界实验室</b><small>少年探索基地</small></span>
        </Link>
        <nav className="topnav" aria-label="顶部导航">
          {navigation.filter((_, index) => [0, 1, 2, 5].includes(index)).map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}><span>{item.icon}</span>{item.label}</Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <Link href="/results" className="progress-chip"><i style={{ width: `${completed * 25}%` }} /><span>探索等级</span><b>Lv.{completed + 1}</b><em>{completed}/4</em></Link>
          <Link href="/demo" className="demo-link">▶ 快速挑战</Link>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航">☰</button>
        </div>
      </header>
      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="主导航">
        <nav>
          {navigation.map((item, index) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {index > 0 && index < 5 && <small>{String(index).padStart(2, "0")}</small>}
              </Link>
            );
          })}
        </nav>
        <div className="privacy-note"><span>●</span> 本地匿名探索<br /><small>人脸照片不上传、不写入学习记录，仅在当前页面内存中临时处理，刷新后清除。</small></div>
      </aside>
      <main id="main-content" className="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="移动端导航">
        {navigation.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
            <span>{item.icon}</span><small>{item.short}</small>
          </Link>
        ))}
      </nav>
      <InteractionHub />
    </div>
  );
}
