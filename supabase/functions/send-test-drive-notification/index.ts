// Supabase Edge Function: send-test-drive-notification
// Sends email notifications for test drive requests
// Inactive until RESEND_API_KEY is configured

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import {
  generateNewRequestEmail,
  generateStatusUpdateEmail,
  generateCancellationEmail
} from './email-templates.ts';

interface RequestBody {
  request_id: string;
  notification_type: 'new_request' | 'status_update' | 'cancellation';
  status?: string;
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

    const body: RequestBody = await req.json();
    const { request_id, notification_type, status } = body;

    if (!request_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: request_id, notification_type' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Check if Resend API key is configured
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.log('[send-test-drive-notification] RESEND_API_KEY not configured, skipping email send');
      return new Response(
        JSON.stringify({ 
          message: 'Email notifications are not configured. RESEND_API_KEY secret is required.',
          skipped: true 
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Fetch request details
    const { data: request, error: requestError } = await supabase
      .from('test_drive_requests')
      .select(`
        *,
        dealers:dealer_id (
          id,
          name,
          email,
          location,
          phone
        ),
        profiles:owner_id (
          id,
          display_name
        )
      `)
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      console.error('[send-test-drive-notification] Failed to fetch request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Fetch user email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(request.owner_id);
    const userEmail = authUser?.user?.email || request.contact_email;

    // Determine recipients and generate email
    let emailData;
    let recipients: string[] = [];

    switch (notification_type) {
      case 'new_request':
        emailData = generateNewRequestEmail(request, request.dealers, authUser?.user);
        // Send to dealer and user
        if (request.dealers?.email) {
          recipients.push(request.dealers.email);
        }
        if (userEmail) {
          recipients.push(userEmail);
        }
        break;

      case 'status_update':
        emailData = generateStatusUpdateEmail(request, authUser?.user, status);
        // Send to user only
        if (userEmail) {
          recipients.push(userEmail);
        }
        break;

      case 'cancellation':
        emailData = generateCancellationEmail(request, authUser?.user);
        // Send to dealer and user
        if (request.dealers?.email) {
          recipients.push(request.dealers.email);
        }
        if (userEmail) {
          recipients.push(userEmail);
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid notification_type' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
    }

    if (recipients.length === 0) {
      console.warn('[send-test-drive-notification] No recipients found, skipping email send');
      return new Response(
        JSON.stringify({ message: 'No recipients found', skipped: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Send emails via Resend API
    const sendResults = await Promise.allSettled(
      recipients.map(async (to) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Volturiano <noreply@volturiano.com>', // TODO: Configure from address
            to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Resend API error: ${error}`);
        }

        return await response.json();
      })
    );

    // Check if any emails failed
    const failures = sendResults.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('[send-test-drive-notification] Some emails failed:', failures);
    }

    return new Response(
      JSON.stringify({
        message: 'Emails sent successfully',
        recipients_sent: sendResults.filter(r => r.status === 'fulfilled').length,
        recipients_failed: failures.length
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
    console.error('[send-test-drive-notification] Exception:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
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

