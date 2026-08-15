"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type EmotionCameraProps = {
  mode: "capture" | "scan";
  onImage: (image: string) => void;
  image?: string;
  title?: string;
};

export function EmotionCamera({ mode, onImage, image, title }: EmotionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    if (!window.isSecureContext) {
      setCameraState("error");
      setMessage("摄像头需要 HTTPS 或 localhost，请改用安全地址或上传图片。");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setMessage("当前浏览器不支持摄像头，请改用上传图片。");
      return;
    }
    setCameraState("starting");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch {
      setCameraState("error");
      setMessage("没有获得摄像头权限。你可以允许权限，或直接上传一张照片。");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onImage(canvas.toDataURL("image/jpeg", 0.82));
    stopCamera();
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("图片请控制在 5MB 以内。");
      return;
    }
    setMessage("正在压缩图片…");
    try {
      const source = await readFile(file);
      const compressed = await compressImage(source);
      stopCamera();
      setMessage("");
      onImage(compressed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片读取失败，请换一张图片。");
    }
  }

  return (
    <section className={`real-camera real-camera-${mode}`}>
      <header>
        <div><span>{mode === "capture" ? "LIVE DATA COLLECTOR" : "LIVE CHALLENGE"}</span><h3>{title ?? (mode === "capture" ? "采集一张训练照片" : "扫描一张未见照片")}</h3></div>
        <b><i /> 本机处理</b>
      </header>

      <div className={`real-camera-view ${cameraState === "ready" ? "is-live" : ""}`}>
        {image ? <Image unoptimized fill sizes="(max-width: 760px) 100vw, 45vw" src={image} alt={mode === "capture" ? "刚采集的训练样本" : "待测试的人脸图片"} /> : <video ref={videoRef} muted playsInline aria-label="摄像头实时画面" />}
        {!image && cameraState !== "ready" && (
          <div className="real-camera-empty"><span>{mode === "capture" ? "◎" : "⌁"}</span><b>{cameraState === "starting" ? "正在连接摄像头…" : "让一张真实图片进入实验"}</b><small>正脸、光线充足、一次只出现一张脸</small></div>
        )}
        {cameraState === "ready" && !image && <div className="real-face-guide"><span /><i /><b>把脸放在框内</b></div>}
        {image && <button type="button" className="real-retake" onClick={() => { stopCamera(); onImage(""); }}>↻ 重拍 / 重选</button>}
      </div>

      <div className="real-camera-actions">
        {cameraState === "ready" && !image ? (
          <><button type="button" className="real-shutter" onClick={capture}><span />拍下这一帧</button><button type="button" onClick={stopCamera}>取消</button></>
        ) : !image ? (
          <><button type="button" className="real-camera-primary" onClick={startCamera} disabled={cameraState === "starting"}>◉ {cameraState === "starting" ? "连接中" : "打开摄像头"}</button><button type="button" onClick={() => inputRef.current?.click()}>↑ 上传图片</button></>
        ) : null}
        <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </div>
      {message && <p className="real-camera-message">! {message}</p>}
      <footer>照片不上传、不写入记录。支持时先验脸；不支持时仅作整图教学匹配。</footer>
    </section>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("图片读取失败，请重试。"));
    reader.onerror = () => reject(new Error("图片读取失败，请检查文件是否损坏。"));
    reader.readAsDataURL(file);
  });
}

function compressImage(source: string) {
  return new Promise<string>((resolve, reject) => {
    const picture = document.createElement("img");
    picture.onload = () => {
      const maxSide = 960;
      const scale = Math.min(1, maxSide / Math.max(picture.naturalWidth, picture.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("浏览器无法处理这张图片。"));
      context.drawImage(picture, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", .82));
    };
    picture.onerror = () => reject(new Error("图片无法解码，请使用 JPG、PNG 或 WebP。"));
    picture.src = source;
  });
}
