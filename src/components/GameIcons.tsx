import React from 'react';
import { BloonType } from '../types/game';
import { BLOON_SPECS } from '../data/bloons';
import { TOWER_SPEC_MAP } from '../data/towers';

export const BloonIcon: React.FC<{
  type: BloonType;
  size?: number;
  camo?: boolean;
  regrow?: boolean;
  fortified?: boolean;
}> = ({ type, size = 34, camo, regrow, fortified }) => {
  const spec = BLOON_SPECS[type];
  if (!spec) return null;

  if (spec.isMoabClass) {
    return (
      <svg width={size} height={size * 0.78} viewBox="0 0 64 48" className="drop-shadow-md shrink-0">
        <defs>
          <linearGradient id={`moab_hull_${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={spec.accentColor || '#ffffff'} stopOpacity="0.35" />
            <stop offset="30%" stopColor={spec.color} />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {/* Rear thruster & tail fins */}
        <rect x="2" y="19" width="8" height="10" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="2" />
        <polygon
          points="5,6 21,20 5,20"
          fill={spec.accentColor || '#cbd5e1'}
          stroke="#0f172a"
          strokeWidth="2"
        />
        <polygon
          points="5,42 21,28 5,28"
          fill={spec.accentColor || '#cbd5e1'}
          stroke="#0f172a"
          strokeWidth="2"
        />
        {/* Airship body */}
        <ellipse
          cx="35"
          cy="24"
          rx="24"
          ry="17"
          fill={spec.color}
          stroke={fortified ? '#f97316' : '#0f172a'}
          strokeWidth={fortified ? '4.5' : '2.8'}
        />
        <ellipse cx="35" cy="24" rx="23" ry="15.5" fill={`url(#moab_hull_${type})`} />
        {/* Airship stripes */}
        <path
          d="M15 16 Q35 9 54 18 M15 32 Q35 39 54 30 M12 24 L58 24"
          stroke={spec.accentColor || '#ffffff'}
          strokeWidth="2.2"
          fill="none"
          strokeOpacity="0.85"
        />
        {fortified && (
          <>
            <line x1="26" y1="8" x2="26" y2="40" stroke="#f59e0b" strokeWidth="3.5" />
            <line x1="43" y1="9" x2="43" y2="39" stroke="#f59e0b" strokeWidth="3.5" />
          </>
        )}
        {spec.isBoss && (
          <>
            <ellipse cx="45" cy="17" rx="5.5" ry="3" fill="#4ade80" stroke="#052e16" strokeWidth="1.2" />
            <ellipse cx="45" cy="31" rx="5.5" ry="3" fill="#4ade80" stroke="#052e16" strokeWidth="1.2" />
          </>
        )}
      </svg>
    );
  }

  const clipId = `clip_bloon_${type}_${regrow ? 'r' : 'n'}_${camo ? 'c' : 'n'}`;
  const heartPath =
    'M20 14 C12 2 1.5 8 4 21 C6 30 15 36 20 42 C25 36 34 30 36 21 C38.5 8 28 2 20 14 Z';
  const fillUrl =
    type === 'lead'
      ? `url(#grad_metal_${type})`
      : type === 'rainbow'
        ? `url(#grad_rainbow_${type})`
        : type === 'zebra'
          ? `url(#grad_zebra_${type})`
          : spec.color;

  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 40 48" className="drop-shadow-md shrink-0">
      <defs>
        <radialGradient id={`grad_metal_${type}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="28%" stopColor="#cbd5e1" />
          <stop offset="62%" stopColor="#64748b" />
          <stop offset="88%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <linearGradient id={`grad_rainbow_${type}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#eab308" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="80%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`grad_zebra_${type}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="33%" stopColor="#f8fafc" />
          <stop offset="66%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <clipPath id={clipId}>
          {regrow ? <path d={heartPath} /> : <ellipse cx="20" cy="21" rx="15" ry="18" />}
        </clipPath>
      </defs>

      {/* Base Bloon Shape (Heart for Regrow, Oval for Standard) */}
      {regrow ? (
        <path d={heartPath} fill={fillUrl} />
      ) : (
        <ellipse cx="20" cy="21" rx="15" ry="18" fill={fillUrl} />
      )}

      {/* Clipped Interior Details: Lead Metal Seam & Rivets + Woodland Camo Blotches */}
      <g clipPath={`url(#${clipId})`}>
        {type === 'lead' && (
          <>
            <path d="M2 17 Q20 26 38 17" stroke="#1e293b" strokeWidth="3.2" fill="none" />
            <path d="M2 15.5 Q20 24.5 38 15.5" stroke="#e2e8f0" strokeWidth="1.2" fill="none" />
            {[
              [11, 12],
              [29, 12],
              [9, 25],
              [20, 29],
              [31, 25],
              [20, 8],
            ].map(([rx, ry], idx) => (
              <g key={idx}>
                <circle cx={rx} cy={ry} r="2.2" fill="#0f172a" />
                <circle cx={rx - 0.4} cy={ry - 0.4} r="1.3" fill="#f1f5f9" />
              </g>
            ))}
          </>
        )}

        {camo && (
          <>
            <ellipse
              cx="13"
              cy="13"
              rx="9"
              ry="5.5"
              transform="rotate(-25 13 13)"
              fill="rgba(20,83,45,0.85)"
            />
            <ellipse
              cx="27"
              cy="17"
              rx="8.5"
              ry="5"
              transform="rotate(28 27 17)"
              fill="rgba(15,23,42,0.82)"
            />
            <ellipse
              cx="15"
              cy="28"
              rx="10"
              ry="5.5"
              transform="rotate(15 15 28)"
              fill="rgba(63,98,18,0.85)"
            />
            <ellipse
              cx="25"
              cy="31"
              rx="7.5"
              ry="4.5"
              transform="rotate(-18 25 31)"
              fill="rgba(132,204,22,0.75)"
            />
            <ellipse cx="20" cy="20" rx="6.5" ry="4" fill="rgba(5,46,22,0.82)" />
          </>
        )}
      </g>

      {/* Inner Regrow Heart Contour */}
      {regrow && (
        <path
          d="M20 16.5 C13.5 7 5.5 11.5 7.5 21 C9 28 16 33 20 38 C24 33 31 28 32.5 21 C34.5 11.5 26.5 7 20 16.5 Z"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.4"
        />
      )}

      {/* Outer Outline */}
      {regrow ? (
        <path
          d={heartPath}
          fill="none"
          stroke={fortified ? '#f97316' : type === 'purple' ? '#22d3ee' : '#0f172a'}
          strokeWidth={fortified ? '4' : '2.5'}
        />
      ) : (
        <ellipse
          cx="20"
          cy="21"
          rx="15"
          ry="18"
          fill="none"
          stroke={fortified ? '#f97316' : type === 'purple' ? '#22d3ee' : '#0f172a'}
          strokeWidth={fortified ? '4' : '2.5'}
        />
      )}

      {/* Camo Tactical Dashed Border */}
      {camo &&
        (regrow ? (
          <path
            d={heartPath}
            fill="none"
            stroke="#84cc16"
            strokeWidth="2.2"
            strokeDasharray="4 3"
          />
        ) : (
          <ellipse
            cx="20"
            cy="21"
            rx="15"
            ry="18"
            fill="none"
            stroke="#84cc16"
            strokeWidth="2.2"
            strokeDasharray="4 3"
          />
        ))}

      {/* Specular 3D shine */}
      {regrow ? (
        <>
          <ellipse
            cx="12"
            cy="13"
            rx="3"
            ry="4.5"
            transform="rotate(-22 12 13)"
            fill="rgba(255,255,255,0.6)"
          />
          <ellipse
            cx="27"
            cy="13"
            rx="2.5"
            ry="3.8"
            transform="rotate(22 27 13)"
            fill="rgba(255,255,255,0.5)"
          />
        </>
      ) : (
        <>
          <ellipse
            cx="14"
            cy="13"
            rx="4"
            ry="7"
            transform="rotate(-22 14 13)"
            fill={type === 'lead' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)'}
          />
          <circle cx="11" cy="21" r="1.8" fill="rgba(255,255,255,0.4)" />
        </>
      )}

      {/* Knot */}
      <polygon
        points={regrow ? '16.5,41 23.5,41 20,46.5' : '16.5,39 23.5,39 20,45'}
        fill={type === 'lead' ? '#475569' : spec.color}
        stroke="#0f172a"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export const TowerPortraitIcon: React.FC<{ specId: string; size?: number }> = ({ specId, size = 48 }) => {
  const spec = TOWER_SPEC_MAP[specId];
  if (!spec) return null;

  // Distinct hand-crafted SVG illustrations for mechanical/support structures vs monkeys
  if (specId === 'tack_shooter') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        <circle cx="32" cy="34" r="24" fill="rgba(0,0,0,0.3)" />
        {/* 8 chrome tack nozzles */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 32 32)`}>
            <rect x="28" y="3" width="8" height="12" rx="2" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
          </g>
        ))}
        <circle cx="32" cy="32" r="21" fill="#ec4899" stroke="#1e130c" strokeWidth="3" />
        <circle cx="32" cy="32" r="15" fill="#f472b6" />
        {/* Tack emblem */}
        <circle cx="32" cy="32" r="9" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
        <polygon points="32,21 35,29 43,32 35,35 32,43 29,35 21,32 29,29" fill="#0f172a" />
      </svg>
    );
  }

  if (specId === 'bomb_shooter') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        <ellipse cx="32" cy="52" rx="22" ry="6" fill="rgba(0,0,0,0.35)" />
        {/* Wooden wheels */}
        <circle cx="18" cy="46" r="9" fill="#b45309" stroke="#1e130c" strokeWidth="2.5" />
        <circle cx="46" cy="46" r="9" fill="#b45309" stroke="#1e130c" strokeWidth="2.5" />
        {/* Heavy cannon barrel */}
        <g transform="rotate(-28 32 34)">
          <rect x="14" y="20" width="38" height="22" rx="9" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
          <rect x="44" y="18" width="8" height="26" rx="3" fill="#475569" stroke="#0f172a" strokeWidth="2.5" />
          <ellipse cx="26" cy="26" rx="10" ry="3.5" fill="#64748b" />
          {/* Red hazard stripe */}
          <rect x="34" y="20" width="5" height="22" fill="#ef4444" />
        </g>
        {/* Fuse spark */}
        <circle cx="13" cy="38" r="4" fill="#facc15" />
      </svg>
    );
  }

  if (specId === 'banana_farm') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        <ellipse cx="32" cy="54" rx="22" ry="6" fill="rgba(0,0,0,0.3)" />
        {/* Tree trunk */}
        <path d="M27 52 L29 28 L35 28 L37 52 Z" fill="#92400e" stroke="#1e130c" strokeWidth="2.5" />
        {/* Lush palm leaves */}
        <ellipse cx="18" cy="24" rx="14" ry="6" transform="rotate(-25 18 24)" fill="#22c55e" stroke="#052e16" strokeWidth="2" />
        <ellipse cx="46" cy="24" rx="14" ry="6" transform="rotate(25 46 24)" fill="#22c55e" stroke="#052e16" strokeWidth="2" />
        <ellipse cx="32" cy="16" rx="15" ry="6" fill="#4ade80" stroke="#052e16" strokeWidth="2" />
        {/* Golden bananas bunch */}
        <path d="M24 28 Q28 40 35 34" stroke="#facc15" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M30 28 Q34 40 41 33" stroke="#fde047" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  if (specId === 'spike_factory') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        <ellipse cx="32" cy="50" rx="24" ry="8" fill="#475569" stroke="#0f172a" strokeWidth="2.5" />
        <path d="M14 48 C14 22 50 22 50 48 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="3" />
        <rect x="23" y="14" width="18" height="12" rx="3" fill="#f59e0b" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="32" cy="38" r="7" fill="#1e293b" />
        {/* Spikes */}
        <polygon points="32,5 36,15 28,15" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    );
  }

  if (specId === 'monkey_village') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        {/* Hut walls */}
        <rect x="16" y="32" width="32" height="22" rx="3" fill="#fde68a" stroke="#451a03" strokeWidth="2.5" />
        <rect x="26" y="40" width="12" height="14" rx="5" fill="#78350f" />
        {/* Conical thatched roof */}
        <polygon points="8,34 32,10 56,34" fill="#d97706" stroke="#451a03" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="15,34 32,15 49,34" fill="#f59e0b" />
        {/* Flag */}
        <line x1="32" y1="4" x2="32" y2="12" stroke="#451a03" strokeWidth="2.5" />
        <polygon points="32,4 44,8 32,11" fill="#ef4444" />
      </svg>
    );
  }

  if (specId === 'pontoon_platform') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
        <rect x="8" y="14" width="48" height="36" rx="6" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" />
        <rect x="13" y="18" width="38" height="28" rx="4" fill="#b45309" stroke="#451a03" strokeWidth="2.5" />
        <line x1="13" y1="25" x2="51" y2="25" stroke="#78350f" strokeWidth="2" />
        <line x1="13" y1="32" x2="51" y2="32" stroke="#78350f" strokeWidth="2" />
        <line x1="13" y1="39" x2="51" y2="39" stroke="#78350f" strokeWidth="2" />
      </svg>
    );
  }

  // Expressive BTD6 Monkey / Hero Character Portrait!
  const furColor = specId === 'ice_monkey' ? '#38bdf8' : '#b45309';
  const faceColor = specId === 'ice_monkey' ? '#bae6fd' : '#f59e0b';

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow shrink-0">
      {/* Monkey Ears */}
      <circle cx="11" cy="32" r="8" fill={furColor} stroke="#1e130c" strokeWidth="2.5" />
      <circle cx="11" cy="32" r="4.5" fill={faceColor} />
      <circle cx="53" cy="32" r="8" fill={furColor} stroke="#1e130c" strokeWidth="2.5" />
      <circle cx="53" cy="32" r="4.5" fill={faceColor} />

      {/* Main Monkey Head */}
      <circle cx="32" cy="33" r="20" fill={furColor} stroke="#1e130c" strokeWidth="3" />

      {/* Monkey Face Patch */}
      <ellipse cx="32" cy="37" rx="15" ry="12" fill={faceColor} />
      <circle cx="24" cy="30" r="7" fill={faceColor} />
      <circle cx="40" cy="30" r="7" fill={faceColor} />

      {/* Eyes */}
      <ellipse cx="25" cy="29" rx="4.5" ry="5.5" fill="#ffffff" stroke="#1e130c" strokeWidth="1.5" />
      <ellipse cx="39" cy="29" rx="4.5" ry="5.5" fill="#ffffff" stroke="#1e130c" strokeWidth="1.5" />
      <circle cx="26" cy="29" r="2.5" fill="#0f172a" />
      <circle cx="40" cy="29" r="2.5" fill="#0f172a" />
      <circle cx="24.8" cy="27.5" r="1" fill="#ffffff" />
      <circle cx="38.8" cy="27.5" r="1" fill="#ffffff" />

      {/* Confident Smile */}
      <path d="M26 41 Q32 45 38 41" stroke="#1e130c" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Class-specific Hats / Helmets / Cowls */}
      {specId === 'wizard_monkey' && (
        <polygon points="12,21 32,3 52,21" fill="#6d28d9" stroke="#1e130c" strokeWidth="2.5" />
      )}
      {specId === 'sniper_monkey' && (
        <path d="M13 22 C15 10 49 10 51 22 Z" fill="#15803d" stroke="#1e130c" strokeWidth="2.5" />
      )}
      {specId === 'dartling_gunner' && (
        <path d="M12 24 C12 9 52 9 52 24 Z" fill="#4d7c0f" stroke="#1e130c" strokeWidth="2.5" />
      )}
      {specId === 'monkey_buccaneer' && (
        <polygon points="9,22 32,9 55,22" fill="#1e293b" stroke="#facc15" strokeWidth="2" />
      )}
      {specId === 'monkey_sub' && (
        <g>
          <rect x="15" y="12" width="34" height="9" rx="4" fill="#eab308" stroke="#1e130c" strokeWidth="2" />
          <path d="M29 4 L29 12 L37 7" stroke="#eab308" strokeWidth="3" fill="none" />
        </g>
      )}
      {specId === 'super_monkey' && (
        <g>
          <path d="M13 23 C18 10 46 10 51 23 L32 27 Z" fill="#2563eb" stroke="#1e130c" strokeWidth="2" />
          <polygon points="32,12 36,18 32,23 28,18" fill="#facc15" stroke="#dc2626" strokeWidth="1.2" />
        </g>
      )}
      {specId === 'ninja_monkey' && (
        <rect x="13" y="15" width="38" height="8" rx="3" fill="#dc2626" stroke="#1e130c" strokeWidth="2" />
      )}
      {specId === 'druid' && (
        <path d="M14 21 Q32 8 50 21" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" fill="none" />
      )}
      {(specId === 'hero_quincy' || specId === 'hero_gwen') && (
        <g>
          <polygon points="22,15 32,4 42,15" fill={spec.secondaryColor} stroke="#1e130c" strokeWidth="2" />
          <rect x="15" y="16" width="34" height="6" rx="3" fill={spec.color} stroke="#1e130c" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
};
