import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  Link2,
  Loader2,
  Music,
  RotateCcw,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Cycling loading tips
const LOADING_TIPS = [
  "Fetching video info…",
  "Processing audio stream…",
  "Converting your file…",
  "Almost done, hang tight…",
];

// ---- Types ----
type Format = "mp3" | "mp4";
type Quality = 64 | 128 | 192 | 256 | 320;
type VideoQuality = "360" | "480" | "720" | "1080";
type ConvertState = "idle" | "loading" | "success" | "error";

interface ConvertResult {
  title: string;
  url: string;
}

// ---- Constants ----
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120000;

const QUALITY_OPTIONS: Quality[] = [64, 128, 192, 256, 320];
const VIDEO_QUALITY_OPTIONS: VideoQuality[] = ["360", "480", "720", "1080"];

const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/.*|youtu\.?be\/.*|m\.youtube\.com\/.*|music\.youtube\.com\/.*)$/;

// ---- Main App ----
export default function App() {
  const { actor } = useActor();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("mp3");
  const [quality, setQuality] = useState<Quality>(128);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("720");
  const [state, setState] = useState<ConvertState>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle tips during loading
  useEffect(() => {
    if (state !== "loading") {
      setTipIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [state]);

  function validateUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return "Please paste a YouTube URL.";
    if (!YT_REGEX.test(trimmed)) return "Please enter a valid YouTube URL.";
    if (trimmed.includes("youtube.com/playlist"))
      return "Playlists are not supported. Please use a single video URL.";
    if (trimmed.includes("youtube.com/clip"))
      return "YouTube Clips are not supported.";
    return null;
  }

  async function handleConvert() {
    const validationError = validateUrl(url);
    if (validationError) {
      toast.error(validationError);
      inputRef.current?.focus();
      return;
    }

    setState("loading");
    setErrorMsg("");
    setResult(null);
    setProgress(0);

    try {
      if (!actor) {
        throw new Error("Actor not ready");
      }

      // Determine format string for loader.to
      const loaderFormat = format === "mp3" ? "mp3" : videoQuality;

      // Step 1: Start the conversion job
      const startJson = await actor.startConversion(url.trim(), loaderFormat);
      const startData = JSON.parse(startJson);

      if (!startData.success || !startData.id) {
        setErrorMsg(
          "This video could not be processed. It may be age-restricted, live, or unavailable.",
        );
        setState("error");
        return;
      }

      // Step 2: Poll for completion
      const jobId = startData.id;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const pollJson = await actor.getProgress(jobId);
        const pollData = JSON.parse(pollJson);
        const pct = Math.min(Math.round((pollData.progress / 1000) * 100), 99);
        setProgress(pct);

        if (pollData.success === 1 && pollData.download_url) {
          setResult({
            title: "Your file is ready",
            url: pollData.download_url,
          });
          setProgress(100);
          setState("success");
          return;
        }

        if (pollData.success === false || pollData.progress === -1) {
          setErrorMsg(
            "Conversion failed. The video may be unavailable or restricted.",
          );
          setState("error");
          return;
        }
      }

      // Timed out
      setErrorMsg(
        "Conversion timed out. Please try again with a shorter video.",
      );
      setState("error");
    } catch {
      setErrorMsg(
        "Connection error. Please check your internet and try again.",
      );
      setState("error");
    }
  }

  function handleDownload() {
    if (result?.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  function handleReset() {
    setState("idle");
    setUrl("");
    setResult(null);
    setErrorMsg("");
    setProgress(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success("Link pasted!");
    } catch {
      toast.error("Couldn't access clipboard. Please paste manually.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.24 0.005 260)",
            border: "1px solid oklch(0.28 0.005 260)",
            color: "oklch(0.95 0 0)",
          },
        }}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-xl tracking-tight">
              YT<span className="text-orange">Conv</span>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
            >
              How it works
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-16 pb-10 px-4 relative overflow-hidden">
          {/* Decorative glow — two layers for depth */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[360px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 0%, oklch(0.68 0.2 45 / 0.22) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[180px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 55% at 50% 0%, oklch(0.72 0.22 48 / 0.18) 0%, transparent 70%)",
            }}
          />
          <div className="container mx-auto max-w-3xl text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-6 tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Free · No Sign-up · No Limits
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[3.75rem] text-foreground leading-[1.1] tracking-tight mb-5">
                Convert YouTube to{" "}
                <span className="hero-orange-text block sm:inline">
                  MP3 or MP4
                </span>
              </h1>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
                Download any YouTube video as audio or video in seconds.{" "}
                <span className="text-foreground/70">
                  No registration. No watermarks.
                </span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* Converter Card */}
        <section className="px-4 pb-16">
          <motion.div
            className="container mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          >
            <div
              className="bg-card rounded-2xl p-6 sm:p-8 card-shadow"
              style={{ border: "1px solid oklch(0.3 0.008 260)" }}
            >
              <AnimatePresence mode="wait">
                {/* Idle / Form state */}
                {(state === "idle" || state === "loading") && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* URL Input */}
                    <div className="space-y-2">
                      <label
                        htmlFor="yt-url"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        YouTube URL
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            ref={inputRef}
                            id="yt-url"
                            type="url"
                            placeholder="https://youtube.com/watch?v=..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && state === "idle")
                                handleConvert();
                            }}
                            disabled={state === "loading"}
                            className="pl-9 input-field h-11 text-sm bg-muted border-border focus-visible:ring-primary/40 focus-visible:border-primary"
                            autoComplete="off"
                            autoFocus
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 border-border bg-muted hover:bg-secondary hover:border-primary/50"
                          onClick={handlePaste}
                          disabled={state === "loading"}
                          title="Paste from clipboard"
                          aria-label="Paste from clipboard"
                        >
                          <Clipboard className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/60 -mx-6 sm:-mx-8" />

                    {/* Format Toggle */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Format
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <FormatButton
                          active={format === "mp3"}
                          onClick={() => setFormat("mp3")}
                          icon={<Music className="w-4 h-4" />}
                          label="MP3"
                          sublabel="Audio only"
                          disabled={state === "loading"}
                        />
                        <FormatButton
                          active={format === "mp4"}
                          onClick={() => setFormat("mp4")}
                          icon={<Video className="w-4 h-4" />}
                          label="MP4"
                          sublabel="Video + Audio"
                          disabled={state === "loading"}
                        />
                      </div>
                    </div>

                    {/* Divider before quality */}
                    <div className="h-px bg-border/60 -mx-6 sm:-mx-8" />

                    {/* Quality selector */}
                    <AnimatePresence mode="wait">
                      {format === "mp3" ? (
                        <motion.div
                          key="mp3-quality"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              Audio Quality
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {QUALITY_OPTIONS.map((q) => (
                                <button
                                  type="button"
                                  key={q}
                                  onClick={() => setQuality(q)}
                                  disabled={state === "loading"}
                                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                    quality === q
                                      ? "bg-primary text-primary-foreground border-transparent shadow-orange-sm"
                                      : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                  }`}
                                >
                                  {q}k
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="mp4-quality"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              Video Quality
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {VIDEO_QUALITY_OPTIONS.map((vq) => (
                                <button
                                  type="button"
                                  key={vq}
                                  onClick={() => setVideoQuality(vq)}
                                  disabled={state === "loading"}
                                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                    videoQuality === vq
                                      ? "bg-primary text-primary-foreground border-transparent shadow-orange-sm"
                                      : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                  }`}
                                >
                                  {vq}p
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Divider before CTA */}
                    <div className="h-px bg-border/60 -mx-6 sm:-mx-8" />

                    {/* Convert Button */}
                    <div className="space-y-3">
                      <Button
                        className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-orange transition-all duration-200 rounded-xl"
                        onClick={handleConvert}
                        disabled={state === "loading"}
                      >
                        {state === "loading" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Converting…
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-5 w-5" />
                            Convert Now
                          </>
                        )}
                      </Button>

                      {/* Loading progress + cycling tip */}
                      <AnimatePresence>
                        {state === "loading" && (
                          <motion.div
                            key="loading-feedback"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-2.5"
                          >
                            {progress > 0 ? (
                              <div className="space-y-1">
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-primary"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{
                                      duration: 0.4,
                                      ease: "easeOut",
                                    }}
                                  />
                                </div>
                                <p className="text-center text-xs text-muted-foreground">
                                  {progress}%
                                </p>
                              </div>
                            ) : (
                              <div className="progress-indeterminate" />
                            )}
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={tipIndex}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.3 }}
                                className="text-center text-xs text-muted-foreground"
                              >
                                {LOADING_TIPS[tipIndex]}
                              </motion.p>
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* Success state */}
                {state === "success" && result && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Success banner */}
                    <div
                      className="rounded-xl p-5 text-center"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.68 0.2 45 / 0.08) 0%, oklch(0.68 0.2 45 / 0.04) 100%)",
                        border: "1px solid oklch(0.68 0.2 45 / 0.25)",
                      }}
                    >
                      <div className="flex justify-center mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background: "oklch(0.68 0.2 45 / 0.15)",
                            boxShadow: "0 0 20px oklch(0.68 0.2 45 / 0.25)",
                          }}
                        >
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                        Ready to download
                      </p>
                      <h3
                        className="font-display font-semibold text-foreground text-base leading-snug"
                        style={{
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {result.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
                      {format === "mp3" ? (
                        <Music className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Video className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <span className="flex-1">
                        {format.toUpperCase()}
                        {format === "mp3"
                          ? ` · ${quality}kbps`
                          : ` · ${videoQuality}p Video`}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        Converted
                      </span>
                    </div>

                    <Button
                      className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-orange rounded-xl"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download {format.toUpperCase()}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-11 text-sm border-border bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Convert Another Video
                    </Button>
                  </motion.div>
                )}

                {/* Error state */}
                {state === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-destructive" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground mb-1">
                          Conversion Failed
                        </p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {errorMsg}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-orange rounded-xl"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Try Again
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        {/* How it Works */}
        <section
          id="how-it-works"
          className="px-4 py-16 border-t border-border"
        >
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
                How It <span className="text-orange">Works</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
                Three simple steps to download any YouTube video in your
                preferred format.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  step: "01",
                  icon: <Link2 className="w-6 h-6" />,
                  title: "Paste Your Link",
                  desc: "Copy the YouTube URL from your browser and paste it into the input above.",
                },
                {
                  step: "02",
                  icon: <Music className="w-6 h-6" />,
                  title: "Choose Your Format",
                  desc: "Select MP3 for audio-only files, or MP4 to keep the full video with sound.",
                },
                {
                  step: "03",
                  icon: <Download className="w-6 h-6" />,
                  title: "Download",
                  desc: "Hit Convert and your file will be ready to download in seconds — for free.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-6 relative group hover:border-primary/40 transition-colors duration-200"
                >
                  <div className="text-5xl font-display font-bold text-primary/10 absolute top-4 right-5 leading-none select-none group-hover:text-primary/15 transition-colors">
                    {item.step}
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Strip */}
        <section className="px-4 py-12 border-t border-border bg-card/30">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"
            >
              {[
                { value: "Free", label: "Always free" },
                { value: "320k", label: "Max audio quality" },
                { value: "Fast", label: "Instant conversion" },
                { value: "Safe", label: "No sign-up required" },
              ].map((feat) => (
                <div key={feat.value} className="py-4">
                  <div className="text-2xl font-display font-bold text-orange mb-1">
                    {feat.value}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {feat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 border-t border-border">
          <div className="container mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="font-display font-bold text-3xl text-foreground mb-8 text-center">
                FAQ
              </h2>
              <div className="space-y-3">
                {[
                  {
                    q: "Is YTConv free to use?",
                    a: "Yes, completely free. No account, no payment, no limits.",
                  },
                  {
                    q: "What formats are supported?",
                    a: "We support MP3 (audio only) at 64k–320kbps, and MP4 (video + audio).",
                  },
                  {
                    q: "Can I download playlists?",
                    a: "Not currently. Only single video URLs are supported.",
                  },
                  {
                    q: "Why did my download fail?",
                    a: "Age-restricted, live, or region-blocked videos may fail. Try another video or a different time.",
                  },
                ].map((item) => (
                  <motion.div
                    key={item.q}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3 }}
                    className="bg-card border border-border rounded-xl p-5 group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm mb-1">
                          {item.q}
                        </p>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 px-4 py-8">
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base text-foreground/70">
              YTConv
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Built with ♥ using caffeine.ai
            </a>
          </p>
          <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
            For personal use only. Respect copyright laws.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---- Format Button Component ----
interface FormatButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  disabled?: boolean;
}

function FormatButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
  disabled,
}: FormatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "bg-primary/10 border-primary text-foreground shadow-orange-sm"
          : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </div>
    </button>
  );
}
