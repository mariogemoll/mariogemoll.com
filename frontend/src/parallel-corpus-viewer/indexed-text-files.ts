// SPDX-FileCopyrightText: 2025 Mario Gemoll
// SPDX-License-Identifier: 0BSD

import { getData } from './indexed-files';

export async function getLines(
  indexFileUrl: string,
  textFileUrl: string,
  startLineIdx: number,
  numLines: number
): Promise<string[]> {
  const textResponse = await getData(indexFileUrl, textFileUrl, startLineIdx, numLines);

  const textData = await textResponse.text();

  // Split into lines and return
  return textData.split('\n').filter((line, index) => index < numLines);
}
