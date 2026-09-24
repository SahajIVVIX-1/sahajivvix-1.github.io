import React from 'react';

/**
 * KineticAstrolabe
 * Modern kinetic celestial sculpture in electric cyan, mineral teal, seafoam glass, and warm gold.
 * Inspired by astronomical astrolabes, Calder kinetic mobiles, and optic chronometers.
 * - Calibrated outer limb with 72 fine navigational degree ticks.
 * - 6 swept aerodynamic parabolic blades in oceanic teal-cyan gradients with chamfered specular rims.
 * - Counter-rotating moiré interference louvers producing kinetic wave shimmer.
 * - Navigational armillary ring with orbiting titanium and gold satellite pips.
 * - Central multi-faceted crystal prism core performing an optic focal pulse.
 * - Orbiting quantum motes drifting on ambient trajectories.
 */
export const KineticAstrolabe: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 500 500"
      className={`w-full h-full select-none pointer-events-none ${className}`}
      fill="none"
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ambient atmospheric aura */}
        <radialGradient id="astrolabe-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7EC9DB" stopOpacity="0.25" />
          <stop offset="65%" stopColor="#7EC9DB" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#7EC9DB" stopOpacity="0" />
        </radialGradient>

        {/* Sculptural blade gradient: luminous seafoam to oceanic mineral teal */}
        <linearGradient
          id="astrolabe-blade-grad"
          x1="180"
          y1="30"
          x2="280"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#62E2F8" />
          <stop offset="35%" stopColor="#43C1D9" />
          <stop offset="70%" stopColor="#2D98AC" />
          <stop offset="100%" stopColor="#1B6C7C" />
        </linearGradient>

        {/* Chamfered edge highlight */}
        <linearGradient
          id="astrolabe-rim-spec"
          x1="190"
          y1="30"
          x2="250"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#B3F4FD" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#43C1D9" stopOpacity="0" />
        </linearGradient>

        {/* Moiré louvers gradient */}
        <linearGradient
          id="astrolabe-moire-grad"
          x1="250"
          y1="90"
          x2="250"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#87EAF8" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#37B3C8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1C7787" stopOpacity="0.1" />
        </linearGradient>

        {/* Prismatic crystal facet gradient */}
        <radialGradient id="astrolabe-core-prism" cx="38%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E2FAFD" />
          <stop offset="70%" stopColor="#80E2F1" />
          <stop offset="100%" stopColor="#258E9F" />
        </radialGradient>

        {/* Golden satellite pip */}
        <radialGradient id="astrolabe-gold-pip" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFEEB" />
          <stop offset="50%" stopColor="#FFDE6A" />
          <stop offset="100%" stopColor="#E5A61E" />
        </radialGradient>

        {/* Reusable Sculptural Aerodynamic Blade Unit */}
        <g id="astrolabe-blade-unit">
          {/* Main blade body */}
          <path
            d="M 250 250 C 220 205, 175 140, 184 75 C 190 32, 222 16, 246 16 C 262 16, 282 32, 282 68 C 282 120, 268 185, 250 250 Z"
            fill="url(#astrolabe-blade-grad)"
          />
          {/* Precision inner bevel facet */}
          <path
            d="M 250 250 C 238 215, 204 152, 214 90 C 218 64, 234 45, 246 16 C 250 55, 252 130, 250 250 Z"
            fill="rgba(255,255,255,0.18)"
          />
          {/* Specular rim stroke */}
          <path
            d="M 246 16 C 262 16, 282 32, 282 68 C 282 120, 268 185, 250 250"
            stroke="url(#astrolabe-rim-spec)"
            strokeWidth="1.4"
            fill="none"
          />
          {/* Laser-fine geometric coordinate line */}
          <path
            d="M 246 32 C 248 95, 246 160, 250 240"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
        </g>
      </defs>

      {/* ============================================================ */}
      {/* 1. Atmospheric Ambient Aura                                  */}
      {/* ============================================================ */}
      <circle cx="250" cy="250" r="236" fill="url(#astrolabe-aura)" />

      {/* ============================================================ */}
      {/* 2. Floating Quantum Coordinate Motes (Orbiting Particles)    */}
      {/* ============================================================ */}
      <g className="animate-spore-a">
        <circle cx="130" cy="120" r="3.5" fill="#62E2F8" opacity="0.85" />
        <circle cx="130" cy="120" r="1.5" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-b">
        <circle cx="390" cy="140" r="4.5" fill="#FFDE6A" opacity="0.9" />
        <circle cx="390" cy="140" r="2" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-c">
        <circle cx="360" cy="380" r="4" fill="#87EAF8" opacity="0.8" />
        <circle cx="360" cy="380" r="1.6" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-a">
        <circle cx="110" cy="340" r="3" fill="#B3F4FD" opacity="0.75" />
      </g>

      {/* ============================================================ */}
      {/* 3. Outer Calibrated Compass Ring (72 Precision Degree Ticks) */}
      {/* ============================================================ */}
      <g className="opacity-75">
        {/* Concentric boundary tracks */}
        <circle
          cx="250"
          cy="250"
          r="238"
          stroke="#4BBED3"
          strokeWidth="1.2"
          strokeOpacity="0.45"
          fill="none"
        />
        <circle
          cx="250"
          cy="250"
          r="226"
          stroke="#4BBED3"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* 72 Degree division marks */}
        {Array.from({ length: 72 }, (_, i) => {
          const deg = i * 5;
          const rad = (deg * Math.PI) / 180;
          const isMajor = i % 6 === 0; // every 30 deg
          const r1 = isMajor ? 222 : 227;
          const r2 = 238;
          const x1 = 250 + r1 * Math.sin(rad);
          const y1 = 250 - r1 * Math.cos(rad);
          const x2 = 250 + r2 * Math.sin(rad);
          const y2 = 250 - r2 * Math.cos(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#278D9F' : '#69D2E3'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeOpacity={isMajor ? 0.75 : 0.4}
            />
          );
        })}

        {/* Cardinal orientation nodes */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 250 + 238 * Math.sin(rad);
          const cy = 250 - 238 * Math.cos(rad);
          return (
            <g key={deg}>
              <circle cx={cx} cy={cy} r="3" fill="#258E9F" />
              <circle cx={cx} cy={cy} r="1.2" fill="#FFFFFF" />
            </g>
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 4. Primary Swept Parabolic Blades (6 Kinetic Louvers, 72s)   */}
      {/* ============================================================ */}
      <g className="animate-flower-spin-slow">
        <use href="#astrolabe-blade-unit" transform="rotate(0 250 250)" />
        <use href="#astrolabe-blade-unit" transform="rotate(60 250 250)" />
        <use href="#astrolabe-blade-unit" transform="rotate(120 250 250)" />
        <use href="#astrolabe-blade-unit" transform="rotate(180 250 250)" />
        <use href="#astrolabe-blade-unit" transform="rotate(240 250 250)" />
        <use href="#astrolabe-blade-unit" transform="rotate(300 250 250)" />
      </g>

      {/* ============================================================ */}
      {/* 5. Counter-Rotating Moiré Grid (Optical Interference Wave)   */}
      {/* ============================================================ */}
      <g className="animate-flower-mid-oscillate">
        <circle
          cx="250"
          cy="250"
          r="165"
          stroke="#4BBED3"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 6"
          fill="none"
        />
        {/* 18 Curved louvers creating moiré interference over the main blades */}
        {Array.from({ length: 18 }, (_, i) => {
          const rot = i * 20;
          return (
            <path
              key={i}
              d="M 250 250 C 235 200, 215 130, 250 90"
              stroke="url(#astrolabe-moire-grad)"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${rot} 250 250)`}
            />
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 6. Precision Armillary Track & Orbiting Satellites (26s spin) */}
      {/* ============================================================ */}
      <g className="animate-flower-stamen-spin">
        {/* Track circle */}
        <circle
          cx="250"
          cy="250"
          r="86"
          stroke="#207685"
          strokeWidth="1.2"
          strokeOpacity="0.6"
          strokeDasharray="6 3 2 3"
          fill="none"
        />

        {/* 12 Satellite spokes with golden chronometer beads */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 250 + 52 * Math.sin(rad);
          const y1 = 250 - 52 * Math.cos(rad);
          const x2 = 250 + 86 * Math.sin(rad);
          const y2 = 250 - 86 * Math.cos(rad);
          return (
            <g key={deg}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#2A8596"
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
              <circle cx={x2} cy={y2} r="3.4" fill="url(#astrolabe-gold-pip)" />
              <circle cx={x2 - 1} cy={y2 - 1} r="1" fill="#FFFFFF" opacity="0.9" />
            </g>
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 7. Geometric Inner Iris Aperture (Breathing Motion)          */}
      {/* ============================================================ */}
      <g className="animate-flower-inner-breathe">
        {/* Soft shadow under iris */}
        <circle cx="250" cy="252" r="54" fill="rgba(24, 85, 96, 0.22)" />

        {/* Hexagonal optic diaphragm */}
        <polygon
          points="250,198 295,224 295,276 250,302 205,276 205,224"
          fill="#E7FAFD"
          stroke="#69D7E8"
          strokeWidth="1.5"
        />
        {/* Inner rotated counter-hexagon */}
        <polygon
          points="250,208 286,229 286,271 250,292 214,271 214,229"
          fill="none"
          stroke="#3FB2C4"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
      </g>

      {/* ============================================================ */}
      {/* 8. Central Prismatic Core Singularity (Heartbeat Pulse)      */}
      {/* ============================================================ */}
      <g className="animate-flower-core-pulse">
        {/* Outer bezel */}
        <circle cx="250" cy="250" r="30" fill="#207685" />
        <circle cx="250" cy="250" r="28" fill="url(#astrolabe-core-prism)" />

        {/* Internal optic facets */}
        <path
          d="M 250 224 L 274 250 L 250 276 L 226 250 Z"
          fill="rgba(255,255,255,0.7)"
          stroke="#41B9CB"
          strokeWidth="1"
        />
        <path
          d="M 250 232 L 268 250 L 250 268 L 232 250 Z"
          fill="#FFFFFF"
          opacity="0.85"
        />

        {/* Focal singularity lens point */}
        <circle cx="250" cy="250" r="5" fill="#0D515D" />
        <circle cx="250" cy="250" r="2.2" fill="#E2FAFD" />
      </g>
    </svg>
  );
};

/**
 * KineticSolstice
 * Modern kinetic solar gyroscope in velvety vermilion, molten amber, coral, and rose quartz.
 * Inspired by astronomical solar dials, Howe kinetic wind sculptures, and horological tourbillons.
 * - Calibrated solstice limb with 84 micro-division marks.
 * - 7 swept aerodynamic spiral turbine wings in coral and crimson with specular highlights.
 * - Counter-revolving chronometer gear ring with 14 solar indices.
 * - Concentric mechanical iris aperture that dilates and breathes in harmonic oscillation.
 * - Central molten solar singularity core with diffraction spikes and organic heartbeat pulse.
 * - Orbiting incandescent ember motes drifting on ambient slipstreams.
 */
export const KineticSolstice: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 500 500"
      className={`w-full h-full select-none pointer-events-none ${className}`}
      fill="none"
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ambient solar corona aura */}
        <radialGradient id="solstice-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E04D3E" stopOpacity="0.25" />
          <stop offset="65%" stopColor="#E04D3E" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#E04D3E" stopOpacity="0" />
        </radialGradient>

        {/* Sculptural turbine wing gradient: radiant peach to deep molten crimson */}
        <linearGradient
          id="solstice-wing-grad"
          x1="180"
          y1="25"
          x2="280"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF6854" />
          <stop offset="35%" stopColor="#EB4432" />
          <stop offset="70%" stopColor="#C82D1E" />
          <stop offset="100%" stopColor="#8C180D" />
        </linearGradient>

        {/* Specular wing edge rim */}
        <linearGradient
          id="solstice-rim-spec"
          x1="190"
          y1="25"
          x2="250"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FFD2CA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#EB4432" stopOpacity="0" />
        </linearGradient>

        {/* Inner harmonic iris gradient */}
        <linearGradient
          id="solstice-iris-grad"
          x1="250"
          y1="90"
          x2="250"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFA697" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#E64A38" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8C180D" stopOpacity="0.1" />
        </linearGradient>

        {/* Molten amber singularity core */}
        <radialGradient id="solstice-core-singularity" cx="40%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="30%" stopColor="#FFDE7A" />
          <stop offset="70%" stopColor="#F5A020" />
          <stop offset="100%" stopColor="#B34B06" />
        </radialGradient>

        {/* Saffron chronometer pip */}
        <radialGradient id="solstice-saffron-pip" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFDE0" />
          <stop offset="50%" stopColor="#FFC83B" />
          <stop offset="100%" stopColor="#D97506" />
        </radialGradient>

        {/* Reusable Sculptural Spiral Turbine Wing Unit */}
        <g id="solstice-wing-unit">
          {/* Main wing blade */}
          <path
            d="M 250 250 C 224 205, 178 140, 186 76 C 192 34, 222 18, 246 18 C 262 18, 280 34, 280 68 C 280 120, 266 185, 250 250 Z"
            fill="url(#solstice-wing-grad)"
          />
          {/* Internal architectural bevel */}
          <path
            d="M 250 250 C 238 215, 206 152, 216 90 C 220 64, 234 45, 246 18 C 250 56, 252 130, 250 250 Z"
            fill="rgba(255,255,255,0.18)"
          />
          {/* Specular outer rim */}
          <path
            d="M 246 18 C 262 18, 280 34, 280 68 C 280 120, 266 185, 250 250"
            stroke="url(#solstice-rim-spec)"
            strokeWidth="1.4"
            fill="none"
          />
          {/* Coordinate tick line */}
          <path
            d="M 246 34 C 248 95, 246 160, 250 240"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
        </g>
      </defs>

      {/* ============================================================ */}
      {/* 1. Atmospheric Ambient Solar Corona                          */}
      {/* ============================================================ */}
      <circle cx="250" cy="250" r="236" fill="url(#solstice-aura)" />

      {/* ============================================================ */}
      {/* 2. Floating Incandescent Ember Motes (Orbiting Particles)    */}
      {/* ============================================================ */}
      <g className="animate-spore-a">
        <circle cx="120" cy="130" r="3.5" fill="#FF7D6D" opacity="0.85" />
        <circle cx="120" cy="130" r="1.5" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-b">
        <circle cx="395" cy="150" r="4.5" fill="#FFC83B" opacity="0.9" />
        <circle cx="395" cy="150" r="2" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-c">
        <circle cx="340" cy="385" r="4" fill="#FFA697" opacity="0.8" />
        <circle cx="340" cy="385" r="1.6" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-a">
        <circle cx="105" cy="330" r="3" fill="#FFE08F" opacity="0.75" />
      </g>

      {/* ============================================================ */}
      {/* 3. Outer Calibrated Solstice Ring (84 Precision Ticks)       */}
      {/* ============================================================ */}
      <g className="opacity-75">
        {/* Concentric boundary tracks */}
        <circle
          cx="250"
          cy="250"
          r="238"
          stroke="#E04D3E"
          strokeWidth="1.2"
          strokeOpacity="0.45"
          fill="none"
        />
        <circle
          cx="250"
          cy="250"
          r="226"
          stroke="#E04D3E"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* 84 Precision division marks */}
        {Array.from({ length: 84 }, (_, i) => {
          const deg = (i * 360) / 84;
          const rad = (deg * Math.PI) / 180;
          const isMajor = i % 7 === 0; // 12 major sectors
          const r1 = isMajor ? 222 : 227;
          const r2 = 238;
          const x1 = 250 + r1 * Math.sin(rad);
          const y1 = 250 - r1 * Math.cos(rad);
          const x2 = 250 + r2 * Math.sin(rad);
          const y2 = 250 - r2 * Math.cos(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#9E1C10' : '#E85B4D'}
              strokeWidth={isMajor ? 1.5 : 0.8}
              strokeOpacity={isMajor ? 0.75 : 0.4}
            />
          );
        })}

        {/* Equinox / Solstice major nodes */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 250 + 238 * Math.sin(rad);
          const cy = 250 - 238 * Math.cos(rad);
          return (
            <g key={deg}>
              <circle cx={cx} cy={cy} r="3" fill="#B32013" />
              <circle cx={cx} cy={cy} r="1.2" fill="#FFFFFF" />
            </g>
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 4. Primary Swept Spiral Wings (7 Kinetic Louvers, 64s Rev)   */}
      {/* ============================================================ */}
      <g className="animate-flower-spin-slow-rev">
        {Array.from({ length: 7 }, (_, i) => {
          const rot = (i * 360) / 7;
          return (
            <use
              key={i}
              href="#solstice-wing-unit"
              transform={`rotate(${rot.toFixed(2)} 250 250)`}
            />
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 5. Counter-Rotating Aperture Blades (Optical Wave Motion)     */}
      {/* ============================================================ */}
      <g className="animate-flower-mid-oscillate">
        <circle
          cx="250"
          cy="250"
          r="165"
          stroke="#E04D3E"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 6"
          fill="none"
        />
        {/* 14 Curved louvers creating moiré interference over the main blades */}
        {Array.from({ length: 14 }, (_, i) => {
          const rot = (i * 360) / 14;
          return (
            <path
              key={i}
              d="M 250 250 C 235 200, 215 130, 250 90"
              stroke="url(#solstice-iris-grad)"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${rot.toFixed(2)} 250 250)`}
            />
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 6. Chronometer Wheel Track & Saffron Pips (28s rev spin)     */}
      {/* ============================================================ */}
      <g className="animate-flower-stamen-spin-rev">
        {/* Track circle */}
        <circle
          cx="250"
          cy="250"
          r="86"
          stroke="#8C180D"
          strokeWidth="1.2"
          strokeOpacity="0.6"
          strokeDasharray="6 3 2 3"
          fill="none"
        />

        {/* 14 Chronometer spokes with saffron solar beads */}
        {Array.from({ length: 14 }, (_, i) => {
          const deg = (i * 360) / 14;
          const rad = (deg * Math.PI) / 180;
          const x1 = 250 + 52 * Math.sin(rad);
          const y1 = 250 - 52 * Math.cos(rad);
          const x2 = 250 + 86 * Math.sin(rad);
          const y2 = 250 - 86 * Math.cos(rad);
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#B5281A"
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
              <circle cx={x2} cy={y2} r="3.4" fill="url(#solstice-saffron-pip)" />
              <circle cx={x2 - 1} cy={y2 - 1} r="1" fill="#FFFFFF" opacity="0.9" />
            </g>
          );
        })}
      </g>

      {/* ============================================================ */}
      {/* 7. Geometric Inner Iris Diaphragm (Breathing Motion)         */}
      {/* ============================================================ */}
      <g className="animate-flower-inner-breathe">
        {/* Soft shadow under diaphragm */}
        <circle cx="250" cy="252" r="54" fill="rgba(140, 24, 13, 0.22)" />

        {/* Octagonal mechanical aperture */}
        <polygon
          points="250,198 287,213 302,250 287,287 250,302 213,287 198,250 213,213"
          fill="#FFF3F0"
          stroke="#FF8B7A"
          strokeWidth="1.5"
        />
        {/* Inner rotated counter-octagon */}
        <polygon
          points="250,208 280,220 292,250 280,280 250,292 220,280 208,250 220,220"
          fill="none"
          stroke="#EB4432"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
      </g>

      {/* ============================================================ */}
      {/* 8. Central Molten Solar Singularity (Heartbeat Pulse)        */}
      {/* ============================================================ */}
      <g className="animate-flower-core-pulse">
        {/* Outer bezel */}
        <circle cx="250" cy="250" r="30" fill="#8C180D" />
        <circle cx="250" cy="250" r="28" fill="url(#solstice-core-singularity)" />

        {/* 8-Point solar diffraction spikes */}
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1="250"
            y1="228"
            x2="250"
            y2="272"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
            transform={`rotate(${deg} 250 250)`}
            opacity="0.85"
          />
        ))}

        {/* Central glowing solar eye */}
        <circle cx="250" cy="250" r="5.5" fill="#6B1208" />
        <circle cx="250" cy="250" r="2.2" fill="#FFFBE6" />
      </g>
    </svg>
  );
};
