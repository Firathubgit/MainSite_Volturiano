// Supabase Edge Function: send-agency-inquiry
// Handles agency contact form submissions with proper CORS support

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://www.eurotaxias.no',
  'https://eurotaxias.no',
  'https://volturiano.com',
  'https://www.volturiano.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Helper function to get CORS headers
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Default to production domain
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

interface AgencyInquiryBody {
  name: string;
  email: string;
  company?: string;
  service_interests?: string[];
  budget_range?: string;
  project_timeline?: string;
  message?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Parse request body
    const body: AgencyInquiryBody = await req.json();
    const { name, email, company, service_interests, budget_range, project_timeline, message } = body;

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name and email are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // TODO: Here you would typically:
    // 1. Save to database (create a contact_inquiries or agency_inquiries table)
    // 2. Send email notification via Resend or similar service
    // 3. Log the inquiry for tracking
    
    // For now, just log and return success
    console.log('[send-agency-inquiry] Received agency inquiry:', {
      name,
      email,
      company,
      service_interests,
      budget_range,
      project_timeline,
      message: message ? message.substring(0, 100) + '...' : null,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inquiry submitted successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('[send-agency-inquiry] Exception:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});
