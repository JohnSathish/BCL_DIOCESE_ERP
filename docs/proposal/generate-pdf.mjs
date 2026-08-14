import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'parish-subscription-proposal.html');
const pdfPath = join(__dirname, 'PARISH_YEARLY_SUBSCRIPTION_PROPOSAL.pdf');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findBrowser() {
  for (const p of chromePaths) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  readFileSync(htmlPath, 'utf8');
  const browser = findBrowser();
  if (!browser) {
    throw new Error('Chrome or Edge required for PDF generation.');
  }
  const uri = `file:///${htmlPath.replace(/\\/g, '/')}`;
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    uri,
  ]);
  console.log(`PDF generated: ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
