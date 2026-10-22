import React from 'react';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { Type, AlignLeft, AlignCenter, AlignRight, Sliders, Sun } from 'lucide-react';

export const TextSettings: React.FC = () => {
  const { config, updateTextConfig } = useWatermarkStore();
  const textConfig = config.textConfig;

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <label className="text-xs font-semibold text-[#1E293B] font-heading flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-[#7C3AED]" />
          Text Watermark
        </label>
        <input
          type="checkbox"
          checked={textConfig.enabled}
          onChange={(e) => updateTextConfig({ enabled: e.target.checked })}
          className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
        />
      </div>

      {textConfig.enabled && (
        <div className="space-y-3.5">
          {/* Watermark Text Input */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] block mb-1">
              Watermark Text
            </label>
            <input
              type="text"
              value={textConfig.text}
              onChange={(e) => updateTextConfig({ text: e.target.value })}
              placeholder="e.g. AURUM JEWELLERY"
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Typography: Outfit or Poppins ONLY */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                Font Family
              </label>
              <select
                value={textConfig.fontFamily}
                onChange={(e) => updateTextConfig({ fontFamily: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="Outfit">Outfit (Luxury Sans)</option>
                <option value="Poppins">Poppins (Modern Geometric)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                Weight
              </label>
              <select
                value={textConfig.fontWeight}
                onChange={(e) => updateTextConfig({ fontWeight: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">SemiBold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">ExtraBold (800)</option>
              </select>
            </div>
          </div>

          {/* Color & Opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                Text Color
              </label>
              <div className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg px-2 py-1 bg-white">
                <input
                  type="color"
                  value={textConfig.color.startsWith('#') ? textConfig.color : '#FFFFFF'}
                  onChange={(e) => updateTextConfig({ color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono font-medium text-[#1E293B]">
                  {textConfig.color}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Opacity</span>
                <span>{Math.round(textConfig.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={textConfig.opacity}
                onChange={(e) => updateTextConfig({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>
          </div>

          {/* Size & Rotation */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Size Ratio</span>
                <span>{Math.round(textConfig.fontSizeRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.1"
                step="0.005"
                value={textConfig.fontSizeRatio}
                onChange={(e) => updateTextConfig({ fontSizeRatio: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Rotation</span>
                <span>{textConfig.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={textConfig.rotation}
                onChange={(e) => updateTextConfig({ rotation: parseInt(e.target.value, 10) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>
          </div>

          {/* Letter Spacing & Alignment */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Letter Spacing</span>
                <span>{textConfig.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={textConfig.letterSpacing}
                onChange={(e) => updateTextConfig({ letterSpacing: parseInt(e.target.value, 10) })}
                className="w-full accent-[#7C3AED]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#64748B] block mb-1">
                Alignment
              </label>
              <div className="flex items-center gap-1 border border-[#E2E8F0] p-1 rounded-lg bg-white">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => updateTextConfig({ alignment: align })}
                    className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                      textConfig.alignment === align
                        ? 'bg-[#7C3AED] text-white'
                        : 'text-[#64748B] hover:text-[#1E293B]'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drop Shadow Toggle */}
          <div className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1E293B]">Drop Shadow Contrast</span>
            <input
              type="checkbox"
              checked={!!textConfig.shadow}
              onChange={(e) =>
                updateTextConfig({
                  shadow: e.target.checked
                    ? { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 }
                    : undefined,
                })
              }
              className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
