async function fetchFile(url: string, init: RequestInit | undefined): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response;
}

// Fetch a 32-bit unsigned integer from a binary file at the given index
export async function getNumber(fileUrl: string, idx: number): Promise<number> {
  const start = idx * 4;
  const end = start + 3;
  const response = await fetchFile(fileUrl, {
    headers: { 'Range': `bytes=${start.toString()}-${end.toString()}` }
  });
  const buffer = await response.arrayBuffer();
  const view = new DataView(buffer);
  return view.getUint32(0, true);
}

export async function getStartPos(
  indexFileUrl: string,
  idx: number
): Promise<number> {
  if (idx === 0) {
    return 0;
  } else {
    const endPosOfPrevEntry = await getNumber(indexFileUrl, idx - 1);
    return endPosOfPrevEntry + 1;
  }
}

export async function getStartAndEndPos(
  indexFileUrl: string,
  startIdx: number,
  numEntries: number
): Promise<[number, number]> {
  return Promise.all([
    getStartPos(indexFileUrl, startIdx),
    getNumber(indexFileUrl, startIdx + numEntries - 1)
  ]);
}

export async function getData(
  indexFileUrl: string,
  dataFileUrl: string,
  startIdx: number,
  numEntries: number
): Promise<Response> {

  const [startPos, endPos] = await getStartAndEndPos(indexFileUrl, startIdx, numEntries);

  // Fetch the text data for the required range
  const dataResponse = await fetch(dataFileUrl, {
    headers: {
      'Range': `bytes=${startPos.toString()}-${(endPos - 1).toString()}`
    }
  });

  if (!dataResponse.ok) {
    throw new Error(`Failed to fetch data: ${dataResponse.status.toString()}`);
  }
  return dataResponse;
}
