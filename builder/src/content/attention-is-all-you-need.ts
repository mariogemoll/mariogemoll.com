import {
  createMarkdownRenderer, readMarkdownFile, replaceWidgetPlaceholders
} from '../page-helpers.js';
import type { PageContentParams } from '../types.js';

const nonBilingualSentencePairs = [
  [
    8,
    'ACDSee 9 Photo Manager Organize your photos. Share your world.',
    'Translator Internet is a Toolbar for MS Internet Explorer.'
  ],
  [
    100015,
    'The Beeches Hotel & Victorian Gardens is country-house accommodation just a few minutes’ ' +
  'walk from the centre of Norwich.',
    'Stay at the Ramada Norwich and experience everything that you would expect from an ' +
  'international hotel company.'
  ],
  [
    1234002,
    'Sitges Hotel / Hotel San Sebastian Playa is at a privileged spot, washed by the ' +
    'Mediterranean and blessed with a microclimate...',
    'Barcelona Hotel / The Amrey Diagonal is on the Diagonal Avenue, only 300 metres away from ' +
    'the Plaça de les Glòries Catalanes ...'
  ]
];

const notTranslations = [
  [
    121,
    "The person in the image has tattoos all around the chest area. I've tried so many times to " +
    "cover the tattoos and couldn't.",
    'Der Noise Buster ist ein wirklich gutes Programm.',
    'The Noise Buster is a really good program.'
  ],
  [
    200436,
    'Nearby 20 golf courses, horse riding, malt whisky trail, fishing.',
    'In einigen der Gästezimmer können Sie sogar in Himmelbetten nächtigen.',
    'In some of the guest rooms, you can even sleep in four-poster beds.'
  ],
  [
    1000144,
    'The initiative’s patron is President Horst Koehler.',
    'Prämiert werden Orte, die zukunftsorientierte Ideen entwickeln und aktiv umsetzen.',
    'What is being awarded are places that develop forward-looking ideas and actively implement ' +
    'them.'
  ]
];

function generateTableHeaderRow(labels: string[]): string {
  const headerCells = labels.map(label => `<th>${label}</th>`).join('\n');
  return `<thead>
<tr>
${headerCells}
</tr>
</thead>`;
}

function generateTableBodyRow(values: (string | number)[]): string {
  const bodyCells = values.map(value => `<td>${value}</td>`).join('\n');
  return `<tr>
${bodyCells}
</tr>`;
}

function generateTable(
  headers: string[], rows: (string | number)[][], linkLineNumbers = false
): string {
  const headerHtml = generateTableHeaderRow(headers);

  let bodyRows: string[];
  if (linkLineNumbers) {
    bodyRows = rows.map(row => {
      const [lineNumber, ...restValues] = row;
      const lineNum = Number(lineNumber);
      const from = Math.floor((lineNum - 1) / 1000) * 1000 + 1;
      const to = from + 999;
      const u = `/parallel-corpus-viewer?corpus=commoncrawl-deen&from=${from}&to=${to}#${lineNum}`;
      const linkedLineNumber = `<a href="${u}">${lineNumber}</a>`;
      return generateTableBodyRow([linkedLineNumber, ...restValues]);
    });
  } else {
    bodyRows = rows.map(row => generateTableBodyRow(row));
  }

  return `<table>
${headerHtml}
<tbody>
${bodyRows.join('\n')}
</tbody>
</table>`;
}

export async function generatePage(
  contentPath: string,
  pageTitle: string
): Promise<PageContentParams> {

  const md = createMarkdownRenderer();

  let mdContent = await readMarkdownFile(contentPath, 'attention-is-all-you-need.md', pageTitle);

  const widgets = [
    [
      'corpora',
      1000,
      250,
      'Comparsion of the sizes of the different corpora in the WMT14 dataset. One box represents ' +
        '1000 sentence pairs.'
    ],
    [
      'buckets',
      1300,
      250,
      'Visualization of the distribution of sentence pairs across different buckets. One box ' +
        'represents 1000 sentence pairs.'
    ],
    ['train-loss', 600, 300],
    ['loss', 600, 300],
    ['perplexity', 600, 300],
    ['bleu', 600, 300]
  ] as const;

  mdContent = replaceWidgetPlaceholders(mdContent, widgets);

  // Generate not-translations table
  const notTranslationsTableHtml = generateTable(
    ['Line', 'English', 'German', 'Actual meaning'],
    notTranslations,
    true
  );

  mdContent = mdContent.replace('[[ not-translations-table ]]', notTranslationsTableHtml);

  // Generate not-bilingual table
  const notBilingualTableHtml = generateTable(
    ['Line', 'English', 'German'],
    nonBilingualSentencePairs,
    true
  );

  mdContent = mdContent.replace('[[ not-bilingual-table ]]', notBilingualTableHtml);

  const html = md.render(mdContent);
  const cssFiles: string[] = [
    '/misc/centered.css',
    '/misc/widgets.css',
    '/attention-is-all-you-need/attention-is-all-you-need.css'
  ];
  const jsUrls: string[] = [];
  const jsModuleUrls = ['/attention-is-all-you-need/attention-is-all-you-need.js'];
  return [html, cssFiles, jsUrls, jsModuleUrls];
}
