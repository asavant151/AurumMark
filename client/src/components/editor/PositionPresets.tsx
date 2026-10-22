import React from 'react';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { PositionPreset, ScalingPolicy } from '../../types/index.js';
import { Grid3X3, Layers } from 'lucide-react';

const PRESETS: Array<{ id: PositionPreset; label: string; row: number; col: number }> = [
  { id: 'top-left', label: 'Top Left', row: 1, col: 1 },
  { id: 'top-center', label: 'Top Center', row: 1, col: 2 },
  { id: 'top-right', label: 'Top Right', row: 1, col: 3 },
  { id: 'center-left', label: 'Center Left', row: 2, col: 1 },
  { id: 'center', label: 'Center', row: 2, col: 2 },
  { id: 'center-right', label: 'Center Right', row: 2, col: 3 },
  { id: 'bottom-left', label: 'Bottom Left', row: 3, col: 1 },
  { id: 'bottom-center', label: 'Bottom Center', row: 3, col: 2 },
  { id: 'bottom-right', label: 'Bottom Right', row: 3, col: 3 },
];

export const PositionPresets: React.FC = () => {
  const { config, setPositionPreset, setConfig } = useWatermarkStore();

  const handlePolicyChange = (policy: ScalingPolicy) => {
    setConfig({
      ...config,
      scalingPolicy: policy,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-[#1E293B] font-heading flex items-center gap-1.5 mb-2">
          <Grid3X3 className="w-3.5 h-3.5 text-[#7C3AED]" />
          Position Presets (9-Point Grid)
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPositionPreset(preset.id)}
              className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition border ${
                config.positionPreset === preset.id
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#1E293B] hover:border-[#CBD5E1]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#1E293B] font-heading flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-[#B8860B]" />
          Scaling Policy
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['relative', 'fixed', 'contain', 'cover'] as ScalingPolicy[]).map((policy) => (
            <button
              key={policy}
              onClick={() => handlePolicyChange(policy)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg capitalize border transition ${
                config.scalingPolicy === policy
                  ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
              }`}
            >
              {policy === 'relative' ? 'Relative Position (Default)' : policy}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#64748B] mt-1.5">
          Relative Position preserves normalized placement consistently across all jewellery catalogue resolutions.
        </p>
      </div>
    </div>
  );
};
