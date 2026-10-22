# AurumMark — Jewellery Watermark Management Software
### Enterprise MERN Stack SaaS | Strictly 3 Roles: Company, Designer, and Viewer Only

A complete, production-ready Jewellery Watermark Management Web Application architected for jewellery manufacturers, wholesalers, retailers, exporters, casting houses, and design studios.

AurumMark empowers jewellery enterprises to catalog high-resolution jewellery photography, visually design text and logo watermarks on reference pieces with millimeter-precise Konva canvas positioning, and automatically execute Sharp-powered bulk rendering across thousands of catalogue images with normalized coordinates, resilient background job queues, multi-tenant workspace isolation, and streaming ZIP downloads.

---

## 💎 Key Highlights

- **Strict 3-Role Architecture**: Exclusively **Company** (Workspace Owner), **Designer** (Studio Operator), and **Viewer** (Read-Only Catalogue Client). **No Super Admin, Platform Admin, or System Admin exists.**
- **Strict Role-Based UI Access Control (RBAC)**: Any button, navigation item, modal action, or page that a specific role does not have permission for is **completely hidden from their view** and guarded by server-side middleware and route barriers.
- **Master Photo Protection**: Raw unwatermarked original photography is strictly protected. Viewers can only view showroom watermarked copies and can never download raw master files.
- **100% Light-Theme Design System**: Clean luxury jewellery SaaS aesthetic (`#FFFFFF` cards/modals, `#F8FAFC` background, `#7C3AED` primary violet, and `#B8860B` warm gold accent). **No dark mode or theme toggles.**
- **Outfit & Poppins Typography**: Headings, badges, and action buttons rendered strictly in **Outfit**; descriptions, tables, and form inputs rendered in **Poppins**.
- **Interactive Watermark Studio with Konva**: Visual drag-and-drop watermark placement, 9-point grid presets, real-time font scaling, opacity controls, tiled patterns, and server-parity verification.
- **Normalized Coordinate Parity**: Watermarks translate identically across square social posts, portrait bridal lookbooks, and landscape wholesale sheets using normalized coordinates `(0.0 to 1.0)`.
- **True Font Server Rasterization with Sharp**: Embedded true TTF font files (`Outfit` and `Poppins`) inside base64 SVG overlays for pixel-perfect server-side rendering on any operating system.
- **Dual Viewing & Comparison**: Switch entire galleries or individual cards between Watermarked Copies, Original Master Uploads, and Side-by-Side Comparison modes.
- **Flexible ZIP & Single Exports**: Download individual watermarked images, single master photos, Watermarked ZIPs, Raw Master ZIPs, or structured Dual ZIP bundles (`originals/` and `watermarked/`).
- **Standardized Delete Modals (`ConfirmDeleteModal`)**: Unified, polished confirmation modal with item name display, destructive styling, and loading states used across all deletion and revocation flows.
- **7-Day Invitation Lifecycle**: Secure team invitation links that expire in 7 days, with instant clipboard link copying and one-click re-invitation.
- **Dedicated Account Settings**: Comprehensive profile editing, password changing, and active session device management.
- **Resilient Background Queues**: BullMQ + Redis job processing with an automatic asynchronous in-process worker fallback so batches process seamlessly whether Redis is running or offline.
- **Comprehensive Test Suite**: **28 out of 28 unit, integration, and security tests passing** covering multi-tenant isolation, role restrictions, and end-to-end watermarking.

---

## 🏛️ Architecture & Strict 3-Role System

