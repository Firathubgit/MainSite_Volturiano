# Complete Admin Backend Integration Guide

## Executive Summary

This document provides a comprehensive, production-ready guide for implementing the complete backend integration for the Volturiano Admin section. Based on deep analysis of the existing codebase, this guide ensures all frontend components connect to real Supabase data with proper security, performance, and maintainability.

**Current State Analysis:**
- ✅ Frontend: Fully implemented (Manifest Editor, Options Management, Analytics, Settings, Role Management)
- ⚠️ Backend: Partial implementation with mock data fallbacks
- ⚠️ Database: Some tables exist, but missing critical tables and RLS policies
- ⚠️ Storage: Basic setup exists, but missing admin-specific buckets and policies

**Target State:**
- ✅ All API functions use real Supabase queries
- ✅ All database tables exist with proper schemas
- ✅ All RLS policies enforce security correctly
- ✅ All storage buckets configured with proper access controls
- ✅ Complete audit logging for all admin actions
- ✅ Error handling and validation throughout
- ✅ Performance optimizations (indexes, caching, pagination)

---

## Table of Contents

1. [Database Schema Implementation](#database-schema-implementation)
2. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
3. [Supabase Storage Configuration](#supabase-storage-configuration)
4. [API Service Layer Implementation](#api-service-layer-implementation)
5. [Error Handling & Validation](#error-handling--validation)
6. [Performance Optimization](#performance-optimization)
7. [Security Hardening](#security-hardening)
8. [Audit Logging System](#audit-logging-system)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)

---

## Database Schema Implementation

### 1.1 Vehicle Options Table

**Current State:** Table exists in `platform_schema.sql` but may need enhancements.

**Required Schema:**

```sql
-- Enhanced vehicle_options table
CREATE TABLE IF NOT EXISTS vehicle_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('paint', 'wheels', 'interior', 'exterior', 'accessories', 'other')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  configurator_visible BOOLEAN NOT NULL DEFAULT true,
  configurator_group TEXT,
  configurator_order INTEGER DEFAULT 0,
  dependencies JSONB DEFAULT '[]'::jsonb, -- Array of option codes that must be selected
  incompatibilities JSONB DEFAULT '[]'::jsonb, -- Array of option codes that cannot be selected together
  media_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT vehicle_options_vehicle_code_unique UNIQUE (vehicle_id, code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS vehicle_options_vehicle_id_idx ON vehicle_options(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_options_category_idx ON vehicle_options(category);
CREATE INDEX IF NOT EXISTS vehicle_options_configurator_visible_idx ON vehicle_options(configurator_visible);
CREATE INDEX IF NOT EXISTS vehicle_options_configurator_order_idx ON vehicle_options(vehicle_id, configurator_order);
CREATE INDEX IF NOT EXISTS vehicle_options_code_idx ON vehicle_options(code);

-- Updated_at trigger
CREATE TRIGGER vehicle_options_updated_at
  BEFORE UPDATE ON vehicle_options
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

**Key Concepts:**
- **Unique Constraint:** Ensures no duplicate option codes per vehicle
- **JSONB Arrays:** `dependencies` and `incompatibilities` store arrays of option codes for validation
- **Cascade Delete:** When a vehicle is deleted, all its options are automatically deleted
- **Indexes:** Optimize queries by vehicle, category, and configurator visibility

**Migration Path:**
1. Check if table exists: `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_options');`
2. If exists, alter table to add missing columns
3. If not exists, create table with full schema
4. Create indexes
5. Add triggers

---

### 1.2 System Settings Table

**Current State:** Table referenced in code but may not exist.

**Required Schema:**

```sql
-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- JSONB structure:
  -- {
  --   "general": {
  --     "siteName": "Volturiano",
  --     "logoUrl": "",
  --     "locale": "en",
  --     "maintenanceMode": false,
  --     "maintenanceMessage": ""
  --   },
  --   "email": {
  --     "smtpHost": "",
  --     "smtpPort": 587,
  --     "smtpUser": "",
  --     "smtpFrom": ""
  --   },
  --   "features": {
  --     "configurator": true,
  --     "garage": true,
  --     "sharing": true,
  --     "analytics": true
  --   }
  -- }
  
  CONSTRAINT system_settings_id_check CHECK (id = 'default')
);

-- Index for updated_at queries
CREATE INDEX IF NOT EXISTS system_settings_updated_at_idx ON system_settings(updated_at);

-- Updated_at trigger
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Insert default settings
INSERT INTO system_settings (id, settings)
VALUES ('default', '{
  "general": {
    "siteName": "Volturiano",
    "logoUrl": "",
    "locale": "en",
    "maintenanceMode": false,
    "maintenanceMessage": ""
  },
  "email": {
    "smtpHost": "",
    "smtpPort": 587,
    "smtpUser": "",
    "smtpFrom": ""
  },
  "features": {
    "configurator": true,
    "garage": true,
    "sharing": true,
    "analytics": true
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
```

**Key Concepts:**
- **Single Row Pattern:** Only one row with `id = 'default'` ensures single source of truth
- **JSONB Storage:** Flexible schema allows adding new settings without migrations
- **Check Constraint:** Prevents multiple settings rows

---

### 1.3 Admin Permissions Table Enhancement

**Current State:** Table exists in `admin_permissions.sql` but uses different structure than expected by frontend.

**Required Schema Enhancement:**

```sql
-- Enhance admin_permissions table to match frontend expectations
-- Frontend expects: { role, resource, read, write, delete, publish }
-- Current: { role, resource, action }

-- Add columns if they don't exist
ALTER TABLE admin_permissions
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS write BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS publish BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Migrate existing action-based permissions to boolean columns
-- This is a one-time migration
UPDATE admin_permissions
SET 
  read = CASE WHEN action = 'read' OR action = '*' THEN true ELSE false END,
  write = CASE WHEN action = 'write' OR action = '*' THEN true ELSE false END,
  delete = CASE WHEN action = 'delete' OR action = '*' THEN true ELSE false END,
  publish = CASE WHEN action = 'publish' OR action = '*' THEN true ELSE false END
WHERE read IS NULL OR write IS NULL;

-- Add unique constraint for (role, resource) if not exists
CREATE UNIQUE INDEX IF NOT EXISTS admin_permissions_role_resource_unique 
  ON admin_permissions(role, resource);

-- Updated_at trigger
CREATE TRIGGER admin_permissions_updated_at
  BEFORE UPDATE ON admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

**Key Concepts:**
- **Backward Compatibility:** Migrate existing action-based permissions to boolean columns
- **Unique Constraint:** One permission record per role-resource combination
- **Boolean Flags:** More intuitive than action strings for frontend

---

### 1.4 Audit Logs Table Enhancement

**Current State:** Table exists as `admin_audit_logs` in `admin_role_schema.sql`.

**Required Enhancements:**

```sql
-- Enhance admin_audit_logs table
ALTER TABLE admin_audit_logs
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '{}'::jsonb; -- Track what changed

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_resource_idx 
  ON admin_audit_logs(admin_id, resource_type, created_at DESC);

-- Add index for action filtering
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx 
  ON admin_audit_logs(action, created_at DESC);

-- Function to automatically log admin actions (called from RPC)
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_admin_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Get current admin ID
  v_admin_id := auth.uid();
  
  -- Get IP address and user agent from request context (if available)
  -- These would be set by Edge Function or middleware
  v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for'::inet;
  v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
  
  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    v_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    v_ip_address,
    v_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Retention policy: Auto-delete logs older than 1 year
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM admin_audit_logs
  WHERE created_at < now() - INTERVAL '1 year';
END;
$$;

-- Schedule cleanup (run daily via pg_cron if available)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');
```

**Key Concepts:**
- **Security Definer:** Function runs with elevated privileges to bypass RLS
- **IP Address Tracking:** Helps with security auditing and fraud detection
- **Retention Policy:** Automatically clean up old logs to manage storage
- **Changes Tracking:** JSONB field stores before/after values for updates

---

### 1.5 Manifest Table Enhancement

**Current State:** Table exists as `config_2d_manifests` in `configurator_2d_schema.sql`.

**Required Enhancements:**

```sql
-- Enhance config_2d_manifests table
ALTER TABLE config_2d_manifests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS config_2d_manifests_status_idx 
  ON config_2d_manifests(status) WHERE status IN ('draft', 'published', 'archived');

-- Add index for published manifests (most common query)
CREATE INDEX IF NOT EXISTS config_2d_manifests_published_idx 
  ON config_2d_manifests(slug, status) WHERE status = 'published';

-- Function to validate manifest JSON structure
CREATE OR REPLACE FUNCTION validate_manifest_structure(manifest_data JSONB)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  errors TEXT[];
BEGIN
  -- Check required fields
  IF NOT (manifest_data ? 'layers') THEN
    errors := array_append(errors, 'Missing required field: layers');
  END IF;
  
  IF NOT (manifest_data ? 'variants') THEN
    errors := array_append(errors, 'Missing required field: variants');
  END IF;
  
  -- Validate layers is an array
  IF jsonb_typeof(manifest_data->'layers') != 'array' THEN
    errors := array_append(errors, 'layers must be an array');
  END IF;
  
  -- Validate variants is an array
  IF jsonb_typeof(manifest_data->'variants') != 'array' THEN
    errors := array_append(errors, 'variants must be an array');
  END IF;
  
  -- Check for circular dependencies (simplified check)
  -- Full check should be done client-side with DFS algorithm
  
  RETURN errors;
END;
$$;

-- Function to auto-increment version on publish
CREATE OR REPLACE FUNCTION increment_manifest_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only increment if status changed to published
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    -- Get max version for this slug
    SELECT COALESCE(MAX(version), 0) + 1
    INTO NEW.version
    FROM config_2d_manifests
    WHERE slug = NEW.slug;
    
    -- Set published_at timestamp
    NEW.published_at := now();
  END IF;
  
  -- Set archived_at if status changed to archived
  IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
    NEW.archived_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS config_2d_manifests_version_trigger ON config_2d_manifests;
CREATE TRIGGER config_2d_manifests_version_trigger
  BEFORE UPDATE ON config_2d_manifests
  FOR EACH ROW
  EXECUTE FUNCTION increment_manifest_version();
```

**Key Concepts:**
- **Partial Indexes:** Index only published manifests for faster queries
- **JSONB Validation:** Server-side validation ensures data integrity
- **Auto-increment Version:** Trigger automatically increments version on publish
- **Archived Tracking:** Track when manifests were archived for audit purposes

---

## Row Level Security (RLS) Policies

### 2.1 Vehicle Options RLS Policies

**Current State:** Basic admin access policy exists, but needs refinement.

**Required Policies:**

```sql
-- Enable RLS
ALTER TABLE vehicle_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "vehicle_options_admin_access" ON vehicle_options;
DROP POLICY IF EXISTS "vehicle_options_read_all" ON vehicle_options;

-- Policy 1: All authenticated users can read visible options
CREATE POLICY "vehicle_options_read_visible"
ON vehicle_options
FOR SELECT
USING (
  configurator_visible = true
  OR is_admin() -- Admins can see all options
);

-- Policy 2: Content admins and super admins can create
CREATE POLICY "vehicle_options_admin_create"
ON vehicle_options
FOR INSERT
WITH CHECK (
  has_admin_role('content_admin')
);

-- Policy 3: Content admins and super admins can update
CREATE POLICY "vehicle_options_admin_update"
ON vehicle_options
FOR UPDATE
USING (has_admin_role('content_admin'))
WITH CHECK (has_admin_role('content_admin'));

-- Policy 4: Only super admins can delete
CREATE POLICY "vehicle_options_super_admin_delete"
ON vehicle_options
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
```

**Key Concepts:**
- **Granular Permissions:** Different policies for different operations
- **Role Hierarchy:** `has_admin_role()` function checks role hierarchy
- **Public Read:** Regular users can read visible options for configurator
- **Admin Write:** Only admins can modify options

---

### 2.2 System Settings RLS Policies

**Required Policies:**

```sql
-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy 1: All admins can read settings
CREATE POLICY "system_settings_admin_read"
ON system_settings
FOR SELECT
USING (is_admin());

-- Policy 2: Only super admins can update
CREATE POLICY "system_settings_super_admin_update"
ON system_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy 3: Only super admins can insert (create default)
CREATE POLICY "system_settings_super_admin_insert"
ON system_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
```

---

### 2.3 Manifest RLS Policies Enhancement

**Current State:** Basic policies exist, but need admin-specific policies.

**Required Policies:**

```sql
-- Policy 1: Everyone can read published manifests
CREATE POLICY "config_2d_manifests_read_published"
ON config_2d_manifests
FOR SELECT
USING (
  status = 'published'
  OR is_admin() -- Admins can read all
);

-- Policy 2: Content admins and super admins can create
CREATE POLICY "config_2d_manifests_admin_create"
ON config_2d_manifests
FOR INSERT
WITH CHECK (
  has_admin_role('content_admin')
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) IN ('content_admin', 'super_admin')
);

-- Policy 3: Content admins and super admins can update
CREATE POLICY "config_2d_manifests_admin_update"
ON config_2d_manifests
FOR UPDATE
USING (has_admin_role('content_admin'))
WITH CHECK (has_admin_role('content_admin'));

-- Policy 4: Only super admins can delete
CREATE POLICY "config_2d_manifests_super_admin_delete"
ON config_2d_manifests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
```

---

## Supabase Storage Configuration

### 3.1 Storage Buckets Setup

**Required Buckets:**

```sql
-- Note: Buckets must be created via Supabase Dashboard or API
-- SQL policies are applied after bucket creation

-- 1. vehicle-options bucket (for option images)
-- Create via: INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-options', 'vehicle-options', false);

-- 2. manifests bucket (for manifest assets)
-- Create via: INSERT INTO storage.buckets (id, name, public) VALUES ('manifests', 'manifests', false);

-- 3. system-assets bucket (for logos, etc.)
-- Create via: INSERT INTO storage.buckets (id, name, public) VALUES ('system-assets', 'system-assets', true);
```

### 3.2 Storage RLS Policies

```sql
-- Vehicle Options Bucket Policies

-- Policy 1: Admins can upload to vehicle-options
CREATE POLICY "vehicle_options_admin_upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-options'
  AND is_admin()
);

-- Policy 2: Everyone can read from vehicle-options (for configurator)
CREATE POLICY "vehicle_options_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vehicle-options');

-- Policy 3: Admins can update/delete vehicle-options files
CREATE POLICY "vehicle_options_admin_manage"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'vehicle-options'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'vehicle-options'
  AND is_admin()
);

CREATE POLICY "vehicle_options_admin_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'vehicle-options'
  AND is_admin()
);

-- Manifests Bucket Policies (similar pattern)

-- System Assets Bucket Policies
-- Public read, super admin write
```

**Key Concepts:**
- **Bucket-Level Security:** Policies apply to entire buckets
- **Path-Based Access:** Can restrict access by file path patterns
- **Public vs Private:** Public buckets don't need signed URLs

---

## API Service Layer Implementation

### 4.1 Content API Enhancements

**File:** `web/src/features/admin/api/content.js`

**Current Issues:**
- ✅ Basic CRUD operations implemented
- ⚠️ Missing error handling for missing tables
- ⚠️ Missing validation
- ⚠️ Missing transaction support for complex operations

**Enhanced Implementation:**

```javascript
import { supabase } from '../../../lib/supabaseClient';
import { logAdminAction } from './adminClient';

/**
 * Enhanced getOptions with better error handling and validation
 */
export async function getOptions(filters = {}) {
  const {
    vehicleId = null,
    category = null,
    search = null,
    visible = null,
    page = 1,
    limit = 50
  } = filters;

  try {
    let query = supabase
      .from('vehicle_options')
      .select('*', { count: 'exact' });

    // Apply filters
    if (vehicleId && vehicleId !== 'all') {
      query = query.eq('vehicle_id', vehicleId);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,label.ilike.%${search}%`);
    }

    if (visible !== null) {
      query = query.eq('configurator_visible', visible);
    }

    query = query.order('configurator_order', { ascending: true });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    // Handle table doesn't exist error gracefully
    if (error) {
      if (error.code === '42P01') {
        console.warn('[content] vehicle_options table does not exist');
        return { data: [], count: 0 };
      }
      throw error;
    }

    // Transform to app format
    const transformed = (data || []).map(opt => ({
      id: opt.id,
      vehicleId: opt.vehicle_id,
      category: opt.category,
      code: opt.code,
      label: opt.label,
      description: opt.description,
      priceCents: opt.price_cents || 0,
      currency: opt.currency || 'EUR',
      mediaUrl: opt.media_url,
      configuratorVisible: opt.configurator_visible !== false,
      configuratorGroup: opt.configurator_group,
      configuratorOrder: opt.configurator_order,
      dependencies: opt.dependencies || [],
      incompatibilities: opt.incompatibilities || [],
      updatedAt: opt.updated_at || opt.created_at
    }));

    return { data: transformed, count: count || 0 };
  } catch (error) {
    console.error('[content] Error fetching options:', error);
    throw new Error(`Failed to fetch options: ${error.message}`);
  }
}

/**
 * Enhanced createOption with validation
 */
export async function createOption(optionData) {
  // Validate required fields
  if (!optionData.vehicleId) {
    throw new Error('vehicleId is required');
  }
  if (!optionData.code) {
    throw new Error('code is required');
  }
  if (!optionData.label) {
    throw new Error('label is required');
  }

  // Validate code uniqueness (client-side check, server will also enforce)
  const existing = await supabase
    .from('vehicle_options')
    .select('id')
    .eq('vehicle_id', optionData.vehicleId)
    .eq('code', optionData.code)
    .single();

  if (existing.data) {
    throw new Error(`Option with code "${optionData.code}" already exists for this vehicle`);
  }

  // Transform to database format
  const dbData = {
    vehicle_id: optionData.vehicleId,
    category: optionData.category || 'other',
    code: optionData.code,
    label: optionData.label,
    description: optionData.description,
    price_cents: optionData.priceCents || 0,
    currency: optionData.currency || 'EUR',
    media_url: optionData.mediaUrl,
    configurator_visible: optionData.configuratorVisible !== false,
    configurator_group: optionData.configuratorGroup,
    configurator_order: optionData.configuratorOrder || 0,
    dependencies: optionData.dependencies || [],
    incompatibilities: optionData.incompatibilities || []
  };

  try {
    const { data, error } = await supabase
      .from('vehicle_options')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await logAdminAction('option_created', 'vehicle_option', data.id, {
      vehicleId: optionData.vehicleId,
      code: optionData.code,
      label: optionData.label
    });

    // Transform back to app format
    return {
      id: data.id,
      vehicleId: data.vehicle_id,
      category: data.category,
      code: data.code,
      label: data.label,
      description: data.description,
      priceCents: data.price_cents || 0,
      currency: data.currency || 'EUR',
      mediaUrl: data.media_url,
      configuratorVisible: data.configurator_visible !== false,
      configuratorGroup: data.configurator_group,
      configuratorOrder: data.configurator_order,
      dependencies: data.dependencies || [],
      incompatibilities: data.incompatibilities || [],
      updatedAt: data.updated_at || data.created_at
    };
  } catch (error) {
    console.error('[content] Error creating option:', error);
    
    // Provide user-friendly error messages
    if (error.code === '23505') { // Unique violation
      throw new Error(`Option with code "${optionData.code}" already exists for this vehicle`);
    }
    if (error.code === '23503') { // Foreign key violation
      throw new Error('Invalid vehicle ID');
    }
    
    throw new Error(`Failed to create option: ${error.message}`);
  }
}

/**
 * Enhanced uploadImage with better error handling
 */
export async function uploadImage(file, bucket = 'vehicle-options', path = 'options') {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  try {
    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error(`Storage bucket "${bucket}" does not exist. Please create it in Supabase Dashboard.`);
      }
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    // Log admin action
    await logAdminAction('image_uploaded', 'storage', null, {
      bucket,
      path: uploadData.path,
      fileName: file.name,
      fileSize: file.size
    });

    return publicUrl;
  } catch (error) {
    console.error('[content] Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}
```

**Key Concepts:**
- **Error Handling:** Graceful handling of missing tables, validation errors
- **User-Friendly Messages:** Transform technical errors into readable messages
- **Validation:** Client-side validation before API calls
- **Transaction Support:** Use Supabase transactions for complex operations

---

### 4.2 Analytics API Enhancements

**File:** `web/src/features/admin/api/analytics.js`

**Current Issues:**
- ⚠️ Some functions return mock data
- ⚠️ Missing date range aggregation
- ⚠️ Missing error handling

**Enhanced Implementation:**

```javascript
/**
 * Enhanced getAnalyticsData with real queries
 */
export async function getAnalyticsData({ timeRange = '7d' } = {}) {
  try {
    // Calculate date range
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Start of day

    // Get daily activity (garage items created per day)
    const { data: garageData, error: garageError } = await supabase
      .from('garage_items')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (garageError) {
      console.error('[analytics] Error fetching garage data:', garageError);
      // Continue with empty data
    }

    // Aggregate daily activity
    const dailyMap = {};
    (garageData || []).forEach(item => {
      const date = new Date(item.created_at);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1;
    });

    // Fill in missing days with 0
    const dailyActivity = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyActivity.push({
        date: dayName,
        fullDate: dayKey,
        count: dailyMap[dayKey] || 0
      });
    }

    // Get signup trends (profiles created per week)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (profileError) {
      console.error('[analytics] Error fetching profile data:', profileError);
    }

    // Aggregate by week
    const weekMap = {};
    (profileData || []).forEach(profile => {
      const date = new Date(profile.created_at);
      const weekStart = getWeekStart(date);
      weekMap[weekStart] = (weekMap[weekStart] || 0) + 1;
    });

    const signupTrends = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: formatWeekLabel(date),
        count
      }));

    // Feature usage (calculate from audit logs)
    const { data: featureData } = await supabase
      .from('admin_audit_logs')
      .select('action')
      .gte('created_at', startDate.toISOString())
      .in('action', ['configurator_used', 'garage_created', 'share_created']);

    const featureCounts = {
      configurator: 0,
      garage: 0,
      sharing: 0
    };

    (featureData || []).forEach(log => {
      if (log.action === 'configurator_used') featureCounts.configurator++;
      if (log.action === 'garage_created') featureCounts.garage++;
      if (log.action === 'share_created') featureCounts.sharing++;
    });

    const total = featureCounts.configurator + featureCounts.garage + featureCounts.sharing;
    const featureUsage = total > 0 ? [
      { name: 'Configurator', value: Math.round((featureCounts.configurator / total) * 100) },
      { name: 'Garage', value: Math.round((featureCounts.garage / total) * 100) },
      { name: 'Sharing', value: Math.round((featureCounts.sharing / total) * 100) }
    ] : [
      { name: 'Configurator', value: 0 },
      { name: 'Garage', value: 0 },
      { name: 'Sharing', value: 0 }
    ];

    // Top users (from audit logs)
    const { data: topUsersData } = await supabase
      .from('admin_audit_logs')
      .select('admin_id, created_at, profiles!admin_audit_logs_admin_id_fkey(display_name, email)')
      .gte('created_at', startDate.toISOString())
      .not('admin_id', 'is', null);

    const userActivityMap = {};
    (topUsersData || []).forEach(log => {
      const userId = log.admin_id;
      if (!userActivityMap[userId]) {
        userActivityMap[userId] = {
          userId,
          email: log.profiles?.email || log.profiles?.display_name || 'Unknown',
          count: 0,
          lastActive: log.created_at
        };
      }
      userActivityMap[userId].count++;
      if (new Date(log.created_at) > new Date(userActivityMap[userId].lastActive)) {
        userActivityMap[userId].lastActive = log.created_at;
      }
    });

    const topUsers = Object.values(userActivityMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        email: user.email,
        count: user.count,
        lastActive: formatRelativeTime(user.lastActive)
      }));

    return {
      dailyActivity,
      signupTrends: signupTrends.length > 0 ? signupTrends : getEmptyWeeks(days),
      featureUsage,
      topUsers: topUsers.length > 0 ? topUsers : []
    };
  } catch (err) {
    console.error('[analytics] Error fetching analytics data:', err);
    // Return empty data structure on error
    return {
      dailyActivity: getEmptyDays(7),
      signupTrends: getEmptyWeeks(4),
      featureUsage: [
        { name: 'Configurator', value: 0 },
        { name: 'Garage', value: 0 },
        { name: 'Sharing', value: 0 }
      ],
      topUsers: []
    };
  }
}

// Helper functions
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function formatWeekLabel(dateStr) {
  const date = new Date(dateStr);
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return date.toLocaleDateString();
}

function getEmptyDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - i - 1));
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: 0
    };
  });
}

function getEmptyWeeks(count) {
  return Array.from({ length: count }, (_, i) => ({
    date: `Week ${i + 1}`,
    count: 0
  }));
}
```

---

## Error Handling & Validation

### 5.1 Standardized Error Format

**Create:** `web/src/features/admin/utils/errors.js`

```javascript
/**
 * Standardized error response format
 */
export class AdminError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Error codes
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
};

/**
 * Map Supabase errors to AdminError
 */
export function mapSupabaseError(error) {
  // RLS violation
  if (error.code === '42501' || error.message?.includes('permission denied')) {
    return new AdminError(ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action');
  }

  // Not found
  if (error.code === 'PGRST116') {
    return new AdminError(ERROR_CODES.NOT_FOUND, 'Resource not found');
  }

  // Unique violation
  if (error.code === '23505') {
    return new AdminError(ERROR_CODES.DUPLICATE_ENTRY, 'A record with this value already exists', {
      constraint: error.details
    });
  }

  // Foreign key violation
  if (error.code === '23503') {
    return new AdminError(ERROR_CODES.VALIDATION_ERROR, 'Invalid reference to related resource');
  }

  // Table doesn't exist
  if (error.code === '42P01') {
    return new AdminError(ERROR_CODES.DATABASE_ERROR, 'Database table does not exist. Please run migrations.');
  }

  // Default
  return new AdminError(ERROR_CODES.SERVER_ERROR, error.message || 'An unexpected error occurred', {
    originalError: error
  });
}

/**
 * Error handling wrapper for API functions
 */
export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Log error
      console.error(`[API Error] ${fn.name}:`, error);

      // Transform to AdminError if needed
      if (error instanceof AdminError) {
        throw error;
      }

      // Map Supabase errors
      if (error.code) {
        throw mapSupabaseError(error);
      }

      // Unknown error
      throw new AdminError(ERROR_CODES.SERVER_ERROR, error.message || 'An unexpected error occurred');
    }
  };
}
```

---

### 5.2 Validation Schemas

**Create:** `web/src/features/admin/utils/validation.js`

```javascript
/**
 * Validation schemas for admin forms
 */

export function validateOption(optionData) {
  const errors = [];

  if (!optionData.vehicleId) {
    errors.push({ field: 'vehicleId', message: 'Vehicle is required' });
  }

  if (!optionData.code || optionData.code.trim().length === 0) {
    errors.push({ field: 'code', message: 'Option code is required' });
  } else if (!/^[a-z0-9_-]+$/i.test(optionData.code)) {
    errors.push({ field: 'code', message: 'Option code can only contain letters, numbers, hyphens, and underscores' });
  }

  if (!optionData.label || optionData.label.trim().length === 0) {
    errors.push({ field: 'label', message: 'Option label is required' });
  }

  if (optionData.priceCents < 0) {
    errors.push({ field: 'priceCents', message: 'Price cannot be negative' });
  }

  if (optionData.dependencies && !Array.isArray(optionData.dependencies)) {
    errors.push({ field: 'dependencies', message: 'Dependencies must be an array' });
  }

  if (optionData.incompatibilities && !Array.isArray(optionData.incompatibilities)) {
    errors.push({ field: 'incompatibilities', message: 'Incompatibilities must be an array' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateManifest(manifestData) {
  const errors = [];

  if (!manifestData.id && !manifestData.slug) {
    errors.push({ field: 'id', message: 'Manifest must have an id or slug' });
  }

  if (!manifestData.vehicleModel && !manifestData.vehicleId) {
    errors.push({ field: 'vehicleModel', message: 'Manifest must specify vehicleModel or vehicleId' });
  }

  if (!Array.isArray(manifestData.layers)) {
    errors.push({ field: 'layers', message: 'Manifest must have a layers array' });
  } else if (manifestData.layers.length === 0) {
    errors.push({ field: 'layers', message: 'Manifest must have at least one layer' });
  }

  if (!Array.isArray(manifestData.variants)) {
    errors.push({ field: 'variants', message: 'Manifest must have a variants array' });
  } else if (manifestData.variants.length === 0) {
    errors.push({ field: 'variants', message: 'Manifest must have at least one variant' });
  }

  // Validate layers
  if (Array.isArray(manifestData.layers)) {
    manifestData.layers.forEach((layer, index) => {
      if (!layer.id) {
        errors.push({ field: `layers[${index}].id`, message: 'Layer must have an id' });
      }
      if (!layer.name) {
        errors.push({ field: `layers[${index}].name`, message: 'Layer must have a name' });
      }
    });
  }

  // Validate variants
  if (Array.isArray(manifestData.variants)) {
    manifestData.variants.forEach((variant, index) => {
      if (!variant.id) {
        errors.push({ field: `variants[${index}].id`, message: 'Variant must have an id' });
      }
      if (!variant.name) {
        errors.push({ field: `variants[${index}].name`, message: 'Variant must have a name' });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSystemSettings(settings) {
  const errors = [];

  if (settings.general) {
    if (settings.general.siteName && settings.general.siteName.length > 100) {
      errors.push({ field: 'general.siteName', message: 'Site name cannot exceed 100 characters' });
    }
    if (settings.general.locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(settings.general.locale)) {
      errors.push({ field: 'general.locale', message: 'Invalid locale format (expected: en, en-US, etc.)' });
    }
  }

  if (settings.email) {
    if (settings.email.smtpPort && (settings.email.smtpPort < 1 || settings.email.smtpPort > 65535)) {
      errors.push({ field: 'email.smtpPort', message: 'SMTP port must be between 1 and 65535' });
    }
    if (settings.email.smtpFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email.smtpFrom)) {
      errors.push({ field: 'email.smtpFrom', message: 'Invalid email address format' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Performance Optimization

### 6.1 Database Indexes

**Create:** `supabase/sql/admin_performance_indexes.sql`

```sql
-- Performance indexes for admin queries

-- Vehicle options indexes
CREATE INDEX IF NOT EXISTS vehicle_options_vehicle_category_idx 
  ON vehicle_options(vehicle_id, category) 
  WHERE configurator_visible = true;

CREATE INDEX IF NOT EXISTS vehicle_options_search_idx 
  ON vehicle_options USING gin(to_tsvector('english', coalesce(code, '') || ' ' || coalesce(label, '')));

-- Manifest indexes
CREATE INDEX IF NOT EXISTS config_2d_manifests_slug_status_idx 
  ON config_2d_manifests(slug, status);

CREATE INDEX IF NOT EXISTS config_2d_manifests_data_gin_idx 
  ON config_2d_manifests USING gin(data);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_created_idx 
  ON admin_audit_logs(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_idx 
  ON admin_audit_logs(resource_type, resource_id, created_at DESC);

-- Profiles indexes for user management
CREATE INDEX IF NOT EXISTS profiles_role_created_idx 
  ON profiles(role, created_at DESC);

-- Garage items indexes for analytics
CREATE INDEX IF NOT EXISTS garage_items_created_at_idx 
  ON garage_items(created_at DESC);
```

**Key Concepts:**
- **Composite Indexes:** Index multiple columns together for common query patterns
- **Partial Indexes:** Index only rows matching a condition (e.g., `WHERE configurator_visible = true`)
- **GIN Indexes:** Full-text search indexes for JSONB and text search
- **Covering Indexes:** Include frequently selected columns to avoid table lookups

---

### 6.2 Query Optimization

**Best Practices:**

1. **Use Select Specific Columns:** Don't use `SELECT *`
   ```javascript
   // Bad
   .select('*')
   
   // Good
   .select('id, code, label, category, price_cents')
   ```

2. **Limit Results:** Always use pagination
   ```javascript
   .range(from, to)
   ```

3. **Use Count Efficiently:** Use `head: true` for count-only queries
   ```javascript
   .select('*', { count: 'exact', head: true })
   ```

4. **Batch Operations:** Use transactions for multiple related operations
   ```javascript
   const { data, error } = await supabase.rpc('batch_create_options', {
     options: optionsArray
   });
   ```

5. **Avoid N+1 Queries:** Use joins or batch queries
   ```javascript
   // Bad: N queries
   for (const vehicle of vehicles) {
     const options = await getOptions({ vehicleId: vehicle.id });
   }
   
   // Good: 1 query
   const allOptions = await getOptions({});
   const optionsByVehicle = groupBy(allOptions, 'vehicleId');
   ```

---

## Security Hardening

### 7.1 Input Sanitization

**Create:** `web/src/features/admin/utils/sanitize.js`

```javascript
/**
 * Sanitize user input to prevent injection attacks
 */

export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

export function sanitizeCode(code) {
  if (typeof code !== 'string') return '';
  
  // Only allow alphanumeric, hyphens, underscores
  return code.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
}

export function sanitizeJSONB(input) {
  if (typeof input !== 'object' || input === null) return null;
  
  // Deep clone and sanitize
  const sanitized = JSON.parse(JSON.stringify(input));
  
  // Recursively sanitize strings
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}
```

---

### 7.2 Rate Limiting

**Implement via Supabase Edge Function or middleware:**

```javascript
// Edge Function: rate-limit.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RATE_LIMIT = {
  window: 60000, // 1 minute
  maxRequests: 100
};

const requestCounts = new Map();

serve(async (req) => {
  const userId = req.headers.get('x-user-id');
  const now = Date.now();
  
  // Clean old entries
  for (const [key, value] of requestCounts.entries()) {
    if (now - value.windowStart > RATE_LIMIT.window) {
      requestCounts.delete(key);
    }
  }
  
  // Check rate limit
  const key = `${userId}-${Math.floor(now / RATE_LIMIT.window)}`;
  const count = requestCounts.get(key) || { count: 0, windowStart: now };
  
  if (count.count >= RATE_LIMIT.maxRequests) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  count.count++;
  requestCounts.set(key, count);
  
  // Continue with request
  // ...
});
```

---

## Audit Logging System

### 8.1 Enhanced Audit Logging

**Update:** `web/src/features/admin/api/adminClient.js`

```javascript
/**
 * Enhanced logAdminAction with better error handling and context
 */
export async function logAdminAction(action, resourceType, resourceId = null, details = {}) {
  try {
    // Get request context (if available)
    const ipAddress = getClientIP();
    const userAgent = navigator.userAgent;
    
    // Call RPC function
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });
    
    if (error) {
      // Don't throw - logging failures shouldn't break operations
      console.error('[AdminClient] Failed to log admin action:', error);
      
      // Fallback: Log to console in development
      if (import.meta.env.DEV) {
        console.log('[Admin Action]', {
          action,
          resourceType,
          resourceId,
          details,
          timestamp: new Date().toISOString()
        });
      }
      
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[AdminClient] Error logging admin action:', error);
    return null;
  }
}

function getClientIP() {
  // Try to get IP from various sources
  // In production, this would come from request headers (Edge Function)
  return 'unknown';
}
```

---

## Testing Strategy

### 9.1 Unit Tests

**Create:** `web/src/features/admin/api/__tests__/content.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOptions, createOption } from '../content';
import { supabase } from '../../../../lib/supabaseClient';

vi.mock('../../../../lib/supabaseClient');

describe('Content API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOptions', () => {
    it('should fetch options with filters', async () => {
      const mockData = [
        { id: '1', vehicle_id: 'v1', code: 'opt1', label: 'Option 1' }
      ];
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
          count: 1
        })
      });

      const result = await getOptions({ vehicleId: 'v1' });
      
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should handle missing table gracefully', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockRejectedValue({ code: '42P01' })
      });

      const result = await getOptions({});
      
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
});
```

---

## Deployment Checklist

### 10.1 Pre-Deployment

- [ ] Run all database migrations in staging
- [ ] Verify all RLS policies are correct
- [ ] Test all API endpoints with different admin roles
- [ ] Verify storage buckets exist and have correct policies
- [ ] Test file uploads and downloads
- [ ] Verify audit logging works
- [ ] Check error handling for edge cases
- [ ] Performance test with large datasets
- [ ] Security audit (check for SQL injection, XSS vulnerabilities)

### 10.2 Deployment Steps

1. **Database Migrations:**
   ```bash
   # Run migrations in order
   psql $DATABASE_URL -f supabase/sql/admin_role_schema.sql
   psql $DATABASE_URL -f supabase/sql/admin_permissions.sql
   psql $DATABASE_URL -f supabase/sql/admin_rls_policies.sql
   psql $DATABASE_URL -f supabase/sql/admin_performance_indexes.sql
   ```

2. **Storage Setup:**
   - Create buckets via Supabase Dashboard
   - Apply storage policies via SQL

3. **Environment Variables:**
   - Verify all required env vars are set
   - Check Supabase URL and keys

4. **Frontend Build:**
   ```bash
   npm run build
   ```

5. **Deploy:**
   - Deploy frontend to hosting
   - Verify all routes work
   - Test admin login

### 10.3 Post-Deployment

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify audit logs are being created
- [ ] Test all admin workflows
- [ ] Monitor database query performance
- [ ] Check storage usage
- [ ] Set up alerts for critical errors

---

## Conclusion

This comprehensive guide provides everything needed to implement a production-ready admin backend. Follow the phases in order, test thoroughly at each step, and ensure security and performance are prioritized throughout.

**Key Takeaways:**
1. **Security First:** Always implement RLS policies before exposing data
2. **Error Handling:** Graceful error handling improves UX
3. **Performance:** Indexes and query optimization are critical
4. **Audit Logging:** Track all admin actions for security and compliance
5. **Testing:** Test with different roles and edge cases

**Next Steps:**
1. Start with Phase 1 (Database Schema)
2. Implement RLS policies
3. Update API functions
4. Add error handling
5. Optimize performance
6. Deploy and monitor

Good luck with your implementation! 🚀

