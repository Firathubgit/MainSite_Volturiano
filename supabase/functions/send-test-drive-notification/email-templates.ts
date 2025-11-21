// Email templates for test drive notifications

interface TestDriveRequest {
  id: string;
  vehicle_model: string;
  preferred_date: string;
  dealer?: string;
  dealers?: {
    name: string;
    email?: string;
    location?: string;
    phone?: string;
  };
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  status: string;
}

interface User {
  email?: string;
  display_name?: string;
}

/**
 * Generate email for new test drive request
 */
export function generateNewRequestEmail(
  request: TestDriveRequest,
  dealer: TestDriveRequest['dealers'],
  user: User | null
) {
  const preferredDate = new Date(request.preferred_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `New Test Drive Request: ${request.vehicle_model}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF4520 0%, #E10600 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-row { margin: 15px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; margin-top: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Test Drive Request</h1>
        </div>
        <div class="content">
          <div class="info-row">
            <div class="label">Vehicle Model</div>
            <div class="value">${request.vehicle_model}</div>
          </div>
          <div class="info-row">
            <div class="label">Preferred Date</div>
            <div class="value">${preferredDate}</div>
          </div>
          ${dealer ? `
          <div class="info-row">
            <div class="label">Dealer</div>
            <div class="value">${dealer.name}${dealer.location ? ` - ${dealer.location}` : ''}</div>
          </div>
          ` : ''}
          <div class="info-row">
            <div class="label">Contact Name</div>
            <div class="value">${request.contact_name || user?.display_name || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="label">Contact Email</div>
            <div class="value">${request.contact_email || user?.email || 'N/A'}</div>
          </div>
          ${request.contact_phone ? `
          <div class="info-row">
            <div class="label">Contact Phone</div>
            <div class="value">${request.contact_phone}</div>
          </div>
          ` : ''}
          ${request.notes ? `
          <div class="info-row">
            <div class="label">Additional Notes</div>
            <div class="value">${request.notes}</div>
          </div>
          ` : ''}
          <div class="footer">
            <p>This is an automated notification from Volturiano.</p>
            <p>Request ID: ${request.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Test Drive Request

Vehicle Model: ${request.vehicle_model}
Preferred Date: ${preferredDate}
${dealer ? `Dealer: ${dealer.name}${dealer.location ? ` - ${dealer.location}` : ''}\n` : ''}
Contact Name: ${request.contact_name || user?.display_name || 'N/A'}
Contact Email: ${request.contact_email || user?.email || 'N/A'}
${request.contact_phone ? `Contact Phone: ${request.contact_phone}\n` : ''}
${request.notes ? `Additional Notes: ${request.notes}\n` : ''}

Request ID: ${request.id}
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email for status update
 */
export function generateStatusUpdateEmail(
  request: TestDriveRequest,
  user: User | null,
  newStatus?: string
) {
  const status = newStatus || request.status;
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  const preferredDate = new Date(request.preferred_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `Test Drive Request ${statusLabels[status] || status}: ${request.vehicle_model}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF4520 0%, #E10600 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
        .status-confirmed { background: #10b981; color: white; }
        .status-completed { background: #6b7280; color: white; }
        .status-cancelled { background: #ef4444; color: white; }
        .info-row { margin: 15px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; margin-top: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Test Drive Request Updated</h1>
        </div>
        <div class="content">
          <div class="info-row">
            <div class="label">Status</div>
            <div class="value">
              <span class="status-badge status-${status}">${statusLabels[status] || status}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="label">Vehicle Model</div>
            <div class="value">${request.vehicle_model}</div>
          </div>
          <div class="info-row">
            <div class="label">Preferred Date</div>
            <div class="value">${preferredDate}</div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Volturiano.</p>
            <p>Request ID: ${request.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Test Drive Request Updated

Status: ${statusLabels[status] || status}
Vehicle Model: ${request.vehicle_model}
Preferred Date: ${preferredDate}

Request ID: ${request.id}
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email for cancellation
 */
export function generateCancellationEmail(
  request: TestDriveRequest,
  user: User | null
) {
  const preferredDate = new Date(request.preferred_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `Test Drive Request Cancelled: ${request.vehicle_model}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-row { margin: 15px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; margin-top: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Test Drive Request Cancelled</h1>
        </div>
        <div class="content">
          <p>Your test drive request has been cancelled.</p>
          <div class="info-row">
            <div class="label">Vehicle Model</div>
            <div class="value">${request.vehicle_model}</div>
          </div>
          <div class="info-row">
            <div class="label">Preferred Date</div>
            <div class="value">${preferredDate}</div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Volturiano.</p>
            <p>Request ID: ${request.id}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Test Drive Request Cancelled

Your test drive request has been cancelled.

Vehicle Model: ${request.vehicle_model}
Preferred Date: ${preferredDate}

Request ID: ${request.id}
  `.trim();

  return { subject, html, text };
}

