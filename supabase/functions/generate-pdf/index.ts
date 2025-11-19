// Supabase Edge Function: generate-pdf
// Generates PDF specification sheets for garage items

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { buildPdfTemplate } from './utils/pdf-template.ts';
import { generateQRCode, getOrCreateShareLink } from './utils/qr-generator.ts';
import { loadImageForPdf, getBestImageUrl } from './utils/image-loader.ts';

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
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Parse request body - handle both JSON string and object
    let body: RequestBody;
    try {
      const bodyText = await req.text();
      console.log('[generate-pdf] Request body text length:', bodyText?.length);
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
      return new Response(
        JSON.stringify({ error: 'Missing garage_item_id' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Decode JWT token to get user ID
    // Supabase Edge Functions automatically verify JWTs, so if we got here, the token is valid
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT payload (base64url)
    let userId: string | null = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
        const parsed = JSON.parse(decoded);
        userId = parsed.sub || parsed.user_id || parsed.id || null;
        
        // Check expiration
        if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
          return new Response(
            JSON.stringify({ error: 'Invalid authentication', message: 'Token expired' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('[generate-pdf] Error decoding JWT:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', message: 'Failed to decode token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication', message: 'User ID not found in token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Create service role client for database operations
    const serviceClient = createServiceRoleClient();

    // Verify ownership and fetch garage item
    const { data: garageItem, error: itemError } = await serviceClient
      .from('garage_items')
      .select('*')
      .eq('id', garage_item_id)
      .eq('owner_id', userId)
      .is('archived_at', null)
      .single();

    if (itemError || !garageItem) {
      return new Response(
        JSON.stringify({ error: 'Item not found or access denied' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Create job record
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
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const jobId = job.id;

    try {
      // Prepare data for PDF
      const configPayload = garageItem.config_payload || {};
      
      // Get share link and QR code if needed
      let shareUrl: string | null = null;
      let qrCodeDataUrl: string | null = null;
      
      if (options.include_qr) {
        const shareCode = await getOrCreateShareLink(
          serviceClient,
          garage_item_id,
          userId
        );
        
        if (shareCode) {
          // Construct share URL (adjust domain as needed)
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
          // Extract site URL from Supabase URL or use default
          let siteUrl = 'https://volturiano.com';
          if (supabaseUrl) {
            // Try to extract site URL from Supabase project URL
            // Format: https://xxxxx.supabase.co -> extract project ref
            const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
            if (match) {
              siteUrl = `https://${match[1]}.supabase.co`;
            }
          }
          // Use custom domain if set, otherwise construct from Supabase URL
          shareUrl = `${siteUrl}/garage/share/${shareCode}`;
          
          qrCodeDataUrl = await generateQRCode(shareUrl);
        }
      }

      // Load hero image
      const imageUrl = getBestImageUrl(configPayload) || garageItem.thumbnail_url;
      const heroImageDataUrl = imageUrl ? await loadImageForPdf(imageUrl) : null;

      // Build PDF
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
        heroImageDataUrl || undefined
      );

      // Convert PDF to buffer
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => {});

      // Wait for PDF to finish
      await new Promise((resolve) => {
        pdfDoc.end();
        pdfDoc.on('end', resolve);
      });

      const pdfBuffer = Buffer.concat(chunks);

      // Upload to storage
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

      // Get public URL (signed URL)
      const { data: urlData } = await serviceClient.storage
        .from('documents')
        .createSignedUrl(fileName, 3600 * 24 * 7); // 7 days expiry

      const outputUrl = urlData?.signedUrl || null;

      // Update job status
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

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

      // Update job status to failed
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

