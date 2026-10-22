import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { IWatermarkConfiguration } from '../models/WatermarkTemplate.js';
import { IBatchOutputSettings } from '../models/ProcessingBatch.js';

// Resolve directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontsDir = path.resolve(__dirname, '../assets/fonts');

// Base64 font loader cache
let fontFaceCss = '';
try {
  const outfitPath = path.join(fontsDir, 'Outfit-Variable.ttf');
  const poppinsRegPath = path.join(fontsDir, 'Poppins-Regular.ttf');
  const poppinsSemiPath = path.join(fontsDir, 'Poppins-SemiBold.ttf');

  let outfitB64 = '';
  let poppinsRegB64 = '';
  let poppinsSemiB64 = '';

  if (fs.existsSync(outfitPath)) {
    outfitB64 = fs.readFileSync(outfitPath).toString('base64');
  }
  if (fs.existsSync(poppinsRegPath)) {
    poppinsRegB64 = fs.readFileSync(poppinsRegPath).toString('base64');
  }
  if (fs.existsSync(poppinsSemiPath)) {
    poppinsSemiB64 = fs.readFileSync(poppinsSemiPath).toString('base64');
  }

  fontFaceCss = `
    @font-face {
      font-family: 'Outfit';
      src: url(data:font/truetype;charset=utf-8;base64,${outfitB64}) format('truetype');
      font-weight: 100 900;
    }
    @font-face {
      font-family: 'Poppins';
      src: url(data:font/truetype;charset=utf-8;base64,${poppinsRegB64}) format('truetype');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Poppins';
      src: url(data:font/truetype;charset=utf-8;base64,${poppinsSemiB64}) format('truetype');
      font-weight: 600;
    }
  `;
} catch (err) {
  console.warn('Could not pre-load font files for SVG font-face embedding:', err);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export interface ProcessImageOptions {
  inputBuffer: Buffer;
  config: IWatermarkConfiguration;
  outputSettings: IBatchOutputSettings;
  logoBuffer?: Buffer;
}

export interface ProcessImageResult {
  outputBuffer: Buffer;
  width: number;
  height: number;
  format: string;
  fileSize: number;
}

export class ImageProcessorService {
  /**
   * Applies the watermark configuration to an image buffer and returns the processed buffer
   */
  static async processImage(options: ProcessImageOptions): Promise<ProcessImageResult> {
    const { inputBuffer, config, outputSettings, logoBuffer } = options;

    // 1. Load image and auto-orient EXIF
    let pipeline = sharp(inputBuffer).rotate();
    const metadata = await pipeline.metadata();
    const origWidth = metadata.width || 1200;
    const origHeight = metadata.height || 1200;

    let targetWidth = origWidth;
    let targetHeight = origHeight;

    // Optional resizing if configured in output settings
    if (outputSettings.maxWidth && outputSettings.maxWidth < targetWidth) {
      targetHeight = Math.round((outputSettings.maxWidth / targetWidth) * targetHeight);
      targetWidth = outputSettings.maxWidth;
      pipeline = pipeline.resize(targetWidth, targetHeight);
    }

    const composites: sharp.OverlayOptions[] = [];

    // Safe margin
    const marginRatio = typeof config.marginPercent === 'number' ? config.marginPercent : 0.04;
    const safeMarginX = Math.round(targetWidth * marginRatio);
    const safeMarginY = Math.round(targetHeight * marginRatio);

    // 2. Process Logo Watermark if enabled and buffer provided
    if (config.logoConfig?.enabled && logoBuffer) {
      try {
        const logoScaleRatio = config.logoConfig.scaleRatio || 0.15;
        const logoTargetWidth = Math.max(30, Math.round(targetWidth * logoScaleRatio));
        
        let logoPipeline = sharp(logoBuffer)
          .resize(logoTargetWidth, null, { fit: 'inside' });

        if (config.logoConfig.rotation) {
          logoPipeline = logoPipeline.rotate(config.logoConfig.rotation, {
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          });
        }

        let processedLogo = await logoPipeline.toBuffer();
        const logoMeta = await sharp(processedLogo).metadata();
        const lw = logoMeta.width || logoTargetWidth;
        const lh = logoMeta.height || logoTargetWidth;

        // Apply opacity via linear channel or buffer compositing
        const opacity = typeof config.logoConfig.opacity === 'number' ? config.logoConfig.opacity : 0.85;
        if (opacity < 1.0) {
          // Multiply alpha channel
          const alphaAdjusted = await sharp(processedLogo)
            .composite([
              {
                input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in',
              },
            ])
            .toBuffer();
          processedLogo = alphaAdjusted;
        }

        // Calculate positions from normalized coordinates
        let posX = Math.round(targetWidth * (config.logoConfig.normalizedX ?? 0.85));
        let posY = Math.round(targetHeight * (config.logoConfig.normalizedY ?? 0.85));

        // Center anchor adjustment
        posX = Math.round(posX - lw / 2);
        posY = Math.round(posY - lh / 2);

        // Clamp inside safe margin
        posX = Math.max(safeMarginX, Math.min(targetWidth - lw - safeMarginX, posX));
        posY = Math.max(safeMarginY, Math.min(targetHeight - lh - safeMarginY, posY));

        composites.push({
          input: processedLogo,
          left: Math.round(posX),
          top: Math.round(posY),
        });
      } catch (err) {
        console.error('Failed to composite logo watermark:', err);
      }
    }

    // 3. Process Text Watermark if enabled
    if (config.textConfig?.enabled && config.textConfig.text) {
      const text = escapeXml(config.textConfig.text.trim());
      const fontFamily = config.textConfig.fontFamily === 'Poppins' ? 'Poppins' : 'Outfit';
      const fontSize = Math.max(
        12,
        Math.round(Math.min(targetWidth, targetHeight) * (config.textConfig.fontSizeRatio || 0.045))
      );
      const fontWeight = config.textConfig.fontWeight || '600';
      const color = config.textConfig.color || '#FFFFFF';
      const opacity = typeof config.textConfig.opacity === 'number' ? config.textConfig.opacity : 0.8;
      const rotation = config.textConfig.rotation || 0;
      const letterSpacing = config.textConfig.letterSpacing || 2;
      const alignment = config.textConfig.alignment || 'center';

      // Normalized coordinates
      const normX = config.textConfig.normalizedX ?? 0.85;
      const normY = config.textConfig.normalizedY ?? 0.9;
      const textX = Math.round(targetWidth * normX);
      const textY = Math.round(targetHeight * normY);

      // SVG text anchor
      let textAnchor = 'middle';
      if (alignment === 'left') textAnchor = 'start';
      if (alignment === 'right') textAnchor = 'end';

      // Shadow filter
      const shadowSvg = config.textConfig.shadow
        ? `
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="${config.textConfig.shadow.offsetX}" dy="${config.textConfig.shadow.offsetY}" stdDeviation="${config.textConfig.shadow.blur / 2}" flood-color="${config.textConfig.shadow.color}" />
          </filter>
        `
        : '';
      const filterAttr = config.textConfig.shadow ? 'filter="url(#shadow)"' : '';

      // Stroke style
      const strokeAttr = config.textConfig.stroke && config.textConfig.stroke.width > 0
        ? `stroke="${config.textConfig.stroke.color}" stroke-width="${config.textConfig.stroke.width}" paint-order="stroke fill"`
        : '';

      const svgOverlay = `
        <svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              ${fontFaceCss}
              .wm-text {
                font-family: '${fontFamily}', sans-serif;
                font-size: ${fontSize}px;
                font-weight: ${fontWeight};
                letter-spacing: ${letterSpacing}px;
                fill: ${color};
                fill-opacity: ${opacity};
              }
            </style>
            ${shadowSvg}
          </defs>
          <g transform="rotate(${rotation}, ${textX}, ${textY})" ${filterAttr}>
            <text x="${textX}" y="${textY}" text-anchor="${textAnchor}" dominant-baseline="middle" class="wm-text" ${strokeAttr}>
              ${text}
            </text>
          </g>
        </svg>
      `;

      composites.push({
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      });
    }

    // 4. Process Tiled Watermark if enabled
    if (config.tiledConfig?.enabled && config.tiledConfig.text) {
      const tileText = escapeXml(config.tiledConfig.text.trim());
      const tileFont = config.tiledConfig.fontFamily === 'Poppins' ? 'Poppins' : 'Outfit';
      const tileFontSize = Math.max(
        10,
        Math.round(Math.min(targetWidth, targetHeight) * (config.tiledConfig.fontSizeRatio || 0.03))
      );
      const tileAngle = config.tiledConfig.angle || -30;
      const tileOpacity = typeof config.tiledConfig.opacity === 'number' ? config.tiledConfig.opacity : 0.18;
      const tileSpacingX = config.tiledConfig.spacingX || 160;
      const tileSpacingY = config.tiledConfig.spacingY || 120;
      const tileColor = config.tiledConfig.color || '#FFFFFF';

      let textElements = '';
      for (let y = -targetHeight * 0.3; y < targetHeight * 1.5; y += tileSpacingY) {
        for (let x = -targetWidth * 0.3; x < targetWidth * 1.5; x += tileSpacingX) {
          textElements += `<text x="${Math.round(x)}" y="${Math.round(y)}" text-anchor="middle" dominant-baseline="middle">${tileText}</text>\n`;
        }
      }

      const tiledSvg = `
        <svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              ${fontFaceCss}
              .tile-text {
                font-family: '${tileFont}', sans-serif;
                font-size: ${tileFontSize}px;
                font-weight: 500;
                letter-spacing: 2px;
                fill: ${tileColor};
                fill-opacity: ${tileOpacity};
              }
            </style>
          </defs>
          <g transform="rotate(${tileAngle}, ${targetWidth / 2}, ${targetHeight / 2})" class="tile-text">
            ${textElements}
          </g>
        </svg>
      `;

      composites.push({
        input: Buffer.from(tiledSvg),
        top: 0,
        left: 0,
      });
    }

    // Apply overlays
    if (composites.length > 0) {
      pipeline = pipeline.composite(composites);
    }

    // Configure output format, quality, and metadata
    const format = outputSettings.format || 'jpeg';
    const quality = Math.min(100, Math.max(10, outputSettings.quality || 90));

    if (outputSettings.stripMetadata) {
      // By default sharp strips EXIF unless withMetadata() is called
    }

    let finalPipeline: sharp.Sharp;
    if (format === 'png') {
      finalPipeline = pipeline.png({ compressionLevel: 8 });
    } else if (format === 'webp') {
      finalPipeline = pipeline.webp({ quality });
    } else {
      finalPipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    const outputBuffer = await finalPipeline.toBuffer();
    const finalMeta = await sharp(outputBuffer).metadata();

    return {
      outputBuffer,
      width: finalMeta.width || targetWidth,
      height: finalMeta.height || targetHeight,
      format,
      fileSize: outputBuffer.length,
    };
  }
}
