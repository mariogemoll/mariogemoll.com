#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import * as fs from 'fs';
import * as path from 'path';

import { config } from './license-config.js';

interface ValidationError {
	file: string;
	expected: string;
	actual: string | null;
	field?: 'copyright' | 'license';
}

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
      .replace(/\./g, '\\.')
      .replace(/\*\*\//g, '(.*/)?')  // **/ matches zero or more directory segments
      .replace(/\/\*\*/g, '(/.*)?')  // /** matches zero or more directory segments at end
      .replace(/\*\*/g, '.*')        // ** in other positions matches any characters
      .replace(/\*/g, '[^/]*');       // * matches any characters except /
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

function extractLicenseFromContent(content: string): string | null {
  // Check first 5 lines for SPDX identifier
  const lines = content.split('\n').slice(0, 5);

  for (const line of lines) {
    const match = /SPDX-License-Identifier:\s*([^\s-]+(?:-[^\s-]+)*)/.exec(line);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractCopyrightFromContent(content: string): string | null {
  // Check first 5 lines for SPDX copyright
  const lines = content.split('\n').slice(0, 5);

  for (const line of lines) {
    const match = /SPDX-FileCopyrightText:\s*(.+?)(?:\s*(?:-->|$))/.exec(line);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function hasEmptyLineAfterHeaders(content: string): boolean {
  // Check if there's an empty line after the SPDX headers
  const lines = content.split('\n');
  let licenseLineIndex = -1;

  // Find the line with SPDX-License-Identifier (should come after FileCopyrightText)
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].includes('SPDX-License-Identifier:')) {
      licenseLineIndex = i;
      break;
    }
  }

  if (licenseLineIndex === -1) {
    return false;
  }

  // Check if the next line is empty
  const nextLineIndex = licenseLineIndex + 1;
  if (nextLineIndex < lines.length) {
    return lines[nextLineIndex].trim() === '';
  }

  return false;
}

function validateFile(filePath: string, expectedLicense: string): ValidationError | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const actualLicense = extractLicenseFromContent(content);
  const actualCopyright = extractCopyrightFromContent(content);
  const relativePath = path.relative(process.cwd(), filePath);

  // Valid copyright years: 2025, 2026, or 2025-2026
  const validCopyrights = ['2025 Mario Gemoll', '2026 Mario Gemoll', '2025-2026 Mario Gemoll'];

  // Check copyright
  if (actualCopyright === null) {
    return {
      file: relativePath,
      expected: validCopyrights.join(' or '),
      actual: null,
      field: 'copyright'
    };
  }

  if (!validCopyrights.includes(actualCopyright)) {
    return {
      file: relativePath,
      expected: validCopyrights.join(' or '),
      actual: actualCopyright,
      field: 'copyright'
    };
  }

  // Check license
  if (actualLicense === null) {
    return {
      file: relativePath,
      expected: expectedLicense,
      actual: null,
      field: 'license'
    };
  }

  if (actualLicense !== expectedLicense) {
    return {
      file: relativePath,
      expected: expectedLicense,
      actual: actualLicense,
      field: 'license'
    };
  }

  // Check for empty line after headers
  if (!hasEmptyLineAfterHeaders(content)) {
    return {
      file: relativePath,
      expected: 'empty line after SPDX headers',
      actual: 'no empty line found',
      field: 'license'
    };
  }

  return null;
}

function checkDirectory(dir: string, errors: ValidationError[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!config.excludedDirs.includes(entry.name)) {
        checkDirectory(fullPath, errors);
      }
    } else if (entry.isFile()) {
      if (config.excludedFiles.includes(entry.name)) {
        continue;
      }

      const expectedLicense = getLicenseForFile(fullPath);
      const commentStyle = getCommentStyle(fullPath);

      if (expectedLicense !== null && commentStyle !== null) {
        const error = validateFile(fullPath, expectedLicense);
        if (error) {
          errors.push(error);
        }
      }
    }
  }
}

function main(): void {
  const rootDir = process.cwd();
  const errors: ValidationError[] = [];

  console.log('Checking SPDX license headers...\n');
  checkDirectory(rootDir, errors);

  if (errors.length === 0) {
    console.log('✓ All files have correct license headers!');
    process.exit(0);
  } else {
    console.error(`✗ Found ${errors.length} file(s) with incorrect or missing license headers:\n`);

    for (const error of errors) {
      const fieldName = error.field === 'copyright' ? 'copyright' : 'license';
      if (error.actual === null) {
        console.error(`  ${error.file}`);
        console.error(`    Missing ${fieldName} header (expected: ${error.expected})`);
      } else {
        console.error(`  ${error.file}`);
        console.error(`    Expected ${fieldName}: ${error.expected}`);
        console.error(`    Found ${fieldName}:    ${error.actual}`);
      }
      console.error('');
    }

    console.error('Run "scripts/add-license-headers.sh" to fix these issues.');
    process.exit(1);
  }
}

main();
