"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import FUIBentoGridDark from "@/components/ui/bento";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Sparkles } from "lucide-react";

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.92", "start 0.65"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothProgress, [0, 1], [0, 1]);
  const y = useTransform(smoothProgress, [0, 1], [40, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.96, 1]);

  // Sync fullscreen change with document event (e.g. when user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = clickPos * videoRef.current.duration;
  };

  return (
    <section id="howitworks" ref={containerRef} className="py-20 md:py-32 bg-transparent w-full overflow-hidden">
      {/* Title & Subtitle */}
      <motion.div
        style={{ opacity, y, scale }}
        className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-8 md:mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-full py-1.5 px-3.5 mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase">
            Simple 4-Step Process
          </span>
        </div>
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
          How it <span className="text-emerald-600">Works</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl">
          Get your entire field force up and running in four simple steps. No complex training required.
        </p>
      </motion.div>

      {/* Video In Full-Width / Full-Screen Between Heading and Boxes */}
      <motion.div
        style={{ opacity, y }}
        className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 lg:px-20 mb-14 md:mb-20"
      >
        <div className="relative group">
          {/* Ambient Glow Aura */}
          <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-emerald-500/15 via-blue-500/15 to-teal-500/15 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10" />

          {/* Video Player Container (Rectangular, No Black Border) */}
          <div
            ref={videoContainerRef}
            className={`relative w-full overflow-hidden bg-transparent shadow-2xl transition-all duration-300 ${
              isFullscreen
                ? "flex items-center justify-center h-screen w-screen bg-black"
                : "rounded-none"
            }`}
          >
            {/* The Video Element */}
            <video
              ref={videoRef}
              src="/use_this_logo_replace_the_used.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
              className={`w-full cursor-pointer transition-all duration-300 ${
                isFullscreen
                  ? "h-full w-full object-contain"
                  : "w-full h-auto object-cover mx-auto block"
              }`}
            />

            {/* Play/Pause Center Indicator Overlay (only appears on hover when paused) */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center cursor-pointer z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg shadow-black/30 transform hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-slate-900 ml-1" />
                </div>
              </div>
            )}

            {/* Top Bar Overlay Tag (only appears on hover) */}
            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-200 pointer-events-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Platform Preview</span>
            </div>

            {/* Bottom Controls Bar (play, unmute, fullscreen, progress - appears only on hover) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-5 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300">
              {/* Interactive Progress Bar (White color) */}
              <div
                onClick={handleProgressClick}
                className="w-full h-1.5 bg-white/30 hover:h-2 rounded-full cursor-pointer overflow-hidden transition-all"
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
                  </button>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:inline">
                    {isMuted ? "Click to unmute" : "Audio on"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFullscreen}
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-xs font-semibold text-white transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Full Screen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid Step Boxes */}
      <motion.div style={{ opacity, y }}>
        <FUIBentoGridDark />
      </motion.div>
    </section>
  );
}

