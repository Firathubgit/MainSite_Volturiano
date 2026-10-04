/**
 * Parse <file path="...">content</file> blocks from a text string.
 * @param {string} text - The raw text containing file blocks.
 * @returns {Array<{path: string, content: string}>} - Array of file objects.
 */
export function parseFileBlocks(text) {
    if (!text) return [];
    const files = [];
    const regex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
        let path = m[1].replace(/^\/+/, '');
        let content = m[2].trim();

        // Strip markdown code fences if present
        if (content.startsWith('```')) {
            content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
        }

        files.push({ path, content });
    }
    return files;
}

/**
 * Validate and format a file array.
 * @param {Array<{path: string, content: string}>} files - The file array.
 * @returns {Array<{path: string, content: string}>} - The validated file array.
 */
export function toFileBlocks(files) {
    if (!Array.isArray(files)) return [];
    return files.map(f => ({
        path: f.path.replace(/^\/+/, ''),
        content: f.content
    })).filter(f => f.path && typeof f.content === 'string');
}
