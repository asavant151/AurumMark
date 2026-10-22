import React from 'react';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { Grid, Sliders } from 'lucide-react';

export const TiledSettings: React.FC = () => {
  const { config, updateTiledConfig } = useWatermarkStore();
  const tiledConfig = config.tiledConfig;

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <label className="text-xs font-semibold text-[#1E293B] font-heading flex items-center gap-1.5">
          <Grid className="w-3.5 h-3.5 text-[#7C3AED]" />
          Tiled Diagonal Pattern
        </label>
        <input
          type="checkbox"
          checked={tiledConfig.enabled}
          onChange={(e) => updateTiledConfig({ enabled: e.target.checked })}
          className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
        />
      </div>

      {tiledConfig.enabled && (
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-[#64748B] block mb-1">
              Repeated Text Pattern
            </label>
            <input
              type="text"
              value={tiledConfig.text || ''}
              onChange={(e) => updateTiledConfig({ text: e.target.value })}
              placeholder="e.g. AURUM JEWELS"
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Angle</span>
                <span>{tiledConfig.angle}°</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="5"
                value={tiledConfig.angle || -30}
                onChange={(e) => updateTiledConfig({ angle: parseInt(e.target.value, 10) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Opacity</span>
                <span>{Math.round((tiledConfig.opacity || 0.18) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.01"
                value={tiledConfig.opacity || 0.18}
                onChange={(e) => updateTiledConfig({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
