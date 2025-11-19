// Supabase Edge Function: generate-pdf (Standalone Version)
// This is a single-file version for manual deployment through Supabase Dashboard
// All utility functions are inlined here

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// Use npm specifier for PDFKit (Supabase Edge Functions support npm: imports)
import PDFDocument from 'npm:pdfkit@0.14.0';

// ============================================================================
// SUPABASE CLIENT UTILITIES (from _shared/supabase-client.ts)
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables. Make sure SERVICE_ROLE_KEY secret is set.');
}

function createServiceRoleClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Decode JWT token to extract user information
 * Supabase JWTs are base64url encoded JSON
 */
function decodeJWT(token: string): { userId?: string; email?: string; exp?: number } | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[generate-pdf] Invalid JWT format');
      return null;
    }
    
    // Decode payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    
    return {
      userId: parsed.sub || parsed.user_id || parsed.id,
      email: parsed.email,
      exp: parsed.exp
    };
  } catch (error) {
    console.error('[generate-pdf] Error decoding JWT:', error);
    return null;
  }
}

// ============================================================================
// IMAGE LOADER UTILITIES (from utils/image-loader.ts)
// ============================================================================

async function loadImageForPdf(url: string, maxWidth: number = 800, maxHeight: number = 600): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[ImageLoader] Failed to fetch image: ${url} (${response.status})`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...buffer));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`[ImageLoader] Error loading image ${url}:`, error);
    return null;
  }
}

function getBestImageUrl(configPayload: any): string | null {
  if (!configPayload) return null;
  if (configPayload.media?.heroImage) return configPayload.media.heroImage;
  if (Array.isArray(configPayload.media?.gallery) && configPayload.media.gallery.length > 0) {
    return configPayload.media.gallery[0];
  }
  if (configPayload.thumbnail_url) return configPayload.thumbnail_url;
  return null;
}

// ============================================================================
// QR CODE UTILITIES (from utils/qr-generator.ts)
// ============================================================================

async function generateQRCode(shareUrl: string): Promise<string | null> {
  try {
    // Use npm package for QR code generation
    const QRCode = await import('npm:qrcode@1.5.3');
    
    // Generate QR code as PNG buffer for better PDF compatibility
    const qrBuffer = await QRCode.default.toBuffer(shareUrl, {
      type: 'png',
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    });
    
    // Convert buffer to base64 data URL
    const base64 = btoa(String.fromCharCode(...qrBuffer));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('[QRGenerator] Error generating QR code:', error);
    console.error('[QRGenerator] Error details:', error);
    return null;
  }
}

async function getOrCreateShareLink(supabase: any, garageItemId: string, userId: string): Promise<string | null> {
  try {
    // Check for any existing valid (non-expired) share links for this item
    const { data: existingLinks, error: fetchError } = await supabase
      .from('garage_share_links')
      .select('share_code, expires_at')
      .eq('garage_item_id', garageItemId)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (fetchError) {
      console.error('[QRGenerator] Error fetching share links:', fetchError);
      // Continue to create new link even if fetch fails
    }
    
    // Check if we have a valid (non-expired) link
    if (existingLinks && existingLinks.length > 0) {
      const link = existingLinks[0];
      const now = new Date();
      const expiresAt = link.expires_at ? new Date(link.expires_at) : null;
      
      // If link doesn't expire or hasn't expired yet, use it
      if (!expiresAt || expiresAt > now) {
        console.log('[QRGenerator] Using existing share link:', link.share_code);
        return link.share_code;
      }
      console.log('[QRGenerator] Existing link expired, creating new one');
    }
    
    // Create new share link - public and expires in 1 week
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 1 week from now
    
    console.log('[QRGenerator] Creating new share link - public, expires:', expiresAt.toISOString());
    
    const { data: newLink, error: createError } = await supabase.rpc('create_share_link', {
      p_garage_item_id: garageItemId,
      p_privacy: 'public', // Changed to public as requested
      p_expires_at: expiresAt.toISOString() // Expires in 1 week
    });
    
    if (createError) {
      console.error('[QRGenerator] Error creating share link:', createError);
      return null;
    }
    
    console.log('[QRGenerator] New share link created:', newLink?.share_code);
    return newLink?.share_code || null;
  } catch (error) {
    console.error('[QRGenerator] Exception getting/creating share link:', error);
    return null;
  }
}

// ============================================================================
// PDF TEMPLATE BUILDER (from utils/pdf-template.ts)
// ============================================================================

function buildPdfTemplate(
  vehicleData: any,
  options: any = {},
  shareUrl?: string,
  qrCodeDataUrl?: string,
  heroImageDataUrl?: string,
  qrCodeBuffer?: Uint8Array
): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `${vehicleData.title} - Specification Sheet`,
      Author: 'Volturiano',
      Subject: 'Vehicle Configuration Specification',
      Creator: 'Volturiano Configurator'
    }
  });

  const { watermark = false, includeQR = false } = options;
  const config = vehicleData.config_payload || {};
  const vehicle = config.vehicle || {};
  
  // Handle options - can be an object with categories or an array
  let optionsList: any[] = [];
  if (config.options) {
    console.log('[PDFTemplate] config.options type:', typeof config.options, 'isArray:', Array.isArray(config.options));
    console.log('[PDFTemplate] config.options value:', JSON.stringify(config.options).substring(0, 200));
    
    if (Array.isArray(config.options)) {
      // Already an array
      optionsList = config.options;
      console.log('[PDFTemplate] Using options as array, length:', optionsList.length);
    } else if (typeof config.options === 'object' && config.options !== null) {
      // Flatten object structure: {exterior: [...], interior: [...], performance: [...]}
      const optionValues = Object.values(config.options);
      console.log('[PDFTemplate] Option values from object:', optionValues.length, 'categories');
      
      // Filter out non-array values and flatten
      optionsList = optionValues
        .filter((val: any) => Array.isArray(val))
        .flat();
      
      console.log('[PDFTemplate] Flattened options list length:', optionsList.length);
    } else {
      console.warn('[PDFTemplate] config.options is not an array or object:', typeof config.options);
    }
  } else {
    console.log('[PDFTemplate] No config.options found');
  }
  
  // Ensure optionsList is always an array
  if (!Array.isArray(optionsList)) {
    console.error('[PDFTemplate] optionsList is not an array! Type:', typeof optionsList, 'Value:', optionsList);
    optionsList = [];
  }
  
  const media = config.media || {};

  // Volturiano brand colors
  const brandOrange = '#FF4520';
  const brandRed = '#E10600';
  const brandBlack = '#111111';
  const textDark = '#333333';
  const textLight = '#666666';
  
  const formatPrice = (cents: number, currency: string = 'EUR') => {
    const amount = (cents / 100).toFixed(2);
    return `${amount} ${currency}`;
  };

  // Premium header with subtle accent
  doc.rect(50, 45, doc.page.width - 100, 2).fill(brandOrange);
  
  doc.fontSize(36).font('Helvetica-Bold').fillColor(brandBlack)
     .text('VOLTURIANO', 50, 60, { align: 'center' });
  
  doc.fontSize(10).font('Helvetica').fillColor(textLight)
     .text('VEHICLE SPECIFICATION SHEET', 50, 100, { align: 'center' });

  // Vehicle Title with accent
  const vehicleTitle = vehicleData.title || vehicle.model || 'Vehicle Configuration';
  doc.fontSize(24).font('Helvetica-Bold').fillColor(brandBlack)
     .text(vehicleTitle, 50, 125);
  
  // Accent line under title
  doc.rect(50, 150, 180, 2).fill(brandOrange);

  // Generation Date
  const genDate = new Date(vehicleData.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.fontSize(9).font('Helvetica').fillColor(textLight)
     .text(`Generated: ${genDate}`, 50, 160);

  let yPos = 180;

  // Hero Image
  if (heroImageDataUrl) {
    try {
      const base64Data = heroImageDataUrl.split(',')[1];
      // Convert base64 to Uint8Array for Deno
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBuffer = bytes;
      const maxWidth = 500;
      const maxHeight = 300;
      doc.image(imageBuffer, 50, yPos, { width: maxWidth, height: maxHeight, fit: [maxWidth, maxHeight] });
      yPos += maxHeight + 20;
    } catch (error) {
      console.warn('[PDFTemplate] Failed to embed hero image:', error);
    }
  }

  // Configuration Summary with styled box
  doc.rect(50, yPos - 5, doc.page.width - 100, 1).fill(brandOrange);
  doc.fontSize(15).font('Helvetica-Bold').fillColor(brandBlack)
     .text('CONFIGURATION SUMMARY', 50, yPos);
  yPos += 28;

  // Summary items in a styled box
  const summaryBoxY = yPos;
  doc.rect(50, summaryBoxY - 3, doc.page.width - 100, 45)
     .fillAndStroke('#FAFAFA', brandBlack);
  doc.rect(50, summaryBoxY - 3, 3, 45).fill(brandOrange);
  
  const summaryItems = [];
  if (vehicle.model) summaryItems.push(`Model: ${vehicle.model}`);
  if (vehicle.trim) summaryItems.push(`Trim: ${vehicle.trim}`);
  if (vehicle.year) summaryItems.push(`Year: ${vehicle.year}`);

  doc.fontSize(11).font('Helvetica').fillColor(textDark)
     .text(summaryItems.join('  •  '), 60, summaryBoxY + 12);
  yPos += 55;

  // Options Breakdown with premium styling
  if (optionsList && optionsList.length > 0) {
    doc.rect(50, yPos - 5, doc.page.width - 100, 1).fill(brandOrange);
    doc.fontSize(15).font('Helvetica-Bold').fillColor(brandBlack)
       .text('SELECTED OPTIONS', 50, yPos);
    yPos += 28;

    const groupedOptions: Record<string, any[]> = {};
    optionsList.forEach((opt: any) => {
      const category = opt.category || opt.group || 'Other';
      if (!groupedOptions[category]) groupedOptions[category] = [];
      groupedOptions[category].push(opt);
    });

    Object.entries(groupedOptions).forEach(([category, opts]) => {
      // Category header with accent
      doc.fontSize(11).font('Helvetica-Bold').fillColor(brandOrange)
         .text(category.toUpperCase(), 50, yPos);
      doc.rect(50, yPos + 10, 80, 1).fill(brandOrange);
      yPos += 22;

      opts.forEach((opt: any) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        const optionName = opt.name || opt.label || 'Unknown Option';
        const optionPrice = opt.price_cents || opt.price || 0;
        const priceText = optionPrice > 0 ? formatPrice(optionPrice, vehicleData.currency) : 'Included';
        
        // Option with styled bullet
        doc.circle(58, yPos + 4, 1.5).fill(brandOrange);
        doc.fontSize(10).font('Helvetica').fillColor(textDark)
           .text(optionName, 68, yPos, { continued: true })
           .fillColor(textLight).text(priceText, { align: 'right' });
        yPos += 17;
      });
      yPos += 10;
    });
  }

  // Pricing Summary with premium box design
  const basePrice = vehicleData.price_cents || config.base_price_cents || 0;
  
  // Ensure optionsList is an array before calling reduce
  if (!Array.isArray(optionsList)) {
    console.error('[PDFTemplate] optionsList is not an array before reduce! Type:', typeof optionsList);
    optionsList = [];
  }
  
  const optionsTotal = Array.isArray(optionsList) 
    ? optionsList.reduce((sum: number, opt: any) => sum + (opt.price_cents || opt.price || 0), 0)
    : 0;
  const totalPrice = basePrice + optionsTotal;

  if (yPos > 650) {
    doc.addPage();
    yPos = 50;
  }

  // Pricing box with accent border
  const pricingBoxY = yPos;
  const pricingBoxHeight = 85;
  doc.rect(50, pricingBoxY - 5, doc.page.width - 100, pricingBoxHeight)
     .fillAndStroke('#FAFAFA', brandBlack);
  doc.rect(50, pricingBoxY - 5, 3, pricingBoxHeight).fill(brandOrange);
  
  doc.fontSize(15).font('Helvetica-Bold').fillColor(brandBlack)
     .text('PRICING SUMMARY', 60, pricingBoxY + 8);
  
  let pricingY = pricingBoxY + 30;

  if (basePrice > 0) {
    doc.fontSize(11).font('Helvetica').fillColor(textDark)
       .text('Base Price:', 60, pricingY, { continued: true })
       .fillColor(textDark).text(formatPrice(basePrice, vehicleData.currency), { align: 'right' });
    pricingY += 20;
  }

  if (optionsTotal > 0) {
    doc.fontSize(11).font('Helvetica').fillColor(textDark)
       .text('Options Total:', 60, pricingY, { continued: true })
       .fillColor(textDark).text(formatPrice(optionsTotal, vehicleData.currency), { align: 'right' });
    pricingY += 20;
  }

  // Total with accent styling
  doc.rect(60, pricingY - 3, doc.page.width - 120, 1).fill(brandOrange);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(brandBlack)
     .text('Total:', 60, pricingY + 6, { continued: true })
     .fillColor(brandOrange).text(formatPrice(totalPrice, vehicleData.currency), { align: 'right' });
  
  yPos = pricingBoxY + pricingBoxHeight + 25;

  // Premium Footer - ensure it fits on page
  const qrCodeSize = 85; // Slightly smaller to ensure it fits
  const qrBoxSize = qrCodeSize + 6; // Box is slightly larger than QR code
  const footerY = doc.page.height - 85; // More margin from bottom
  
  // Footer accent line
  doc.rect(50, footerY - 18, doc.page.width - 100, 1.5).fill(brandOrange);

  // QR Code with styled box (left side)
  if (includeQR && (qrCodeBuffer || qrCodeDataUrl)) {
    try {
      let qrImageBuffer: Uint8Array | null = null;
      
      // Prefer buffer if available (more reliable)
      if (qrCodeBuffer) {
        console.log('[PDFTemplate] Using QR code buffer, size:', qrCodeBuffer.length, 'bytes');
        qrImageBuffer = qrCodeBuffer;
      } else if (qrCodeDataUrl) {
        console.log('[PDFTemplate] Converting QR code data URL to buffer');
        
        // Extract base64 data from data URL
        const base64Data = qrCodeDataUrl.includes(',') 
          ? qrCodeDataUrl.split(',')[1] 
          : qrCodeDataUrl;
        
        // Decode base64 to binary
        const binaryString = atob(base64Data);
        qrImageBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          qrImageBuffer[i] = binaryString.charCodeAt(i);
        }
        
        console.log('[PDFTemplate] QR code buffer size:', qrImageBuffer.length, 'bytes');
      }
      
      if (!qrImageBuffer || qrImageBuffer.length === 0) {
        throw new Error('QR code buffer is empty');
      }
      
      // QR code box - ensure it fits on page
      const qrBoxX = 50;
      const qrBoxY = footerY - 5;
      doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).stroke(brandBlack);
      doc.rect(qrBoxX, qrBoxY, 2.5, qrBoxSize).fill(brandOrange);
      
      // Embed QR code image - centered in box
      const qrImageX = qrBoxX + 3;
      const qrImageY = qrBoxY + 3;
      doc.image(qrImageBuffer, qrImageX, qrImageY, { 
        width: qrCodeSize, 
        height: qrCodeSize
      });
      
      console.log('[PDFTemplate] QR code embedded successfully');
      
      if (shareUrl) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor(brandOrange)
           .text('SCAN TO VIEW ONLINE', qrBoxX, qrBoxY + qrBoxSize + 2, { width: qrBoxSize, align: 'center' });
      }
    } catch (error) {
      console.error('[PDFTemplate] Failed to embed QR code:', error);
      console.error('[PDFTemplate] Error details:', error);
      // Draw placeholder if QR code fails
      doc.rect(53, footerY, 89, 89).stroke(textLight);
      doc.fontSize(8).font('Helvetica').fillColor(textLight)
         .text('QR Code\nUnavailable', 53, footerY + 35, { width: 89, align: 'center' });
    }
  }

  // Contact Info with branding (right side or centered)
  const contactX = includeQR && (qrCodeBuffer || qrCodeDataUrl) ? 160 : doc.page.width / 2;
  doc.fontSize(8).font('Helvetica').fillColor(textLight)
     .text('For inquiries, visit volturiano.com', contactX, footerY + 5, { align: includeQR && (qrCodeBuffer || qrCodeDataUrl) ? 'left' : 'center' });

  // Premium Watermark - subtle and elegant
  if (watermark) {
    doc.save();
    doc.opacity(0.04);
    doc.fontSize(96).font('Helvetica-Bold').fillColor(brandOrange)
       .text('VOLTURIANO', 0, doc.page.height / 2 - 48, {
         align: 'center',
         width: doc.page.width,
         angle: 45
       });
    doc.restore();
  }

  return doc;
}

// ============================================================================
// MAIN FUNCTION HANDLER
// ============================================================================

interface RequestBody {
  garage_item_id: string;
  options?: {
    watermark?: boolean;
    include_qr?: boolean;
    template?: string;
  };
}

serve(async (req) => {
  try {
    // Log request details for debugging
    console.log('[generate-pdf] Request method:', req.method);
    console.log('[generate-pdf] Request URL:', req.url);
    console.log('[generate-pdf] Authorization header:', req.headers.get('Authorization') ? 'Present' : 'Missing');
    console.log('[generate-pdf] All headers:', Object.fromEntries(req.headers.entries()));
    
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const authHeader = req.headers.get('Authorization');
    console.log('[generate-pdf] Authorization header check:', {
      present: !!authHeader,
      valuePrefix: authHeader ? `${authHeader.substring(0, 30)}...` : 'null',
      fullLength: authHeader?.length,
      startsWithBearer: authHeader?.startsWith('Bearer '),
      tokenPart: authHeader?.replace('Bearer ', '').substring(0, 30)
    });
    
    // Check all auth-related headers
    const allAuthHeaders = {
      authorization: req.headers.get('Authorization'),
      authorization_lower: req.headers.get('authorization'),
      apikey: req.headers.get('apikey'),
      apikey_lower: req.headers.get('Apikey'),
      'x-client-info': req.headers.get('x-client-info')
    };
    console.log('[generate-pdf] All auth-related headers:', allAuthHeaders);
    
    if (!authHeader) {
      console.error('[generate-pdf] No Authorization header found');
      console.error('[generate-pdf] Available headers:', Array.from(req.headers.keys()));
      console.error('[generate-pdf] All header values:', Object.fromEntries(req.headers.entries()));
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Missing Authorization header',
        receivedHeaders: Array.from(req.headers.keys()),
        authHeaders: allAuthHeaders
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse request body - handle both JSON string and object
    let body: RequestBody;
    try {
      const bodyText = await req.text();
      console.log('[generate-pdf] Request body text:', bodyText);
      if (bodyText) {
        body = JSON.parse(bodyText);
      } else {
        throw new Error('Empty request body');
      }
    } catch (parseError) {
      console.error('[generate-pdf] Error parsing request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        message: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const { garage_item_id, options = {} } = body;

    if (!garage_item_id) {
      return new Response(JSON.stringify({ error: 'Missing garage_item_id' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Decode JWT token to get user ID
    // Supabase Edge Functions automatically verify JWTs, so if we got here, the token is valid
    const token = authHeader.replace('Bearer ', '');
    console.log('[generate-pdf] Decoding JWT token...');
    const tokenData = decodeJWT(token);
    
    if (!tokenData || !tokenData.userId) {
      console.error('[generate-pdf] Failed to decode JWT or extract user ID:', tokenData);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication',
        message: 'Failed to decode user token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Check if token is expired
    if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {
      console.error('[generate-pdf] Token expired:', {
        exp: tokenData.exp,
        now: Math.floor(Date.now() / 1000)
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication',
        message: 'Token expired'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const userId = tokenData.userId;
    console.log('[generate-pdf] User authenticated successfully:', {
      userId,
      email: tokenData.email,
      tokenExp: tokenData.exp
    });
    
    // Create service role client for database operations
    const serviceClient = createServiceRoleClient();

    const { data: garageItem, error: itemError } = await serviceClient
      .from('garage_items')
      .select('*')
      .eq('id', garage_item_id)
      .eq('owner_id', userId)
      .is('archived_at', null)
      .single();

    if (itemError || !garageItem) {
      return new Response(JSON.stringify({ error: 'Item not found or access denied' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const { data: job, error: jobError } = await serviceClient
      .from('pdf_export_jobs')
      .insert({
        garage_item_id,
        owner_id: userId,
        status: 'processing',
        metadata: {
          watermark: options.watermark || false,
          include_qr: options.include_qr || false,
          template: options.template || 'default'
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('[generate-pdf] Failed to create job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create export job' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const jobId = job.id;

    try {
      const configPayload = garageItem.config_payload || {};
      let shareUrl: string | null = null;
      let qrCodeDataUrl: string | null = null;
      let qrCodeBuffer: Uint8Array | null = null;

      if (options.include_qr) {
        const shareCode = await getOrCreateShareLink(serviceClient, garage_item_id, userId);
        if (shareCode) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
          let siteUrl = 'https://volturiano.com';
          if (supabaseUrl) {
            const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
            if (match) {
              siteUrl = `https://${match[1]}.supabase.co`;
            }
          }
          shareUrl = `${siteUrl}/garage/share/${shareCode}`;
          
          // Generate QR code as buffer for better PDF compatibility
          try {
            const QRCode = await import('npm:qrcode@1.5.3');
            qrCodeBuffer = await QRCode.default.toBuffer(shareUrl, {
              type: 'png',
              width: 200,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' },
              errorCorrectionLevel: 'M'
            });
            console.log('[generate-pdf] QR code generated as buffer, size:', qrCodeBuffer.length, 'bytes');
            
            // Also keep data URL for fallback
            qrCodeDataUrl = await generateQRCode(shareUrl);
          } catch (qrError) {
            console.error('[generate-pdf] Error generating QR code buffer:', qrError);
            // Fallback to data URL method
            qrCodeDataUrl = await generateQRCode(shareUrl);
          }
        }
      }

      const imageUrl = getBestImageUrl(configPayload) || garageItem.thumbnail_url;
      const heroImageDataUrl = imageUrl ? await loadImageForPdf(imageUrl) : null;

      const pdfDoc = buildPdfTemplate(
        {
          title: garageItem.title || 'Vehicle Configuration',
          vehicle_model: garageItem.vehicle_model || '',
          config_payload: configPayload,
          price_cents: garageItem.price_cents || null,
          currency: garageItem.currency || 'EUR',
          created_at: garageItem.created_at
        },
        {
          watermark: options.watermark || false,
          includeQR: options.include_qr || false,
          template: options.template || 'default'
        },
        shareUrl || undefined,
        qrCodeDataUrl || undefined,
        heroImageDataUrl || undefined,
        qrCodeBuffer || undefined
      );

      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => {
        // Convert chunk to Uint8Array if needed
        if (chunk instanceof Uint8Array) {
          chunks.push(chunk);
        } else if (typeof chunk === 'string') {
          chunks.push(new TextEncoder().encode(chunk));
        } else {
          chunks.push(new Uint8Array(chunk));
        }
      });
      pdfDoc.on('end', () => {});

      await new Promise((resolve) => {
        pdfDoc.end();
        pdfDoc.on('end', resolve);
      });

      // Concatenate Uint8Arrays manually (Deno doesn't have Buffer.concat)
      let totalLength = 0;
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const pdfBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        pdfBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const fileName = `${userId}/${jobId}.pdf`;
      const { data: uploadData, error: uploadError } = await serviceClient.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      const { data: urlData } = await serviceClient.storage
        .from('documents')
        .createSignedUrl(fileName, 3600 * 24 * 7);

      const outputUrl = urlData?.signedUrl || null;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await serviceClient
        .from('pdf_export_jobs')
        .update({
          status: 'completed',
          output_url: outputUrl,
          completed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: jobId,
          status: 'completed',
          output_url: outputUrl
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } catch (error) {
      console.error('[generate-pdf] PDF generation error:', error);
      await serviceClient
        .from('pdf_export_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          error: 'PDF generation failed',
          job_id: jobId,
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  } catch (error) {
    console.error('[generate-pdf] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});