```
                      ┌──────────────────────────────────────────────┐
                      │             SHARED AUTHENTICATION            │
                      │       JWT Sessions + Active Tenant Context   │
                      └──────────────────────┬───────────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│     ROLE A: COMPANY     │     │    ROLE B: DESIGNER     │     │     ROLE C: VIEWER      │
│  (Business Workspace)   │     │ (Watermark Operations)  │     │  (Read-Only Catalogue)  │
├─────────────────────────┤     ├─────────────────────────┤     ├─────────────────────────┤
│ • Workspace Owner       │     │ • Upload Jewellery      │     │ • Browse Authorized Sets│
│ • Manage Team & Invites │     │ • Visual Watermark Ed.  │     │ • High-Res Inspection   │
│ • Role Assignment       │     │ • Run Bulk Processing   │     │ • Side-by-Side Compare  │
│ • Manage Collections    │     │ • Save/Edit Templates   │     │ • Download Processed    │
│ • Configure Policies    │     │ • Preview Parity        │     │   (If Allowed by Policy)│
│ • Quota & Audit Logs    │     │ • Download Permitted    │     │ • Check Job Status      │
│ • Export ZIP Archives   │     │ • Export Permitted ZIP  │     │ • Account Settings      │
│ ❌ Cannot promote to Co.│     │ ❌ Cannot invite/admin  │     │ ❌ Cannot upload/edit   │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

### Role Capabilities & UI Access Matrix

| Capability / Action | Company (Owner) | Designer | Viewer |
| :--- | :---: | :---: | :---: |
| **Workspace Admin (Profile, Team, Invites, Roles)** | ✅ Full Access | ❌ Completely Hidden | ❌ Completely Hidden |
| **Storage Usage & Compliance Activity Logs** | ✅ Full Access | ❌ Completely Hidden | ❌ Completely Hidden |
| **Create New Jewellery Collections** | ✅ Yes | ✅ (If Permitted by Owner) | ❌ Completely Hidden |
| **Upload Jewellery Images (JPEG, PNG, WebP)** | ✅ Yes | ✅ (If `canUpload: true`) | ❌ Completely Hidden |
| **Interactive Watermark Studio (Canvas)** | ✅ Yes | ✅ (If Permitted) | ❌ Completely Hidden |
| **Create & Duplicate Watermark Templates** | ✅ Yes | ✅ (If `canCreateTemplate: true`) | ❌ Completely Hidden |
| **Set Workspace Default Watermark Template** | ✅ Yes | ❌ Hidden | ❌ Hidden |
| **Execute Bulk Watermark Processing** | ✅ Yes | ✅ (If `canProcess: true`) | ❌ Completely Hidden |
| **Cancel or Retry Processing Jobs** | ✅ Yes | ✅ (If `canProcess: true`) | ❌ Completely Hidden |
| **Delete Jewellery Designs (Trash Icon)** | ✅ Yes | ✅ (If `canDeleteDesign: true`) | ❌ Completely Hidden |
| **Inspect & Split-Compare Jewellery Designs** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Download Watermarked Single Image** | ✅ Yes | ✅ Yes | ✅ (If Policy Enabled) |
| **Download Watermarked ZIP Archive** | ✅ Yes | ✅ (If `canExportZip: true`) | ✅ (If Policy Enabled) |
| **Download Raw Unwatermarked Master Photos** | ✅ Yes | ✅ Yes | 🚫 **Strictly Blocked & Hidden** |
| **Download Masters ZIP / Dual ZIP Bundle** | ✅ Yes | ✅ Yes | 🚫 **Strictly Blocked & Hidden** |
| **Download History Navigation & Page** | ✅ Yes | ✅ (If `canExportZip: true`) | ✅ (If Downloads Enabled) |
| **Account Profile & Security Settings** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🎨 Pure Light-Theme Design Tokens

AurumMark enforces a strict, premium light-theme design system. Dark mode is intentionally omitted to maintain a bright, true-color environment essential for jewellery inspection and photography:

- **Surface & Cards (`White`)**: `#FFFFFF`
- **Background (`Slate Ultra-Light`)**: `#F8FAFC`
- **Primary Accent (`Royal Violet`)**: `#7C3AED`
- **Primary Hover**: `#6D28D9`
- **Luxury Gold Accent (`Dark Goldenrod`)**: `#B8860B`
- **Main Text (`Slate Dark`)**: `#1E293B`
- **Muted Text (`Slate Gray`)**: `#64748B`
- **Borders & Dividers**: `#E2E8F0`
- **Success (`Emerald`)**: `#16A34A`
- **Warning (`Amber`)**: `#D97706`
- **Error (`Rose Red`)**: `#DC2626`
- **Typography Standards**:
  - Headings, badges, navigation, and buttons: `Outfit`
  - Descriptions, data tables, and input fields: `Poppins`

---

## 🗄️ MongoDB Database Architecture (13 Models)

