import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import { CompanyMembership } from './models/CompanyMembership.js';
import { Project } from './models/Project.js';
import { WatermarkTemplate } from './models/WatermarkTemplate.js';
import { Design } from './models/Design.js';
import { StorageService } from './services/storage.js';

async function seed() {
  console.log('Seeding jewellery watermark database...');
  await connectDB();

  // Clear existing demo company if exists
  const existingCompany = await Company.findOne({ slug: 'solitaire-jewels' });
  if (existingCompany) {
    console.log('Cleaning up old demo data...');
    await Design.deleteMany({ companyId: existingCompany._id });
    await Project.deleteMany({ companyId: existingCompany._id });
    await WatermarkTemplate.deleteMany({ companyId: existingCompany._id });
    await CompanyMembership.deleteMany({ companyId: existingCompany._id });
    await Company.deleteOne({ _id: existingCompany._id });
  }

  // 1. Create Company
  const company = await Company.create({
    name: 'Solitaire Privé Jewels',
    slug: 'solitaire-jewels',
    contact: {
      email: 'owner@solitairejewels.com',
      phone: '+1 (212) 555-0199',
      website: 'https://solitaireprivé.com',
      address: '48 West 48th St, New York Diamond District',
    },
    settings: {
      defaultOutputFormat: 'jpeg',
      defaultQuality: 90,
      allowViewerDownload: true,
      allowViewerZipDownload: true,
      allowDesignerCreateProject: true,
      sanitizeMetadata: true,
    },
    storageQuota: 5 * 1024 * 1024 * 1024,
    storageUsage: 0,
    status: 'active',
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 2. Create Users for the 3 Roles
  const ownerUser = await User.create({
    name: 'Victoria Solitaire',
    email: 'owner@solitairejewels.com',
    passwordHash,
    status: 'active',
    emailVerifiedAt: new Date(),
  });

  const designerUser = await User.create({
    name: 'Marcus Vance',
    email: 'designer@solitairejewels.com',
    passwordHash,
    status: 'active',
    emailVerifiedAt: new Date(),
  });

  const viewerUser = await User.create({
    name: 'Sophia Wholesaler',
    email: 'viewer@solitairejewels.com',
    passwordHash,
    status: 'active',
    emailVerifiedAt: new Date(),
  });

  // 3. Create Memberships
  await CompanyMembership.create({
    companyId: company._id,
    userId: ownerUser._id,
    role: 'Company',
    permissions: {
      canUpload: true,
      canProcess: true,
      canCreateTemplate: true,
      canEditTemplate: true,
      canDeleteDesign: true,
      canExportZip: true,
      canInviteMembers: true,
      canCreateProject: true,
    },
    status: 'active',
  });

  await CompanyMembership.create({
    companyId: company._id,
    userId: designerUser._id,
    role: 'Designer',
    permissions: {
      canUpload: true,
      canProcess: true,
      canCreateTemplate: true,
      canEditTemplate: true,
      canDeleteDesign: true,
      canExportZip: true,
      canInviteMembers: false,
      canCreateProject: true,
    },
    status: 'active',
    invitedBy: ownerUser._id,
  });

  await CompanyMembership.create({
    companyId: company._id,
    userId: viewerUser._id,
    role: 'Viewer',
    permissions: {
      canUpload: false,
      canProcess: false,
      canCreateTemplate: false,
      canEditTemplate: false,
      canDeleteDesign: false,
      canExportZip: false,
      canInviteMembers: false,
      canCreateProject: false,
    },
    status: 'active',
    invitedBy: ownerUser._id,
  });

  // 4. Create Project Collections
  const bridalProject = await Project.create({
    companyId: company._id,
    name: 'Bridal Solitaire Rings 2026',
    description: 'Platinum and 18K yellow gold engagement rings featuring VVS diamonds.',
    tags: ['bridal', 'rings', 'solitaire', 'diamond'],
    createdBy: ownerUser._id,
    status: 'active',
  });

  const necklaceProject = await Project.create({
    companyId: company._id,
    name: 'Royal Heritage Necklaces',
    description: 'Art-deco emerald and diamond pendant necklaces for luxury export.',
    tags: ['necklaces', 'emerald', 'export', 'wholesale'],
    createdBy: designerUser._id,
    status: 'active',
  });

  // 5. Create Default Watermark Template
  const defaultTemplate = await WatermarkTemplate.create({
    companyId: company._id,
    name: 'Solitaire Privé — Bottom Right Luxury',
    description: 'Gold italicized brand stamp positioned at safe bottom-right boundary',
    watermarkType: 'text',
    configuration: {
      watermarkType: 'text',
      positionPreset: 'bottom-right',
      scalingPolicy: 'relative',
      marginPercent: 0.04,
      textConfig: {
        enabled: true,
        text: 'SOLITAIRE PRIVÉ',
        fontFamily: 'Outfit',
        fontSizeRatio: 0.045,
        fontWeight: '600',
        color: '#FFFFFF',
        opacity: 0.85,
        rotation: 0,
        letterSpacing: 2,
        alignment: 'center',
        normalizedX: 0.82,
        normalizedY: 0.9,
        shadow: { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 },
      },
      logoConfig: { enabled: false, scaleRatio: 0.15, opacity: 0.85, rotation: 0, normalizedX: 0.85, normalizedY: 0.85 },
      tiledConfig: { enabled: false },
    },
    version: 1,
    isDefault: true,
    createdBy: ownerUser._id,
    updatedBy: ownerUser._id,
  });

  // 6. Create Demo Jewellery Image Assets using Sharp
  const sampleJewellery = [
    { name: 'Diamond_Solitaire_Ring_18K.jpg', sku: 'RNG-SOL-001', color: { r: 248, g: 245, b: 238 }, proj: bridalProject._id },
    { name: 'Princess_Cut_Halo_Ring.jpg', sku: 'RNG-HAL-002', color: { r: 245, g: 240, b: 230 }, proj: bridalProject._id },
    { name: 'Royal_Emerald_Choker.jpg', sku: 'NCK-EMR-101', color: { r: 235, g: 245, b: 235 }, proj: necklaceProject._id },
    { name: 'Sapphire_Cascade_Pendant.jpg', sku: 'NCK-SAP-102', color: { r: 235, g: 240, b: 250 }, proj: necklaceProject._id },
  ];

  for (const item of sampleJewellery) {
    const dummyBuffer = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        background: item.color,
      },
    })
      .jpeg()
      .toBuffer();

    const asset = await StorageService.saveUploadedBuffer({
      companyId: company._id.toString(),
      buffer: dummyBuffer,
      originalFilename: item.name,
      mimeType: 'image/jpeg',
      assetType: 'original',
    });

    await Design.create({
      companyId: company._id,
      projectId: item.proj,
      originalAssetId: asset._id,
      processedAssetIds: [],
      activeProcessedAssetId: null,
      filename: item.name,
      sku: item.sku,
      tags: ['jewellery', 'catalogue'],
      metadata: { width: 1200, height: 900, format: 'jpeg', size: dummyBuffer.length, aspectRatio: 1.33 },
      uploadedBy: ownerUser._id,
      uploadStatus: 'completed',
      processingStatus: 'unprocessed',
    });
  }

  console.log('\n======================================================');
  console.log('✅ Demo Seed Data Created Successfully!');
  console.log('======================================================');
  console.log('Demo Company:  Solitaire Privé Jewels');
  console.log('Company Owner: owner@solitairejewels.com    / Password123!');
  console.log('Designer:      designer@solitairejewels.com / Password123!');
  console.log('Viewer:        viewer@solitairejewels.com   / Password123!');
  console.log('======================================================\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
