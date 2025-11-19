// PDF template builder utility
// Builds PDF layout with vehicle details, options, pricing

// @deno-types="https://cdn.skypack.dev/pdfkit@0.13.0?dts"
import PDFDocument from 'pdfkit';

interface PDFOptions {
  watermark?: boolean;
  includeQR?: boolean;
  template?: string;
}

interface VehicleData {
  title: string;
  vehicle_model: string;
  config_payload: any;
  price_cents?: number;
  currency?: string;
  created_at: string;
}

/**
 * Build PDF document with vehicle specification
 * @param vehicleData - Vehicle data from garage item
 * @param options - PDF generation options
 * @param shareUrl - Share URL for QR code (if includeQR is true)
 * @param qrCodeDataUrl - QR code image data URL (if includeQR is true)
 * @param heroImageDataUrl - Hero image data URL (optional)
 * @returns PDFDocument instance
 */
export function buildPdfTemplate(
  vehicleData: VehicleData,
  options: PDFOptions = {},
  shareUrl?: string,
  qrCodeDataUrl?: string,
  heroImageDataUrl?: string
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
    if (Array.isArray(config.options)) {
      // Already an array
      optionsList = config.options;
    } else if (typeof config.options === 'object' && config.options !== null) {
      // Flatten object structure: {exterior: [...], interior: [...], performance: [...]}
      const optionValues = Object.values(config.options);
      // Filter out non-array values and flatten
      optionsList = optionValues
        .filter((val: any) => Array.isArray(val))
        .flat();
    }
  }
  
  // Ensure optionsList is always an array
  if (!Array.isArray(optionsList)) {
    optionsList = [];
  }
  
  const media = config.media || {};

  // Helper function to format price
  const formatPrice = (cents: number, currency: string = 'EUR') => {
    const amount = (cents / 100).toFixed(2);
    return `${amount} ${currency}`;
  };

  // Header
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text('VOLTURIANO', 50, 50, { align: 'center' });

  doc.fontSize(12)
     .font('Helvetica')
     .text('Vehicle Specification Sheet', 50, 80, { align: 'center' });

  // Vehicle Title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text(vehicleData.title || vehicle.model || 'Vehicle Configuration', 50, 120);

  // Generation Date
  const genDate = new Date(vehicleData.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#666666')
     .text(`Generated: ${genDate}`, 50, 150);

  let yPos = 180;

  // Hero Image
  if (heroImageDataUrl) {
    try {
      // Extract base64 data from data URL
      const base64Data = heroImageDataUrl.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Calculate image dimensions to fit width
      const maxWidth = 500;
      const maxHeight = 300;
      
      doc.image(imageBuffer, 50, yPos, {
        width: maxWidth,
        height: maxHeight,
        fit: [maxWidth, maxHeight]
      });
      
      yPos += maxHeight + 20;
    } catch (error) {
      console.warn('[PDFTemplate] Failed to embed hero image:', error);
    }
  }

  // Configuration Summary
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Configuration Summary', 50, yPos);
  
  yPos += 25;

  // Model, Trim, Year
  const summaryItems = [];
  if (vehicle.model) summaryItems.push(`Model: ${vehicle.model}`);
  if (vehicle.trim) summaryItems.push(`Trim: ${vehicle.trim}`);
  if (vehicle.year) summaryItems.push(`Year: ${vehicle.year}`);

  doc.fontSize(11)
     .font('Helvetica')
     .text(summaryItems.join(' • '), 50, yPos);
  
  yPos += 30;

  // Options Breakdown
  if (optionsList && optionsList.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Selected Options', 50, yPos);
    
    yPos += 25;

    // Group options by category if available
    const groupedOptions: Record<string, any[]> = {};
    optionsList.forEach((opt: any) => {
      const category = opt.category || opt.group || 'Other';
      if (!groupedOptions[category]) {
        groupedOptions[category] = [];
      }
      groupedOptions[category].push(opt);
    });

    Object.entries(groupedOptions).forEach(([category, opts]) => {
      // Category header
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text(category, 50, yPos);
      
      yPos += 18;

      // Options in category
      opts.forEach((opt: any) => {
        const optionName = opt.name || opt.label || 'Unknown Option';
        const optionPrice = opt.price_cents || 0;
        const priceText = optionPrice > 0 ? formatPrice(optionPrice, vehicleData.currency) : 'Included';

        // Check if we need a new page
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`  • ${optionName}`, 50, yPos, { continued: true })
           .fillColor('#666666')
           .text(` - ${priceText}`, { align: 'right' });
        
        yPos += 15;
      });

      yPos += 10;
    });
  }

  // Pricing Summary
  const basePrice = vehicleData.price_cents || config.base_price_cents || 0;
  
  // Ensure optionsList is an array before calling reduce
  const optionsTotal = Array.isArray(optionsList) 
    ? optionsList.reduce((sum: number, opt: any) => {
        return sum + (opt.price_cents || opt.price || 0);
      }, 0)
    : 0;
  const totalPrice = basePrice + optionsTotal;

  if (yPos > 650) {
    doc.addPage();
    yPos = 50;
  }

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Pricing Summary', 50, yPos);
  
  yPos += 25;

  if (basePrice > 0) {
    doc.fontSize(11)
       .font('Helvetica')
       .text('Base Price:', 50, yPos, { continued: true })
       .text(formatPrice(basePrice, vehicleData.currency), { align: 'right' });
    yPos += 20;
  }

  if (optionsTotal > 0) {
    doc.text('Options Total:', 50, yPos, { continued: true })
       .text(formatPrice(optionsTotal, vehicleData.currency), { align: 'right' });
    yPos += 20;
  }

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Total:', 50, yPos, { continued: true })
     .text(formatPrice(totalPrice, vehicleData.currency), { align: 'right' });
  
  yPos += 40;

  // Footer
  const footerY = doc.page.height - 100;

  // QR Code (if enabled)
  if (includeQR && qrCodeDataUrl) {
    try {
      const base64Data = qrCodeDataUrl.split(',')[1];
      const qrBuffer = Buffer.from(base64Data, 'base64');
      
      doc.image(qrBuffer, 50, footerY, {
        width: 100,
        height: 100
      });

      if (shareUrl) {
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#666666')
           .text('Scan to view online', 50, footerY + 105, { width: 100, align: 'center' });
      }
    } catch (error) {
      console.warn('[PDFTemplate] Failed to embed QR code:', error);
    }
  }

  // Contact Info
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#999999')
     .text('For inquiries, visit volturiano.com', 50, footerY + 50, { align: 'center' });

  // Watermark (if enabled)
  if (watermark) {
    doc.save();
    doc.opacity(0.1);
    doc.fontSize(60)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('VOLTURIANO', 0, doc.page.height / 2 - 30, {
         align: 'center',
         width: doc.page.width,
         angle: 45
       });
    doc.restore();
  }

  return doc;
}