1. **`User`**: Core user accounts storing `name`, `email`, `passwordHash`, `phone`, `status`, `emailVerifiedAt`, and `resetPasswordToken`.
2. **`Company`**: Workspace tenant storing `name`, `slug`, `logoAssetId`, `contact`, `settings` (`allowViewerDownload`, `allowViewerZipDownload`, `allowDesignerCreateProject`, `sanitizeMetadata`, `defaultOutputFormat`, `defaultQuality`), `storageQuota`, and `storageUsage`.
3. **`CompanyMembership`**: Multi-tenant link connecting users to workspaces with specific roles (`Company` | `Designer` | `Viewer`) and granular `permissions` (`canUpload`, `canDeleteDesign`, `canCreateProject`, `canCreateTemplate`, `canEditTemplate`, `canProcess`, `canExportZip`).
4. **`Invitation`**: Secure team invitations storing `companyId`, `email`, `invitedRole` (`Designer` | `Viewer`), `tokenHash`, `expiresAt` (7-day validity), and `acceptedAt`.
5. **`Project`**: Jewellery lines, collections, and series storing `companyId`, `name`, `description`, `tags`, `coverAssetId`, `defaultWatermarkTemplateId`, and `createdBy`.
6. **`Design`**: Individual jewellery pieces storing `companyId`, `projectId`, `originalAssetId`, `processedAssetIds`, `activeProcessedAssetId`, `filename`, `sku`, `metadata` (width, height, aspect ratio), `uploadStatus`, and `processingStatus`.
7. **`Asset`**: Physical file records storing `companyId`, `storageKey`, `originalFilename`, `assetType` (`original`, `processed`, `logo`, `export_zip`), `mimeType`, `fileSize`, `checksum`, `width`, `height`, and `lifecycleStatus`.
8. **`WatermarkTemplate`**: Saved configurations storing `companyId`, `name`, `description`, `watermarkType` (`text`, `logo`, `tiled`), `configuration` (normalized coordinates, opacity, rotation, font family, scaling policy), `version`, and `isDefault`.
9. **`ProcessingBatch`**: Bulk watermarking jobs storing `companyId`, `requestedBy`, `templateSnapshot`, `outputSettings` (format, quality, strip metadata), `counters` (`total`, `completed`, `failed`, `cancelled`), and `status`.
10. **`ProcessingItem`**: Item-level render status within a batch storing `companyId`, `batchId`, `designId`, `sourceAssetId`, `outputAssetId`, `status`, `attempts`, and `errorDetails`.
11. **`Export`**: Generated ZIP packages storing `companyId`, `requestedBy`, `selectedAssetIds`, `archiveStorageKey`, `status`, `fileCount`, `archiveSize`, `downloadToken`, and `expiresAt`.
12. **`SingleDownload`**: Audit trail logging every single image download with `companyId`, `designId`, `assetId`, `assetType`, `filename`, `sku`, `downloadedBy`, and `ipAddress`.
13. **`ActivityLog`**: Comprehensive compliance log storing `companyId`, `actorId`, `action`, `resourceType`, `resourceId`, `metadata`, `ipAddress`, and `userAgent`.
14. **`RefreshSession`**: Multi-device JWT refresh sessions storing `userId`, `hashedToken`, `expiresAt`, `isRevoked`, `userAgent`, and `ipAddress` with automated MongoDB TTL index cleanup.

---

## 🔌 Complete REST API Endpoints (`/api/v1`)

### Authentication & Sessions
- `POST /api/v1/auth/register` — Register company and create workspace owner account
- `POST /api/v1/auth/login` — Sign in and retrieve active company session
- `POST /api/v1/auth/logout` — Revoke refresh token session
- `POST /api/v1/auth/refresh` — Issue fresh access token from refresh cookie
- `POST /api/v1/auth/switch-company` — Switch active workspace context
- `POST /api/v1/auth/invitations/accept` — Accept team invitation as Designer or Viewer
- `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me` — Current user profile, active company, and memberships
- `PATCH /api/v1/auth/profile` — Update name and phone number
- `POST /api/v1/auth/change-password` — Change password with current verification
- `GET /api/v1/auth/sessions` — List active login sessions and devices
- `DELETE /api/v1/auth/sessions/:sessionId` — Revoke a specific remote session
- `POST /api/v1/auth/revoke-other-sessions` — Log out from all other devices

