import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { ENV } from '../src/config/env.js';

const app = createApp();

describe('End-to-End Watermarking & Export Pipeline Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }
  });

  let token = '';
  let designId = '';
  let templateId = '';
  let batchId = '';
  let processedAssetId = '';
  let exportId = '';
  let downloadToken = '';

  it('1. Register Company for pipeline test', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: `Pipeline Jewels ${Date.now()}`,
        ownerName: 'Diana Pipeline',
        email: `pipeline_${Date.now()}@pipelinejewels.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    token = res.body.data.accessToken;
  });

  it('2. Upload genuine jewellery image to upload center', async () => {
    // Generate valid 800x600 image buffer with sharp
    const imageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 245, g: 240, b: 230 },
      },
    })
      .jpeg()
      .toBuffer();

    const res = await request(app)
      .post('/api/v1/designs/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('images', imageBuffer, 'diamond_ring.jpg')
      .field('skuPrefix', 'RNG')
      .field('tags', 'rings,diamonds');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);

    designId = res.body.data[0]._id;
    expect(res.body.data[0].originalAssetId).toBeDefined();
  });

  it('3. Create and save a watermark template with normalized coordinates', async () => {
    const res = await request(app)
      .post('/api/v1/watermark-templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Diamond Privé Luxury',
        description: 'Bottom-right gold watermark with Outfit font',
        watermarkType: 'text',
        configuration: {
          watermarkType: 'text',
          positionPreset: 'bottom-right',
          scalingPolicy: 'relative',
          marginPercent: 0.04,
          textConfig: {
            enabled: true,
            text: 'DIAMOND PRIVÉ',
            fontFamily: 'Outfit',
            fontSizeRatio: 0.045,
            fontWeight: '600',
            color: '#B8860B',
            opacity: 0.85,
            rotation: 0,
            letterSpacing: 2,
            alignment: 'center',
            normalizedX: 0.82,
            normalizedY: 0.9,
            shadow: { color: 'rgba(0,0,0,0.4)', blur: 4, offsetX: 2, offsetY: 2 },
          },
          logoConfig: { enabled: false, scaleRatio: 0.15, opacity: 0.8, rotation: 0, normalizedX: 0.5, normalizedY: 0.5 },
          tiledConfig: { enabled: false },
        },
      });

    expect(res.status).toBe(201);
    templateId = res.body.data._id;
  });

  it('4. Start bulk processing batch with saved template', async () => {
    const res = await request(app)
      .post('/api/v1/processing/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        designIds: [designId],
        templateId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    batchId = res.body.data._id;
  });

  it('5. Wait for processing batch to complete and verify processed asset', async () => {
    // Wait for in-process or bullmq async worker to process
    let completed = false;
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .get(`/api/v1/processing/batches/${batchId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.body.data.batch.status === 'completed') {
        completed = true;
        expect(res.body.data.items[0].status).toBe('completed');
        processedAssetId = res.body.data.items[0].outputAssetId._id;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(completed).toBe(true);
    expect(processedAssetId).toBeDefined();
  });

  it('6. Download single processed image', async () => {
    const res = await request(app)
      .get(`/api/v1/assets/${processedAssetId}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('7. Request ZIP export of processed asset', async () => {
    const res = await request(app)
      .post('/api/v1/exports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        assetIds: [processedAssetId],
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    exportId = res.body.data._id;
    downloadToken = res.body.data.downloadToken;
  });

  it('8. Download generated ZIP export archive', async () => {
    // Wait for zip generation
    for (let i = 0; i < 10; i++) {
      const checkRes = await request(app)
        .get(`/api/v1/exports/${exportId}`)
        .set('Authorization', `Bearer ${token}`);
      if (checkRes.body.data.status === 'completed') break;
      await new Promise((r) => setTimeout(r, 300));
    }

    const res = await request(app).get(`/api/v1/exports/download/${downloadToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
  });

  it('9. Verify Dashboard summary reflects uploaded and processed designs', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.totalUploadedImages).toBeGreaterThanOrEqual(1);
    expect(res.body.data.metrics.totalProcessedImages).toBeGreaterThanOrEqual(1);
  });
});
