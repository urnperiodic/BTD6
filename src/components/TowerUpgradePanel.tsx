import React from 'react';
import { GameMap, PlacedTower, TargetPriority } from '../types/game';
import { TOWER_SPEC_MAP } from '../data/towers';
import { computeTowerStats } from '../engine/simEngine';
import { Crosshair, DollarSign, ShieldAlert, Sparkles, Trash2, X, Zap } from 'lucide-react';

interface TowerUpgradePanelProps {
  tower: PlacedTower;
  allTowers: PlacedTower[];
  map: GameMap;
  cash: number;
  costMultiplier?: number;
  onUpgrade: (towerId: string, pathIndex: 0 | 1 | 2, cost: number) => void;
  onSell: (towerId: string, refund: number) => void;
  onChangePriority: (towerId: string, priority: TargetPriority) => void;
  onTriggerAbility?: (towerId: string) => void;
  onClose: () => void;
}

const PRIORITIES: TargetPriority[] = ['first', 'last', 'close', 'strong'];

export const TowerUpgradePanel: React.FC<TowerUpgradePanelProps> = ({
  tower,
  allTowers,
  map,
  cash,
  costMultiplier = 1.0,
  onUpgrade,
  onSell,
  onChangePriority,
  onTriggerAbility,
  onClose,
}) => {
  const spec = TOWER_SPEC_MAP[tower.specId];
  if (!spec) return null;

  const stats = computeTowerStats(tower, allTowers, map);
  const sellRefund = Math.round(tower.totalSpent * 0.75);

  /**
   * Authentic Bloons TD 6 / Battles 2 Crosspathing Lock Rule:
   * - One path can go up to Tier 5
   * - A second path can go up to Tier 2
   * - The third path is locked once two paths have >= 1 upgrade!
   */
  const isPathLocked = (pathIdx: 0 | 1 | 2): { locked: boolean; reason?: string } => {
    const currentTier = tower.tiers[pathIdx];
    if (currentTier >= 5) return { locked: true, reason: 'MAX TIER' };

    const activePaths = tower.tiers.filter((t) => t > 0).length;
    if (currentTier === 0 && activePaths >= 2) {
      return { locked: true, reason: 'PATH CLOSED' };
    }

    const otherPathHasTier3Plus = tower.tiers.some((t, idx) => idx !== pathIdx && t >= 3);
    if (currentTier >= 2 && otherPathHasTier3Plus) {
      return { locked: true, reason: 'MAX TIER 2' };
    }

    return { locked: false };
  };

  return (
    <div className="wood-panel rounded-xl p-3 text-white shadow-2xl border-2 border-[#5c2c12] w-full max-w-3xl">
      {/* Top Bar: Name, Pops, Priority, Ability, Sell, Close */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#6b3518]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base tracking-wide uppercase btd-text-stroke-sm">
                {spec.name}
              </h3>
              <span className="text-xs font-mono-num text-amber-200">
                [{tower.tiers.join('-')}]
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-amber-100/90 mt-0.5">
              <span className="font-mono-num">Pops: {tower.pops.toLocaleString()}</span>
              {tower.cashGenerated > 0 && (
                <>
                  <span>·</span>
                  <span className="font-mono-num text-emerald-300">
                    Generated: ${tower.cashGenerated.toLocaleString()}
                  </span>
                </>
              )}
              <span>·</span>
              <span className="font-mono-num">
                DMG: {stats.damage} {stats.moabDamageBonus > 0 ? `(+${stats.moabDamageBonus} MOAB)` : ''}
              </span>
              {stats.canDetectCamo && (
                <>
                  <span>·</span>
                  <span className="text-cyan-300 font-semibold">Camo Sight</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Priority Selector */}
          {!spec.isPlatform && spec.damage > 0 && (
            <div className="flex items-center bg-[#4a210d] rounded-lg p-0.5 border border-[#361607]">
              <Crosshair className="w-3.5 h-3.5 text-amber-300 mx-1.5 shrink-0" />
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => onChangePriority(tower.id, p)}
                  className={`px-2 py-1 text-[11px] font-bold uppercase rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    tower.targetPriority === p
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-amber-100/80 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Active Ability Button if unlocked */}
          {stats.abilityName && onTriggerAbility && (
            <button
              onClick={() => onTriggerAbility(tower.id)}
              disabled={tower.abilityCooldownTimer > 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                tower.abilityCooldownTimer > 0
                  ? 'bg-slate-700 border-slate-600 text-slate-300 cursor-not-allowed'
                  : 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950 shadow-md'
              }`}
              title={stats.abilityDescription}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              {tower.abilityCooldownTimer > 0
                ? `${Math.ceil(tower.abilityCooldownTimer)}s`
                : stats.abilityName}
            </button>
          )}

          {/* Sell Button */}
          <button
            onClick={() => onSell(tower.id, sellRefund)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 border-2 border-red-900 text-white text-xs font-bold uppercase shadow whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Sell ${sellRefund.toLocaleString()}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#5c2c12] hover:bg-[#783918] text-amber-100"
            aria-label="Close upgrade panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Upgrade Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {([0, 1, 2] as const).map((pathIdx) => {
          const currentTier = tower.tiers[pathIdx];
          const nextTierSpec = currentTier < 5 ? spec.upgrades[pathIdx][currentTier] : null;
          const lockState = isPathLocked(pathIdx);
          const actualCost = nextTierSpec ? Math.round(nextTierSpec.cost * costMultiplier) : 0;
          const canAfford = cash >= actualCost;

          return (
            <div
              key={pathIdx}
              className="wood-panel-dark rounded-lg p-2.5 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase text-amber-300/90">
                    Path {pathIdx + 1}
                  </span>
                  {/* 5 Tier Pip Indicators */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((pip) => (
                      <span
                        key={pip}
                        className={`w-2.5 h-2.5 rounded-sm border ${
                          currentTier >= pip
                            ? 'bg-emerald-400 border-emerald-200'
                            : 'bg-black/40 border-amber-900/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {lockState.locked ? (
                  <div className="py-2 text-center">
                    <div className="text-xs font-bold uppercase text-amber-200/70">
                      {lockState.reason}
                    </div>
                    {currentTier > 0 && (
                      <div className="text-[11px] text-emerald-300 mt-0.5">
                        Owned: {spec.upgrades[pathIdx][currentTier - 1].name}
                      </div>
                    )}
                  </div>
                ) : (
                  nextTierSpec && (
                    <div>
                      <div className="font-display font-bold text-sm text-white leading-tight">
                        {nextTierSpec.name}
                      </div>
                      <p className="text-[11px] text-amber-100/80 mt-0.5 leading-snug line-clamp-2">
                        {nextTierSpec.description}
                      </p>
                    </div>
                  )
                )}
              </div>

              {!lockState.locked && nextTierSpec && (
                <button
                  onClick={() => onUpgrade(tower.id, pathIdx, actualCost)}
                  disabled={!canAfford}
                  className={`w-full py-1.5 px-3 rounded-lg font-display font-bold text-xs uppercase border-2 flex items-center justify-between transition-transform active:scale-95 whitespace-nowrap ${
                    canAfford
                      ? 'bg-[#4ade80] hover:bg-[#22c55e] border-[#14532d] text-slate-950 shadow'
                      : 'bg-slate-700/70 border-slate-600 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <span>Upgrade</span>
                  <span className="font-mono-num">${actualCost.toLocaleString()}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
