// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

export interface LicenseRule {
	/** File patterns (glob-like) or specific filenames */
	files: string[];
	/** SPDX license identifier */
	license: string;
	/** Optional: more specific description */
	description?: string;
	/** Optional: attribution text to include after SPDX headers */
	attribution?: string;
}

export interface LicenseConfig {
	/** Directories to exclude from processing */
	excludedDirs: string[];
	/** Specific files to exclude */
	excludedFiles: string[];
	/** Copyright text for SPDX-FileCopyrightText header */
	copyrightText: string;
	/** License rules, processed in order (first match wins) */
	rules: LicenseRule[];
}

export const config: LicenseConfig = {
  excludedDirs: ['node_modules', 'dist', 'build', '.git', 'build_info', 'LICENSES'],
  excludedFiles: ['.DS_Store'],
  copyrightText: `${new Date().getFullYear()} Mario Gemoll`,
  rules: [
    // Specific markdown files with CC-BY-NC-SA
    {
      files: ['content/diffusion.md', 'content/flow-matching.md'],
      license: 'CC-BY-NC-SA-4.0',
      description: 'Diffusion and flow matching content'
    },
    // All other markdown files with CC-BY
    {
      files: ['**/*.md'],
      license: 'CC-BY-4.0',
      description: 'General content'
    },
    // Code files with 0BSD
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.sh'],
      license: '0BSD',
      description: 'Source code'
    }
  ]
};
