export default async function createZip(req, res) {
  try {
    const provider = global.activeSandboxProvider;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'No active sandbox' });
    }

    console.log('[create-zip] Creating project zip...');

    const zipCmd = 'zip -r /tmp/project.zip . -x "node_modules/*" ".git/*" ".next/*" "dist/*" "build/*" "*.log"';
    const zipResult = await provider.runCommand(zipCmd);

    if (!zipResult.success) {
      throw new Error(`Failed to create zip: ${zipResult.stderr || zipResult.stdout}`);
    }

    const base64Result = await provider.runCommand('base64 /tmp/project.zip');
    if (!base64Result.success) {
      throw new Error(`Failed to read zip: ${base64Result.stderr}`);
    }

    const base64Content = (base64Result.stdout || '').replace(/\s/g, '');
    const dataUrl = `data:application/zip;base64,${base64Content}`;

    console.log('[create-zip] Zip created successfully');
    res.json({
      success: true,
      dataUrl,
      fileName: 'volturiano-project.zip',
      message: 'Zip file created successfully'
    });
  } catch (error) {
    console.error('[create-zip] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
