"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import FUIBentoGridDark from "@/components/ui/bento";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Sparkles, SkipForward, SkipBack } from "lucide-react";

const PLAYLIST = [
  {
    id: "work-video",
    src: "/eazzio%20work%20video.mp4",
    title: "Workflow Demo",
    badge: "1/2 • Workflow Demo",
  },
  {
    id: "platform-preview",
    src: "/use_this_logo_replace_the_used.mp4",
    title: "Platform Overview",
    badge: "2/2 • Platform Overview",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef0 = useRef<HTMLVideoElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
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

  const [video1Available, setVideo1Available] = useState(true);

  // Sync fullscreen change with document event (e.g. when user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle Video 1 load error (e.g. missing file)
  const handleVideo0Error = () => {
    console.warn("Video 1 (/eazzio work video.mp4) is not available, falling back to Video 2.");
    setVideo1Available(false);
    setActiveVideoIndex(1);
    const v1 = videoRef1.current;
    if (v1) {
      v1.currentTime = 0;
      v1.muted = isMuted;
      v1.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    const v0 = videoRef0.current;
    const v1 = videoRef1.current;
    if (v0) {
      v0.muted = isMuted;
      v0.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // If v0 fails, try v1
          if (v1) {
            v1.muted = isMuted;
            v1.play().then(() => {
              setActiveVideoIndex(1);
              setIsPlaying(true);
            }).catch(console.warn);
          }
        });
    }
  }, []);

  // Seamless circular loop transition when a video ends
  const handleEnded = (endedIndex: number) => {
    if (!video1Available) {
      // Loop video 2 continuously if video 1 is missing
      const v1 = videoRef1.current;
      if (v1) {
        v1.currentTime = 0;
        v1.play().catch(console.warn);
      }
      return;
    }

    const nextIndex = (endedIndex + 1) % PLAYLIST.length;
    const currentVideo = endedIndex === 0 ? videoRef0.current : videoRef1.current;
    const nextVideo = nextIndex === 0 ? videoRef0.current : videoRef1.current;

    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
    }

    setActiveVideoIndex(nextIndex);
    setProgress(0);

    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.muted = isMuted;
      nextVideo.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Autoplay next video failed:", err);
        });
    }
  };

  const switchVideo = (targetIndex: number) => {
    if (targetIndex === activeVideoIndex) return;
    const currentVideo = activeVideoIndex === 0 ? videoRef0.current : videoRef1.current;
    const nextVideo = targetIndex === 0 ? videoRef0.current : videoRef1.current;

    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
    }

    setActiveVideoIndex(targetIndex);
    setProgress(0);

    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.muted = isMuted;
      if (isPlaying) {
        nextVideo.play().catch((err) => console.warn("Switch play failed:", err));
      }
    }
  };

  const togglePlay = () => {
    const activeVideo = activeVideoIndex === 0 ? videoRef0.current : videoRef1.current;
    if (!activeVideo) return;
    if (activeVideo.paused) {
      activeVideo.play().then(() => setIsPlaying(true)).catch(console.warn);
    } else {
      activeVideo.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    if (videoRef0.current) videoRef0.current.muted = newMuted;
    if (videoRef1.current) videoRef1.current.muted = newMuted;
    setIsMuted(newMuted);
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

  const handleTimeUpdate = (index: number) => {
    if (index !== activeVideoIndex) return;
    const activeVideo = index === 0 ? videoRef0.current : videoRef1.current;
    if (!activeVideo) return;
    const current = activeVideo.currentTime;
    const duration = activeVideo.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
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

          {/* Video Player Container (Fixed 16:9 Aspect Ratio, Sharp Rectangular Corners, No Border) */}
          <div
            ref={videoContainerRef}
            className={`relative w-full aspect-video overflow-hidden bg-slate-950 shadow-2xl transition-all duration-300 rounded-none border-0 ${
              isFullscreen
                ? "!fixed !inset-0 !h-screen !w-screen !z-[9999] !rounded-none !bg-black"
                : ""
            }`}
          >
            {/* Video 1: Eazzio Work Video (Plays First when file is provided) */}
            <video
              ref={videoRef0}
              src="/eazzio%20work%20video.mp4"
              muted={isMuted}
              playsInline
              preload="auto"
              onTimeUpdate={() => handleTimeUpdate(0)}
              onEnded={() => handleEnded(0)}
              onError={handleVideo0Error}
              onClick={togglePlay}
              className={`w-full h-full object-cover cursor-pointer transition-opacity duration-500 absolute inset-0 ${
                activeVideoIndex === 0
                  ? "opacity-100 z-10 pointer-events-auto"
                  : "opacity-0 z-0 pointer-events-none"
              }`}
            />

            {/* Video 2: Platform Showcase (Plays Second, Perfect Sync) */}
            <video
              ref={videoRef1}
              src="/use_this_logo_replace_the_used.mp4"
              muted={isMuted}
              playsInline
              preload="auto"
              onTimeUpdate={() => handleTimeUpdate(1)}
              onEnded={() => handleEnded(1)}
              onClick={togglePlay}
              className={`w-full h-full object-cover cursor-pointer transition-opacity duration-500 absolute inset-0 ${
                activeVideoIndex === 1
                  ? "opacity-100 z-10 pointer-events-auto"
                  : "opacity-0 z-0 pointer-events-none"
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

            {/* Top Bar Overlay Tag (shows current playing part and switches on hover) */}
            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-200 pointer-events-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{PLAYLIST[activeVideoIndex].badge}</span>
            </div>

            {/* Bottom Controls Bar (play, unmute, next/prev, fullscreen, 2-segment progress bar) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-5 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300">
              {/* Dual-Segment Interactive Progress Bar */}
              <div className="flex items-center gap-2 w-full">
                {PLAYLIST.map((item, idx) => {
                  const isCurrent = activeVideoIndex === idx;
                  const isPast = activeVideoIndex > idx;
                  const segWidth = isCurrent ? progress : isPast ? 100 : 0;
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeVideoIndex !== idx) {
                          switchVideo(idx);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickPos = (e.clientX - rect.left) / rect.width;
                          const activeVid = idx === 0 ? videoRef0.current : videoRef1.current;
                          if (activeVid && activeVid.duration) {
                            activeVid.currentTime = clickPos * activeVid.duration;
                          }
                        }
                      }}
                      className="flex-1 h-1.5 hover:h-2 bg-white/30 rounded-full cursor-pointer overflow-hidden transition-all relative"
                      title={`${item.title} (Click to switch)`}
                    >
                      <div
                        className="h-full bg-white rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                        style={{ width: `${segWidth}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-slate-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={togglePlay}
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />}
                  </button>

                  <button
                    onClick={() => switchVideo((activeVideoIndex + 1) % PLAYLIST.length)}
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                    title="Next Video"
                  >
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full hidden sm:inline">
                    {PLAYLIST[activeVideoIndex].title}
                  </span>

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

