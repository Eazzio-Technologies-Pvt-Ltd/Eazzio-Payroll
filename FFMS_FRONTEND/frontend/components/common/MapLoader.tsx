import React from 'react';
import { MapPin } from 'lucide-react';

interface MapLoaderProps {
  message?: string;
  overlay?: boolean;
}

export default function MapLoader({ message, overlay = true }: MapLoaderProps) {
  return (
    <div className={overlay ? "map-loader-overlay" : "map-loader-container"} style={!overlay ? { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } : undefined}>
      <style>{`
        .map-loader-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #2c2c2e; /* dark background */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        
        .map-loader-container-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .map-icon-box {
          width: 56px;
          height: 56px;
          background-color: #3b82f6; /* light blue color */
          border-radius: 16px; /* slightly smaller radius */
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
          animation: pulse-box 2s infinite ease-in-out;
        }

        .loading-dots {
          display: flex;
          gap: 6px;
        }

        .loading-dots span {
          width: 6px;
          height: 6px;
          background-color: #60a5fa; /* lighter blue */
          border-radius: 50%;
          animation: bounce-dot 1.4s infinite ease-in-out both;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes pulse-box {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        
        .loading-message {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 13px;
          letter-spacing: 0.5px;
          margin-top: -8px;
        }
      `}</style>
      
      <div className="map-loader-container-inner">
        <div className="map-icon-box">
          <MapPin size={26} color="white" strokeWidth={2.5} />
        </div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        {message && <div className="loading-message" style={{ color: overlay ? 'white' : '#64748b' }}>{message}</div>}
      </div>
    </div>
  );
}
