#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import * as fs from 'fs';
import * as path from 'path';

import { config } from './license-config.js';

function getCommentStyle(filePath: string): { start: string; end: string } | null {
  const ext = path.extname(filePath);

  switch (ext) {
  case '.ts':
  case '.tsx':
  case '.js':
  case '.jsx':
    return { start: '// ', end: '' };
  case '.py':
  case '.sh':
    return { start: '# ', end: '' };
  case '.md':
    return { start: '<!-- ', end: ' -->' };
  default:
    return null;
  }
}

function matchesPattern(filePath: string, pattern: string): boolean {
  // Simple glob matching - supports **/*.ext and specific paths
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Exact match
  if (normalizedPath === normalizedPattern) {
    return true;
  }

  // Pattern like **/*.ext
  if (normalizedPattern.includes('*')) {
    const regexPattern = normalizedPattern
      .replace(/\*\*\//g, '__GLOBSTAR_SLASH__')  // **/ → placeholder
      .replace(/\/\*\*/g, '__SLASH_GLOBSTAR__')  // /** → placeholder
      .replace(/\*\*/g, '__GLOBSTAR__')          // ** → placeholder
      .replace(/\*/g, '__STAR__')                // * → placeholder
      .replace(/\./g, '\\.')                     // Escape dots
      .replace(/__GLOBSTAR_SLASH__/g, '(.*/)?')  // **/ matches zero or more directory segments
      .replace(/__SLASH_GLOBSTAR__/g, '(/.*)?')  // /** matches dir segments at end
      .replace(/__GLOBSTAR__/g, '.*')            // ** in other positions matches any characters
      .replace(/__STAR__/g, '[^/]*');             // * matches any characters except /
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }

  return false;
}

function getLicenseForFile(filePath: string): string | null {
  const relativePath = path.relative(process.cwd(), filePath);

  // Check each rule in order
  for (const rule of config.rules) {
    for (const pattern of rule.files) {
      if (matchesPattern(relativePath, pattern)) {
        return rule.license;
      }
    }
  }

  return null;
}

function hasLicenseHeader(content: string): boolean {
  // Check if file already has an SPDX identifier in the first few lines
  const lines = content.split('\n').slice(0, 5);
  return lines.some(line => line.includes('SPDX-License-Identifier:'));
}

function addLicenseHeader(
  filePath: string,
  license: string,
  commentStyle: { start: string; end: string }
): string {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (hasLicenseHeader(content)) {
    return 'skipped (already has license)';
  }

  const copyrightHeader =
    `${commentStyle.start}SPDX-FileCopyrightText: ${config.copyrightText}${commentStyle.end}\n`;
  const licenseHeader =
    `${commentStyle.start}SPDX-License-Identifier: ${license}${commentStyle.end}\n`;
  const header = copyrightHeader + licenseHeader + '\n';

  // Handle shebangs - they must remain first
  if (content.startsWith('#!')) {
    const firstNewline = content.indexOf('\n');
    const shebang = content.substring(0, firstNewline + 1);
    const rest = content.substring(firstNewline + 1);
    fs.writeFileSync(filePath, shebang + header + rest);
  } else {
    fs.writeFileSync(filePath, header + content);
  }

  return 'added';
}

function processDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!config.excludedDirs.includes(entry.name)) {
        processDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      if (config.excludedFiles.includes(entry.name)) {
        continue;
      }

      const license = getLicenseForFile(fullPath);
      const commentStyle = getCommentStyle(fullPath);

      if (license !== null && commentStyle !== null) {
        const relativePath = path.relative(process.cwd(), fullPath);
        const result = addLicenseHeader(fullPath, license, commentStyle);
        console.log(`${relativePath}: ${license} - ${result}`);
      }
    }
  }
}

function main(): void {
  const rootDir = process.cwd();
  console.log('Adding SPDX license headers...\n');
  processDirectory(rootDir);
  console.log('\nDone!');
}

main();
