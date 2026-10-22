import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { ENV } from '../src/config/env.js';

const app = createApp();

describe('Multi-Tenant Isolation Tests (Company A vs Company B)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }
  });

  let tokenA = '';
  let tokenB = '';
  let companyAId = '';
  let companyBId = '';
  let projectAId = '';
  let templateAId = '';

  it('1. Register Company A', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: `TenantA Jewels ${Date.now()}`,
        ownerName: 'Owner A',
        email: `owner_a_${Date.now()}@tenant-a.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    tokenA = res.body.data.accessToken;
    companyAId = res.body.data.company.id;
  });

  it('2. Register Company B', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: `TenantB Jewels ${Date.now()}`,
        ownerName: 'Owner B',
        email: `owner_b_${Date.now()}@tenant-b.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    tokenB = res.body.data.accessToken;
    companyBId = res.body.data.company.id;
    expect(companyAId).not.toBe(companyBId);
  });

  it('3. Company A creates a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Private Royal Gold Collection A',
        description: 'Company A Secret Jewels',
        tags: ['gold', 'rings'],
      });

    expect(res.status).toBe(201);
    projectAId = res.body.data._id;
  });

  it('4. Company A creates a watermark template', async () => {
    const res = await request(app)
      .post('/api/v1/watermark-templates')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Brand Template A',
        watermarkType: 'text',
        configuration: {
          watermarkType: 'text',
          positionPreset: 'bottom-right',
          scalingPolicy: 'relative',
          marginPercent: 0.04,
          textConfig: {
            enabled: true,
            text: 'COMPANY A EXCLUSIVE',
            fontFamily: 'Outfit',
            fontSizeRatio: 0.05,
            fontWeight: '600',
            color: '#FFFFFF',
            opacity: 0.8,
            rotation: 0,
            letterSpacing: 2,
            alignment: 'center',
            normalizedX: 0.85,
            normalizedY: 0.88,
          },
          logoConfig: { enabled: false, scaleRatio: 0.15, opacity: 0.8, rotation: 0, normalizedX: 0.5, normalizedY: 0.5 },
          tiledConfig: { enabled: false },
        },
      });

    expect(res.status).toBe(201);
    templateAId = res.body.data._id;
  });

  it('5. Company B CANNOT access Project A by ID (Tenant Isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('6. Company B CANNOT access Template A by ID (Tenant Isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/watermark-templates/${templateAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('7. Company B listing projects does NOT show Project A', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    const names = res.body.data.map((p: any) => p.name);
    expect(names).not.toContain('Private Royal Gold Collection A');
  });

  it('8. Company B CANNOT modify Project A', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'Hacked by Company B',
      });

    expect(res.status).toBe(404);
  });
});