### Company Administration
- `GET /api/v1/companies/current` — Get workspace details, quota, and settings
- `PATCH /api/v1/companies/current` — Update company settings (Company only)
- `GET /api/v1/companies/current/members` — List all workspace members and roles
- `POST /api/v1/companies/current/invitations` — Generate 7-day invitation link
- `GET /api/v1/companies/current/invitations` — List pending unaccepted invitations
- `POST /api/v1/companies/current/invitations/:invitationId/resend` — Extend & renew invitation token
- `DELETE /api/v1/companies/current/invitations/:invitationId` — Revoke invitation
- `PATCH /api/v1/companies/current/members/:memberId` — Change member role (Designer ↔ Viewer)
- `PATCH /api/v1/companies/current/members/:memberId/permissions` — Update granular Designer permissions
- `DELETE /api/v1/companies/current/members/:memberId` — Remove member from workspace

### Projects & Collections
- `GET /api/v1/projects` — List collections with design counts
- `POST /api/v1/projects` — Create collection (Company or authorized Designer)
- `GET /api/v1/projects/:projectId` — Single collection details
- `PATCH /api/v1/projects/:projectId` — Update collection name, description, tags
- `DELETE /api/v1/projects/:projectId` — Delete collection and dissociate designs

### Designs & Uploads
- `GET /api/v1/designs` — Filter designs by collection, status, search SKU / filename
- `POST /api/v1/designs/upload` — Multi-file streaming upload with Sharp validation
- `GET /api/v1/designs/:designId` — Single design with asset history
- `PATCH /api/v1/designs/:designId` — Update SKU and tags
- `DELETE /api/v1/designs/:designId` — Delete design and associated assets

### Watermark Templates & Studio
- `GET /api/v1/watermark-templates` — List saved watermark templates
- `POST /api/v1/watermark-templates` — Save template with normalized coordinates
- `POST /api/v1/watermark-templates/preview` — Server-parity Sharp render preview
- `GET /api/v1/watermark-templates/:templateId` — Single template details
- `PATCH /api/v1/watermark-templates/:templateId` — Update template configuration
- `POST /api/v1/watermark-templates/:templateId/duplicate` — Clone existing template
- `DELETE /api/v1/watermark-templates/:templateId` — Delete watermark template

### Processing Queue
- `POST /api/v1/processing/batches` — Queue background bulk watermarking
- `GET /api/v1/processing/batches` — List processing batches
- `GET /api/v1/processing/batches/:batchId` — Batch progress and individual item status
- `POST /api/v1/processing/batches/:batchId/retry` — Retry failed queue items
- `POST /api/v1/processing/batches/:batchId/cancel` — Cancel active processing batch

### Downloads & Exports
- `POST /api/v1/exports` — Request background streaming ZIP export
- `GET /api/v1/exports` — List export history
- `GET /api/v1/exports/single-downloads` — List individual image download records
- `GET /api/v1/exports/download/:token` — Stream generated ZIP file
- `GET /api/v1/assets/:assetId/view` — Stream private image for in-app viewing
- `GET /api/v1/assets/:assetId/download` — Download individual image file

### Dashboard & Analytics
- `GET /api/v1/dashboard/summary` — Workspace metrics (uploads, processed, storage, active jobs)
- `GET /api/v1/dashboard/activity` — Real-time audit log feed

---

## 🧪 Automated Testing Verification

All tests are implemented using **Vitest** and **Supertest** against live MongoDB instances:

```bash
cd "d:\ASAVAN PROJECT\JewelleryWatermarkManagement\server"
npm test
```

