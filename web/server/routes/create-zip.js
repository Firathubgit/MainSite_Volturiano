export default async function createZip(req, res) {
  try {
    const provider = global.activeSandboxProvider;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'No active sandbox' });
    }

    console.log('[create-zip] Creating project zip...');

    const zipCmd = 'zip -r /tmp/project.zip . -x "node_modules/*" ".git/*" ".next/*" "dist/*" "build/*" "*.log"';

    // Race against a 30-second timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('ZIP creation timed out after 30s')), 30000)
    );
    const zipResult = await Promise.race([
      provider.runCommand(zipCmd),
      timeoutPromise
    ]);

    if (!zipResult.success) {
      throw new Error(`Failed to create zip: ${zipResult.stderr || zipResult.stdout}`);
    }

    const base64Result = await Promise.race([
      provider.runCommand('base64 /tmp/project.zip'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('base64 read timed out')), 30000))
    ]);
    if (!base64Result.success) {
      throw new Error(`Failed to read zip: ${base64Result.stderr}`);
    }

    const base64Content = (base64Result.stdout || '').replace(/\s/g, '');

    // Guard against massive payloads (base64 is ~33% larger than raw)
    const estimatedSizeMB = (base64Content.length * 0.75) / (1024 * 1024);
    if (estimatedSizeMB > 100) {
      console.warn(`[create-zip] ZIP too large: ${estimatedSizeMB.toFixed(1)}MB`);
      return res.status(413).json({
        success: false,
        error: 'Project is too large to download. Try removing unnecessary assets.'
      });
    }

    const dataUrl = `data:application/zip;base64,${base64Content}`;

    console.log(`[create-zip] Zip created successfully (${estimatedSizeMB.toFixed(1)}MB)`);
    res.json({
      success: true,
      dataUrl,
      fileName: 'volturiano-project.zip',
      message: 'Zip file created successfully'
    });
  } catch (error) {
    console.error('[create-zip] Error:', error.message);
    res.status(error.message.includes('timed out') ? 504 : 500).json({
      success: false,
      error: error.message.includes('timed out')
        ? 'Download timed out. The sandbox may be unresponsive — try again.'
        : 'Failed to create download package.'
    });
  }
}
