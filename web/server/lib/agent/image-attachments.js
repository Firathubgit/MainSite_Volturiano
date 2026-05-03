const DATA_URL_IMAGE_PATTERN = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i;
const DEFAULT_MIME_TYPE = 'image/png';
const MAX_AGENT_IMAGES = 8;

export function normalizeImageAttachments(images = [], { maxImages = MAX_AGENT_IMAGES } = {}) {
  if (!Array.isArray(images)) return [];

  return images
    .slice(0, maxImages)
    .map((image, index) => normalizeSingleImageAttachment(image, index))
    .filter(Boolean);
}

export function buildImageReferenceInstruction(count) {
  if (!count) return '';

  return [
    `[Attached reference images: ${count}]`,
    'Use the attached image(s) as visual ground truth. Infer the real website type, layout, color palette, spacing, typography, product/content hierarchy, and visible domain cues from the image before choosing catalog components or writing code.',
    'If the user says "the following website" or "like this", the image is the primary instruction. Do not replace it with a generic catalog concept.'
  ].join('\n');
}

export function toVercelImageParts(attachments = []) {
  return attachments
    .filter((attachment) => attachment.binary || attachment.url)
    .map((attachment) => ({
      type: 'image',
      image: attachment.binary || attachment.url,
      mimeType: attachment.mimeType
    }));
}

export function toGeminiPartsFromContent(content) {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ text: String(content || '') }];
  }

  return content
    .map((part) => {
      if (part?.type === 'text') {
        return { text: part.text || '' };
      }

      if (part?.type === 'image' && part.base64) {
        return {
          inlineData: {
            data: part.base64,
            mimeType: part.mimeType || DEFAULT_MIME_TYPE
          }
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function buildMultimodalUserContent({ text, images = [] }) {
  const attachments = normalizeImageAttachments(images);
  const imageInstruction = buildImageReferenceInstruction(attachments.length);
  const textContent = [imageInstruction, text].filter(Boolean).join('\n\n');

  if (!attachments.length) {
    return { content: textContent, attachments };
  }

  return {
    attachments,
    content: [
      { type: 'text', text: textContent },
      ...attachments.map((attachment) => ({
        type: 'image',
        image: attachment.binary || attachment.url,
        base64: attachment.base64,
        mimeType: attachment.mimeType
      }))
    ]
  };
}

function normalizeSingleImageAttachment(image, index) {
  const id = `image-${index + 1}`;

  if (typeof image === 'string') {
    return normalizeImageString(image, id);
  }

  if (!image || typeof image !== 'object') return null;

  if (typeof image.dataUrl === 'string') {
    return normalizeImageString(image.dataUrl, image.id || id);
  }

  if (typeof image.url === 'string') {
    return normalizeImageString(image.url, image.id || id);
  }

  if (typeof image.base64 === 'string') {
    const base64 = cleanBase64(image.base64);
    if (!base64) return null;
    return {
      id: image.id || id,
      mimeType: image.mimeType || image.mediaType || DEFAULT_MIME_TYPE,
      base64,
      binary: Buffer.from(base64, 'base64'),
      source: 'base64'
    };
  }

  return null;
}

function normalizeImageString(value, id) {
  const raw = value.trim();
  if (!raw) return null;

  const match = raw.match(DATA_URL_IMAGE_PATTERN);
  if (match) {
    const mimeType = match[1] || DEFAULT_MIME_TYPE;
    const base64 = cleanBase64(match[2]);
    if (!base64) return null;
    return {
      id,
      mimeType,
      base64,
      binary: Buffer.from(base64, 'base64'),
      source: 'data_url'
    };
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      return {
        id,
        mimeType: DEFAULT_MIME_TYPE,
        url: new URL(raw),
        source: 'url'
      };
    } catch {
      return null;
    }
  }

  return null;
}

function cleanBase64(value) {
  return String(value || '').replace(/\s/g, '');
}
