import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text as KonvaText, Transformer, Group } from 'react-konva';
import useImage from 'use-image';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { assetsApi } from '../../api/index.js';
import { ZoomIn, ZoomOut, Maximize2, SplitSquareVertical, Eye } from 'lucide-react';

interface WatermarkCanvasProps {
  canvasWidth?: number;
  canvasHeight?: number;
}

export const WatermarkCanvas: React.FC<WatermarkCanvasProps> = () => {
  const { config, referenceImage, setNormalizedPosition, zoom, setZoom } = useWatermarkStore();
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100

  // Reference image URL
  const imageUrl = referenceImage
    ? assetsApi.getViewUrl(referenceImage)
    : 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80'; // fallback luxury jewellery image

  const [image] = useImage(imageUrl, 'anonymous');

  // Logo image URL if enabled (prioritize direct data URI or Cloudinary URL)
  const logoUrl =
    config.logoConfig?.logoUrl ||
    (config.logoConfig?.logoAssetId ? assetsApi.getViewUrl(config.logoConfig.logoAssetId) : '');

  const [logoImg] = useImage(logoUrl, 'anonymous');

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 500 });
  const textRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: Math.max(260, Math.floor(entry.contentRect.width)),
          height: Math.max(260, Math.floor(entry.contentRect.height)),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute image placement within canvas to maintain aspect ratio
  const imgWidth = image?.width || 1200;
  const imgHeight = image?.height || 900;
  const imageAspect = imgWidth / imgHeight;
  const containerAspect = containerSize.width / containerSize.height;

  let renderWidth = containerSize.width;
  let renderHeight = containerSize.height;

  if (containerAspect > imageAspect) {
    renderHeight = containerSize.height;
    renderWidth = renderHeight * imageAspect;
  } else {
    renderWidth = containerSize.width;
    renderHeight = renderWidth / imageAspect;
  }

  // Position offset to center the jewellery image in the canvas
  const offsetX = (containerSize.width - renderWidth) / 2;
  const offsetY = (containerSize.height - renderHeight) / 2;

  // Calculate text placement from normalized coordinates
  const textNormX = config.textConfig?.normalizedX ?? 0.82;
  const textNormY = config.textConfig?.normalizedY ?? 0.9;
  const textCanvasX = offsetX + renderWidth * textNormX;
  const textCanvasY = offsetY + renderHeight * textNormY;
  const textFontSize = Math.max(12, Math.round(renderHeight * (config.textConfig?.fontSizeRatio || 0.045)));

  // Calculate logo placement
  const logoNormX = config.logoConfig?.normalizedX ?? 0.85;
  const logoNormY = config.logoConfig?.normalizedY ?? 0.85;
  const logoScale = config.logoConfig?.scaleRatio || 0.15;
  const logoTargetW = Math.max(30, renderWidth * logoScale);
  const logoTargetH = logoImg ? (logoTargetW / (logoImg.width || 1)) * (logoImg.height || 1) : logoTargetW;
  const logoCanvasX = offsetX + renderWidth * logoNormX - logoTargetW / 2;
  const logoCanvasY = offsetY + renderHeight * logoNormY - logoTargetH / 2;

  // Handle Dragging
  const handleTextDragEnd = (e: any) => {
    const node = e.target;
    const newCanvasX = node.x();
    const newCanvasY = node.y();

    // Convert canvas coordinates back to normalized coordinates (0.0 to 1.0)
    const normX = Math.max(0.02, Math.min(0.98, (newCanvasX - offsetX) / renderWidth));
    const normY = Math.max(0.02, Math.min(0.98, (newCanvasY - offsetY) / renderHeight));

    setNormalizedPosition(Number(normX.toFixed(3)), Number(normY.toFixed(3)));
  };

  const handleLogoDragEnd = (e: any) => {
    const node = e.target;
    const newCanvasX = node.x() + logoTargetW / 2;
    const newCanvasY = node.y() + logoTargetH / 2;

    const normX = Math.max(0.02, Math.min(0.98, (newCanvasX - offsetX) / renderWidth));
    const normY = Math.max(0.02, Math.min(0.98, (newCanvasY - offsetY) / renderHeight));

    setNormalizedPosition(Number(normX.toFixed(3)), Number(normY.toFixed(3)));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Editor Top Toolbar */}
      <div className="h-12 border-b border-[#E2E8F0] px-4 flex items-center justify-between bg-[#F8FAFC] flex-shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] font-heading">
          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
          Visual Canvas Parity
          <span className="text-[11px] font-normal text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
            Normalized: ({textNormX.toFixed(2)}, {textNormY.toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Before/After Toggle */}
          <button
            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              showBeforeAfter
                ? 'bg-[#7C3AED] text-white'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Compare
          </button>

          {/* Zoom controls */}
          <div className="flex items-center border border-[#E2E8F0] rounded-lg bg-white overflow-hidden text-xs">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1 hover:bg-[#F1F5F9] text-[#64748B]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-0.5 text-[11px] font-semibold text-[#1E293B]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
              className="p-1 hover:bg-[#F1F5F9] text-[#64748B]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 border-l border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center bg-[#F1F5F9]/60 overflow-hidden cursor-crosshair select-none"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <Stage
            width={containerSize.width}
            height={containerSize.height}
            className="shadow-md rounded-lg overflow-hidden bg-white"
          >
            {/* Base Jewellery Image */}
            <Layer>
              {image && (
                <KonvaImage
                  image={image}
                  x={offsetX}
                  y={offsetY}
                  width={renderWidth}
                  height={renderHeight}
                />
              )}
            </Layer>

            {/* Watermark Overlay Layer (hidden when showing before image) */}
            {!showBeforeAfter && (
              <Layer>
                {/* Tiled Watermark if enabled */}
                {config.tiledConfig?.enabled && (
                  <Group>
                    {Array.from({ length: 6 }).map((_, rIdx) =>
                      Array.from({ length: 6 }).map((_, cIdx) => (
                        <KonvaText
                          key={`tile-${rIdx}-${cIdx}`}
                          text={config.tiledConfig.text || 'AURUM JEWELS'}
                          x={offsetX + cIdx * (renderWidth / 4)}
                          y={offsetY + rIdx * (renderHeight / 4)}
                          fontFamily={config.tiledConfig.fontFamily || 'Outfit'}
                          fontSize={Math.max(10, renderHeight * (config.tiledConfig.fontSizeRatio || 0.03))}
                          fill={config.tiledConfig.color || '#FFFFFF'}
                          opacity={config.tiledConfig.opacity ?? 0.18}
                          rotation={config.tiledConfig.angle || -30}
                          align="center"
                        />
                      ))
                    )}
                  </Group>
                )}

                {/* Logo Watermark if enabled */}
                {config.logoConfig?.enabled && logoImg && (
                  <KonvaImage
                    image={logoImg}
                    x={logoCanvasX}
                    y={logoCanvasY}
                    width={logoTargetW}
                    height={logoTargetH}
                    opacity={config.logoConfig.opacity ?? 0.85}
                    rotation={config.logoConfig.rotation || 0}
                    draggable
                    onDragEnd={handleLogoDragEnd}
                  />
                )}

                {/* Interactive Text Watermark */}
                {config.textConfig?.enabled && config.textConfig.text && (
                  <KonvaText
                    ref={textRef}
                    text={config.textConfig.text}
                    x={textCanvasX}
                    y={textCanvasY}
                    offsetX={textRef.current ? textRef.current.width() / 2 : 50}
                    offsetY={textRef.current ? textRef.current.height() / 2 : 10}
                    fontFamily={config.textConfig.fontFamily || 'Outfit'}
                    fontSize={textFontSize}
                    fontStyle={config.textConfig.fontWeight || '600'}
                    fill={config.textConfig.color || '#FFFFFF'}
                    opacity={config.textConfig.opacity ?? 0.85}
                    rotation={config.textConfig.rotation || 0}
                    letterSpacing={config.textConfig.letterSpacing || 2}
                    align={config.textConfig.alignment || 'center'}
                    shadowColor={config.textConfig.shadow?.color || 'rgba(0,0,0,0.5)'}
                    shadowBlur={config.textConfig.shadow?.blur || 4}
                    shadowOffsetX={config.textConfig.shadow?.offsetX || 2}
                    shadowOffsetY={config.textConfig.shadow?.offsetY || 2}
                    draggable
                    onDragEnd={handleTextDragEnd}
                  />
                )}
              </Layer>
            )}
          </Stage>
        </div>

        {/* Live Coordinate Floating Pill */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-lg shadow-sm text-xs font-mono text-[#64748B]">
          Drag to reposition watermark
        </div>
      </div>
    </div>
  );
};
