import { setUpDatasetExplanation } from './datasetexplanation.js';
import { el } from './util.js';


async function page(): Promise<void> {

  const pica = window.pica();

  await setUpDatasetExplanation(
    pica,
    '/vae/face.png',
    el(document, '#dataset-explanation div.box') as HTMLDivElement);
  console.log('VAE page setup complete');
}

window.addEventListener('load', () => {
  page().catch((error: unknown) => {
    console.error('Error during page load:', error);
  });
});
