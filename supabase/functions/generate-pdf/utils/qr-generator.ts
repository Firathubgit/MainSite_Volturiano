// QR code generator utility for PDF generation
// Generates QR codes linking to share links

/**
 * Generate a QR code data URL for a share link
 * @param shareUrl - The share URL to encode
 * @returns Base64 data URL of QR code image
 */
export async function generateQRCode(shareUrl: string): Promise<string | null> {
  try {
    // Use qrcode library to generate QR code
    // For Deno, we'll use the qrcode import from deno.json
    const { default: QRCode } = await import('qrcode');
    
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return dataUrl;
  } catch (error) {
    console.error('[QRGenerator] Error generating QR code:', error);
    return null;
  }
}

/**
 * Get or create a share link for a garage item
 * @param supabase - Supabase client
 * @param garageItemId - Garage item ID
 * @param userId - User ID (owner)
 * @returns Share code or null
 */
export async function getOrCreateShareLink(
  supabase: any,
  garageItemId: string,
  userId: string
): Promise<string | null> {
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

