import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { ENV } from '../src/config/env.js';

const app = createApp();

describe('Strict 3-Role System & Authorization Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }
  });

  afterAll(async () => {
    // Cleanup test collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (key.includes('test')) {
        await collections[key].deleteMany({});
      }
    }
  });

  let companyToken = '';
  let companyId = '';
  let designerToken = '';
  let viewerToken = '';
  let designerInviteToken = '';
  let viewerInviteToken = '';

  it('1. Should register a new Company and grant Company role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        companyName: `RoleTest Jewels ${Date.now()}`,
        ownerName: 'Alice Owner',
        email: `alice_${Date.now()}@testjewels.com`,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Company');
    expect(res.body.data.accessToken).toBeDefined();

    companyToken = res.body.data.accessToken;
    companyId = res.body.data.company.id;
  });

  it('2. Company can invite a Designer', async () => {
    const res = await request(app)
      .post('/api/v1/companies/current/invitations')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        email: `designer_${Date.now()}@testjewels.com`,
        role: 'Designer',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Designer');
    expect(res.body.data.inviteToken).toBeDefined();

    designerInviteToken = res.body.data.inviteToken;
  });

  it('3. Company can invite a Viewer', async () => {
    const res = await request(app)
      .post('/api/v1/companies/current/invitations')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        email: `viewer_${Date.now()}@testjewels.com`,
        role: 'Viewer',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Viewer');
    expect(res.body.data.inviteToken).toBeDefined();

    viewerInviteToken = res.body.data.inviteToken;
  });

  it('4. Company CANNOT invite unsupported roles (e.g. SuperAdmin / Admin)', async () => {
    const res = await request(app)
      .post('/api/v1/companies/current/invitations')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        email: `admin_${Date.now()}@testjewels.com`,
        role: 'SuperAdmin',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. Designer accepts invitation and receives Designer role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: designerInviteToken,
        name: 'Bob Designer',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Designer');

    designerToken = res.body.data.accessToken;
  });

  it('6. Viewer accepts invitation and receives Viewer role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/invitations/accept')
      .send({
        token: viewerInviteToken,
        name: 'Charlie Viewer',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Viewer');

    viewerToken = res.body.data.accessToken;
  });

  it('7. Viewer is REJECTED (403) from uploading images', async () => {
    const dummyImage = Buffer.from('fake image content');
    const res = await request(app)
      .post('/api/v1/designs/upload')
      .set('Authorization', `Bearer ${viewerToken}`)
      .attach('images', dummyImage, 'jewel.jpg');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Viewer');
  });

  it('8. Viewer is REJECTED (403) from creating watermark templates', async () => {
    const res = await request(app)
      .post('/api/v1/watermark-templates')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Unauthorized Template',
        watermarkType: 'text',
        configuration: {
          watermarkType: 'text',
          positionPreset: 'center',
          scalingPolicy: 'relative',
          marginPercent: 0.04,
          textConfig: { enabled: true, text: 'HACK' },
          logoConfig: { enabled: false },
          tiledConfig: { enabled: false },
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('9. Viewer is REJECTED (403) from starting image processing batches', async () => {
    const res = await request(app)
      .post('/api/v1/processing/batches')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        designIds: [new mongoose.Types.ObjectId().toString()],
        templateSnapshot: { watermarkType: 'text' },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('10. Designer CAN create a watermark template', async () => {
    const res = await request(app)
      .post('/api/v1/watermark-templates')
      .set('Authorization', `Bearer ${designerToken}`)
      .send({
        name: 'Designer Gold Signature',
        description: 'Template created by designer',
        watermarkType: 'text',
        configuration: {
          watermarkType: 'text',
          positionPreset: 'bottom-right',
          scalingPolicy: 'relative',
          marginPercent: 0.04,
          textConfig: {
            enabled: true,
            text: 'GOLD SIGNATURE',
            fontFamily: 'Outfit',
            fontSizeRatio: 0.04,
            fontWeight: '600',
            color: '#B8860B',
            opacity: 0.85,
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
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Designer Gold Signature');
  });

  it('11. Designer is REJECTED (403) from modifying company settings', async () => {
    const res = await request(app)
      .patch('/api/v1/companies/current')
      .set('Authorization', `Bearer ${designerToken}`)
      .send({
        name: 'Hacked Company Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
