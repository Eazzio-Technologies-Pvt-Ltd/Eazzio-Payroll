// All images served from Cloudinary HTTPS — no CORS issues
// Use this component everywhere user-uploaded images are displayed
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

export default function CloudinaryImage({ url, placeholder = "No Receipt", alt = "Image Proof", className = "", width = "48px", height = "48px" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isValidUrl = url && (url.startsWith("http://") || url.startsWith("https://"));

  if (!isValidUrl) {
    return (
      <span className="text-muted" style={{ fontSize: "12px", fontStyle: "italic", opacity: 0.7 }}>
        {placeholder}
      </span>
    );
  }

  const modalContent = isOpen && (
    <div
      className="lightbox-overlay"
      onClick={() => setIsOpen(false)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-all duration-200 hover:bg-white/25 hover:scale-105 cursor-pointer border-none"
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          width: "44px",
          height: "44px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          zIndex: 1000000,
        }}
      >
        <X size={24} />
      </button>

      {/* Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "90%",
          maxHeight: "80%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <img
          src={url}
          alt={alt}
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            display: "block",
            backgroundColor: "#000",
          }}
        />
      </div>

      {/* Caption */}
      {alt && (
        <div
          style={{
            marginTop: "16px",
            color: "rgba(255, 255, 255, 0.9)",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            padding: "8px 16px",
            borderRadius: "20px",
          }}
        >
          {alt}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className={`group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-all duration-300 hover:border-blue-400 hover:shadow-md ${className}`}
        style={{
          width,
          height,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={url}
          alt={alt}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
            transition: "transform 0.3s ease",
          }}
          className="group-hover:scale-105"
        />
        {/* Hover overlay with zoom icon */}
        <div
          className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: "6px",
          }}
        >
          <ZoomIn size={14} className="text-white" />
        </div>
      </div>

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}

