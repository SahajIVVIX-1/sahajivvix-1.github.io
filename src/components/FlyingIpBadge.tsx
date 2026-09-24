import React, { useEffect, useRef, useState } from 'react';
import { useTransition } from '../context/TransitionContext';
import { RadialBurstLoader } from './RadialBurstLoader';

/**
 * FlyingIpBadge
 *
 * Cinematic Motion Telemetry Badge:
 * 1. On direct load, starts prominently at center screen between the butterflies.
 *    Features the signature animated favicon (RadialBurstLoader) alongside the IP badge.
 *    Beneath the badge, dedicated space showcases the animated favicon emblem.
 * 2. When the butterflies spread their wings and open the gateway curtain, the badge
 *    takes flight: it glides smoothly upward along a cinematic trajectory to dock
 *    right beside `Sahaj / ...` in the top header breadcrumb.
 * 3. Once docked, it seamlessly hands over to the permanent interactive header IP chip.
 */
export const FlyingIpBadge: React.FC = () => {
  const { phase, isEntranceOpen, visitorIp, isIpDocked, setIsIpDocked } =
    useTransition();

  const [coords, setCoords] = useState<{
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
  }>({
    startX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    startY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    targetX: 280,
    targetY: 36,
  });

  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [hasArrived, setHasArrived] = useState<boolean>(() => isIpDocked);
  const hasTriggeredRef = useRef<boolean>(false);

  // Measure center and target dock coordinates
  const updateCoordinates = () => {
    if (typeof window === 'undefined') return;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    const dock = document.getElementById('header-ip-dock');
    if (dock) {
      const rect = dock.getBoundingClientRect();
      setCoords({
        startX,
        startY,
        targetX: rect.left + rect.width / 2,
        targetY: rect.top + rect.height / 2,
      });
    } else {
      setCoords({
        startX,
        startY,
        targetX: Math.min(window.innerWidth * 0.35, 320),
        targetY: 36,
      });
    }
  };

  useEffect(() => {
    updateCoordinates();
    window.addEventListener('resize', updateCoordinates);
    return () => window.removeEventListener('resize', updateCoordinates);
  }, []);

  // Trigger flight when entrance curtain opens
  useEffect(() => {
    if (hasArrived || isIpDocked) return;

    if (isEntranceOpen && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      updateCoordinates();

      // Small frame delay to ensure CSS transition applies smoothly
      const launchTimer = setTimeout(() => {
        setIsFlying(true);
      }, 40);

      // Settle into header dock after flight completes
      const arriveTimer = setTimeout(() => {
        setIsIpDocked(true);
        setHasArrived(true);
      }, 760);

      return () => {
        clearTimeout(launchTimer);
        clearTimeout(arriveTimer);
      };
    }
  }, [isEntranceOpen, hasArrived, isIpDocked, setIsIpDocked]);

  // If already docked or reduced-motion is active, unmount the flying overlay
  if (hasArrived || isIpDocked || phase === 'idle') {
    return null;
  }

  const currentX = isFlying ? coords.targetX : coords.startX;
  const currentY = isFlying ? coords.targetY : coords.startY;

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-[60]"
      aria-hidden="true"
    >
      {/* 
        BENEATH THE MOTION: Animated signature favicon emblem in the center space.
        Visible while the badge rests at center, gently fading out as flight starts.
      */}
      {!isFlying && (
        <div
          className="absolute top-0 left-0 transition-all duration-400 ease-out"
          style={{
            transform: `translate3d(${coords.startX}px, ${coords.startY + 48}px, 0) translate(-50%, 0)`,
            opacity: isFlying ? 0 : 1,
          }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/85 backdrop-blur-md border border-neutral-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <RadialBurstLoader size={22} color="#E65100" motion="spin-bloom" isRunning={true} />
            <span className="font-editorial text-sm font-semibold tracking-tight text-neutral-900">
              Sahaj
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-handwriting text-xs text-neutral-500">
              gateway presence active ~
            </span>
          </div>
        </div>
      )}

      {/* 
        FLYING IP TELEMETRY BADGE:
        Starts at center, glides smoothly upward into the header dock beside Sahaj / ...
        Features the signature animated favicon loader on the left.
      */}
      <div
        className="absolute top-0 left-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${
            isFlying ? 0.88 : 1.05
          })`,
          opacity: isFlying ? 0.98 : 1.0,
        }}
      >
        <div
          className={`flex items-center space-x-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white backdrop-blur-md border border-neutral-300 shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-500 ${
            isFlying ? 'shadow-[0_2px_10px_rgba(0,0,0,0.05)]' : ''
          }`}
        >
          {/* Signature animated blooming favicon loader */}
          <RadialBurstLoader size={16} color="#E65100" motion="spin-bloom" isRunning={true} />

          <span className="font-mono text-xs font-semibold text-neutral-900 tracking-wide">
            IP: {visitorIp}
          </span>

          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlyingIpBadge;
