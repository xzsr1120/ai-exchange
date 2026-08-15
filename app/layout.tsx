import type { Metadata } from "next";
import "./globals.css";
import { LearningProvider } from "@/components/learning-provider";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "AI破界实验室",
  description: "面向初中生的AI互动科普实验室",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <LearningProvider><Shell>{children}</Shell></LearningProvider>
      </body>
    </html>
  );
}
