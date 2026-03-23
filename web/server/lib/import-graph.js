
import path from 'node:path';

/**
 * Validates imports within a set of files to ensure they resolve to existing files.
 * @param {Array<{path: string, content: string}>} files - The generated files.
 * @param {Array<{name: string, path: string}>} premiumComponents - Available premium components.
 * @returns {Array<{code: string, from: string, to: string, kind: string, message: string}>} - List of issues.
 */
export function validateImports(files, premiumComponents = []) {
    const issues = [];

    // 1. Build a set of available file paths (normalized)
    const availableFiles = new Set();

    // Add generated files
    files.forEach(f => {
        availableFiles.add(path.normalize(f.path));
    });

    // Add premium components
    premiumComponents.forEach(pc => {
        if (pc.path) {
            availableFiles.add(path.normalize(pc.path));
        }
    });

    // Whitelist standard Vite template files (always present but not in 'files')
    availableFiles.add(path.normalize('src/index.css'));
    availableFiles.add(path.normalize('src/main.jsx'));
    availableFiles.add(path.normalize('src/App.css'));

    // Helper to check if a path exists with common extensions
    function resolveFile(dir, importPath) {
        // Resolve absolute path from project root (assuming project root is usually CWD or relative to file)
        // Here we assume file.path is relative to project root (e.g. src/components/Foo.jsx)

        // Resolve import relative to the importing file's directory
        const resolvedPath = path.normalize(path.join(dir, importPath));

        // Check exact match
        if (availableFiles.has(resolvedPath)) return true;

        // Check extensions
        const extensions = ['.jsx', '.js', '.tsx', '.ts', '.css', '.json'];
        for (const ext of extensions) {
            if (availableFiles.has(resolvedPath + ext)) return true;
        }

        // Check index files (e.g. import './dir' -> './dir/index.jsx')
        for (const ext of extensions) {
            if (availableFiles.has(path.join(resolvedPath, `index${ext}`))) return true;
        }

        return false;
    }

    // 2. Scan each file for imports
    const importRegex = /import\s+(?:(?:[\w{}\s,*]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    // Also handle dynamic imports if needed, but for now strict static imports

    files.forEach(file => {
        let match;
        // Reset regex state
        importRegex.lastIndex = 0;

        const fileDir = path.dirname(file.path);
        const content = file.content || '';

        while ((match = importRegex.exec(content)) !== null) {
            const importSource = match[1];

            // We only validate relative imports (starting with .)
            // Absolute imports (packages) are assumed to be valid (or validated elsewhere)
            if (importSource.startsWith('.')) {
                const isValid = resolveFile(fileDir, importSource);

                if (!isValid) {
                    issues.push({
                        code: 'E-IMP-01',
                        from: file.path,
                        to: importSource,
                        kind: 'missing_local_import',
                        message: `File '${file.path}' attempts to import '${importSource}', but it doesn't exist in the generated output or premium components.`
                    });
                }
            }
        }
    });

    return issues;
}