### Test Results Summary (28 of 28 Passing):
```text
Test Files  3 passed (3)
Tests       28 passed (28)

✓ tests/tenant-isolation.test.ts (8 tests)
  ✓ 1. Register Company A
  ✓ 2. Register Company B
  ✓ 3. Company A creates a project
  ✓ 4. Company A creates a watermark template
  ✓ 5. Company B CANNOT access Project A by ID (Tenant Isolation)
  ✓ 6. Company B CANNOT access Template A by ID (Tenant Isolation)
  ✓ 7. Company B listing projects does NOT show Project A
  ✓ 8. Company B CANNOT modify Project A

✓ tests/auth-and-roles.test.ts (11 tests)
  ✓ 1. Register a new Company and grant Company role
  ✓ 2. Company can invite a Designer
  ✓ 3. Company can invite a Viewer
  ✓ 4. Company CANNOT invite unsupported roles (e.g. SuperAdmin)
  ✓ 5. Designer accepts invitation and receives Designer role
  ✓ 6. Viewer accepts invitation and receives Viewer role
  ✓ 7. Viewer is REJECTED (403) from uploading images
  ✓ 8. Viewer is REJECTED (403) from creating watermark templates
  ✓ 9. Viewer is REJECTED (403) from starting image processing batches
  ✓ 10. Designer CAN create a watermark template
  ✓ 11. Designer is REJECTED (403) from modifying company settings

✓ tests/watermark-pipeline.test.ts (9 tests)
  ✓ 1. Register Company for pipeline test
  ✓ 2. Upload genuine jewellery image to upload center
  ✓ 3. Create and save a watermark template with normalized coordinates
  ✓ 4. Start bulk processing batch with saved template
  ✓ 5. Wait for processing batch to complete and verify processed asset
  ✓ 6. Download single processed image
  ✓ 7. Request ZIP export of processed asset
  ✓ 8. Download generated ZIP export archive
  ✓ 9. Verify Dashboard summary reflects uploaded and processed designs
```

---

## 🚀 Quickstart & Manual Startup Instructions

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v20 & v26)
- **MongoDB**: Running locally on `127.0.0.1:27017`
- **Redis** *(Optional)*: Running on `127.0.0.1:6379`. If Redis is offline, AurumMark automatically falls back to its built-in asynchronous in-process queue worker.

### 2. Environment Configuration
Both `server/.env` and `client/.env` are pre-configured:

#### `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/jewellery_watermark_db
REDIS_URL=redis://127.0.0.1:6379

JWT_ACCESS_SECRET=jewellery_watermark_jwt_access_secret_super_secure_key_12345!
JWT_REFRESH_SECRET=jewellery_watermark_jwt_refresh_secret_super_secure_key_67890!
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

STORAGE_DIR=./uploads
EXPORT_DIR=./temp-exports
CLIENT_URL=http://localhost:5173

# Cloudinary Storage Integration (Images & Document Uploads)
CLOUDINARY_CLOUD_NAME=do3m8poei
CLOUDINARY_API_KEY=985752235434523
CLOUDINARY_API_SECRET=DpAN5tEr8OjwDiAEhObrTvZwd0M
STORAGE_PROVIDER=cloudinary
```

#### `client/.env`:
```env
VITE_API_URL=/api/v1
VITE_APP_NAME="AurumMark Jewellery Watermark Management"
VITE_CLOUDINARY_CLOUD_NAME=do3m8poei
```

### 3. Start the Application Manually

#### Terminal 1 — Backend API Server (Port 5000):
```bash
cd "d:\ASAVAN PROJECT\JewelleryWatermarkManagement\server"
npm run dev
```

#### Terminal 2 — Frontend Client (Port 5173):
```bash
cd "d:\ASAVAN PROJECT\JewelleryWatermarkManagement\client"
npm run dev
```

Open your browser at **`http://localhost:5173`**.

You can register a new Company workspace at **`/register`**, create collections, upload high-resolution jewellery photography, customize watermarks in the interactive studio, and invite team members.

---

## 🔒 Security & Data Isolation Specifications

1. **Strict 3-Role Constraint**: Role assignment is hard-coded into Mongoose enums and runtime middleware. Promotion to `Company` or creation of any arbitrary 4th role is blocked at both the database schema and controller level.
2. **Normalized Coordinates**: `x` and `y` coordinates are stored as floats from `0.0` to `1.0`. Watermarks adapt automatically without distortion across square Instagram squares, portrait bridal catalogues, and landscape wholesale sheets.
3. **SVG Font Parity & Sanitization**: Watermark text is escaped against XML/SVG injection attacks. Google Fonts `Outfit` and `Poppins` are base64-embedded directly into SVG `@font-face` definitions so Sharp renders the exact font vectors identically across Windows, Linux, and macOS.
4. **Tenant Isolation**: Every database query, asset access, upload handler, and export stream validates that `companyId` matches the authenticated JWT token. Cross-tenant access attempts return 403 Forbidden.
5. **Non-Destructive Originals**: Original jewellery photography files are permanently immutable and stored separately from rendered watermarked outputs.
