import { sandboxManager } from './sandbox/sandbox-manager.js';

/**
 * Verifies the build in the sandbox by running 'npx vite build'.
 * @param {string} sandboxId - The ID of the sandbox to verify.
 * @returns {Promise<{success: boolean, logs: string, exitCode: number}>}
 */
export async function verifySandboxBuild(sandboxId) {
    console.log(`[verify-build] Checking build for sandbox ${sandboxId}...`);

    // 1. Get provider from manager
    const provider = sandboxManager.getProvider(sandboxId);

    if (!provider) {
        console.error(`[verify-build] No active provider found for sandbox ${sandboxId}.`);
        return {
            success: false,
            logs: `Sandbox session for ${sandboxId} not found in manager. Reconnection may be required.`,
            exitCode: -1
        };
    }

    console.log(`[verify-build] Running 'npx vite build' via provider...`);

    try {
        // 2. Fix permissions (Vite needs to write temp config files during build)
        await provider.runCommand('sudo chown -R user:user /home/user/app || true');

        // 3. Run build command via provider's abstraction (use --base=./ for relative asset paths)
        console.log(`[verify-build] Starting build...`);
        const result = await provider.runCommand('npx vite build --base=./');

        let logs = `STDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`;
        console.log(`[verify-build] Build finished with exit code: ${result.exitCode}`);

        if (!result.success) {
            console.warn(`[verify-build] Build failed. Running diagnostics...`);
            const lsResult = await provider.runCommand('ls -la');
            const npmResult = await provider.runCommand('npm list --depth=0');

            logs += `\n\n--- DIAGNOSTICS ---\n`;
            logs += `[ls -la]:\n${lsResult.stdout}\n${lsResult.stderr}\n`;
            logs += `[npm list]:\n${npmResult.stdout}\n${npmResult.stderr}\n`;
        }

        // Truncate logs if too long (cap at 15k chars)
        const truncatedLogs = logs.length > 15000 ? logs.substring(0, 15000) + '\n...[truncated]' : logs;

        return {
            success: result.success,
            logs: truncatedLogs,
            exitCode: result.exitCode
        };

    } catch (error) {
        console.error('[verify-build] Execution error in provider:', error);

        return {
            success: false,
            logs: `Execution error: ${error.message}`,
            exitCode: 1
        };
    }
}
