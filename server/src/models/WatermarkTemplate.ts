import mongoose, { Schema, Document, Types } from 'mongoose';

export type WatermarkType = 'text' | 'logo' | 'combined' | 'tiled';
export type PositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export type ScalingPolicy = 'relative' | 'fixed' | 'contain' | 'cover';

export interface ITextWatermarkConfig {
  enabled: boolean;
  text: string;
  fontFamily: 'Outfit' | 'Poppins';
  fontSizeRatio: number; // e.g. 0.04 = 4% of image min dimension
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  color: string;
  opacity: number; // 0 to 1
  rotation: number; // degrees
  letterSpacing: number; // px relative
  alignment: 'left' | 'center' | 'right';
  normalizedX: number; // 0 to 1
  normalizedY: number; // 0 to 1
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ILogoWatermarkConfig {
  enabled: boolean;
  logoAssetId?: Types.ObjectId;
  logoUrl?: string;
  scaleRatio: number; // width relative to image width, e.g. 0.15 = 15%
  opacity: number; // 0 to 1
  rotation: number; // degrees
  normalizedX: number; // 0 to 1
  normalizedY: number; // 0 to 1
}

export interface ITiledWatermarkConfig {
  enabled: boolean;
  text?: string;
  fontFamily?: 'Outfit' | 'Poppins';
  fontSizeRatio?: number;
  opacity?: number;
  angle?: number;
  spacingX?: number;
  spacingY?: number;
  color?: string;
}

export interface IWatermarkConfiguration {
  watermarkType: WatermarkType;
  positionPreset: PositionPreset;
  scalingPolicy: ScalingPolicy;
  marginPercent: number; // Safe margin e.g. 0.03 = 3%
  textConfig: ITextWatermarkConfig;
  logoConfig: ILogoWatermarkConfig;
  tiledConfig: ITiledWatermarkConfig;
}

export interface IWatermarkTemplate extends Document {
  companyId: Types.ObjectId;
  name: string;
  description?: string;
  watermarkType: WatermarkType;
  configuration: IWatermarkConfiguration;
  version: number;
  isDefault: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WatermarkTemplateSchema = new Schema<IWatermarkTemplate>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    watermarkType: {
      type: String,
      enum: ['text', 'logo', 'combined', 'tiled'],
      default: 'text',
      index: true,
    },
    configuration: {
      watermarkType: { type: String, default: 'text' },
      positionPreset: { type: String, default: 'bottom-right' },
      scalingPolicy: { type: String, enum: ['relative', 'fixed', 'contain', 'cover'], default: 'relative' },
      marginPercent: { type: Number, default: 0.04 },
      textConfig: {
        enabled: { type: Boolean, default: true },
        text: { type: String, default: 'AURUM JEWELS' },
        fontFamily: { type: String, enum: ['Outfit', 'Poppins'], default: 'Outfit' },
        fontSizeRatio: { type: Number, default: 0.045 },
        fontWeight: { type: String, default: '600' },
        color: { type: String, default: '#FFFFFF' },
        opacity: { type: Number, default: 0.8 },
        rotation: { type: Number, default: 0 },
        letterSpacing: { type: Number, default: 2 },
        alignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
        normalizedX: { type: Number, default: 0.85 },
        normalizedY: { type: Number, default: 0.9 },
        stroke: {
          color: { type: String, default: '#000000' },
          width: { type: Number, default: 1 },
        },
        shadow: {
          color: { type: String, default: 'rgba(0,0,0,0.4)' },
          blur: { type: Number, default: 4 },
          offsetX: { type: Number, default: 2 },
          offsetY: { type: Number, default: 2 },
        },
      },
      logoConfig: {
        enabled: { type: Boolean, default: false },
        logoAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
        logoUrl: { type: String, default: '' },
        scaleRatio: { type: Number, default: 0.15 },
        opacity: { type: Number, default: 0.85 },
        rotation: { type: Number, default: 0 },
        normalizedX: { type: Number, default: 0.85 },
        normalizedY: { type: Number, default: 0.85 },
      },
      tiledConfig: {
        enabled: { type: Boolean, default: false },
        text: { type: String, default: 'AURUM JEWELS' },
        fontFamily: { type: String, enum: ['Outfit', 'Poppins'], default: 'Outfit' },
        fontSizeRatio: { type: Number, default: 0.03 },
        opacity: { type: Number, default: 0.2 },
        angle: { type: Number, default: -30 },
        spacingX: { type: Number, default: 150 },
        spacingY: { type: Number, default: 100 },
        color: { type: String, default: '#FFFFFF' },
      },
    },
    version: { type: Number, default: 1 },
    isDefault: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WatermarkTemplateSchema.index({ companyId: 1, name: 1 });

export const WatermarkTemplate = mongoose.model<IWatermarkTemplate>(
  'WatermarkTemplate',
  WatermarkTemplateSchema
);
