import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Chromium's single long bitmap can wrap at 16384px; capture bounded CSS clips.
export async function captureManualPage(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
  const width = Math.ceil(cssContentSize.width);
  const height = Math.ceil(cssContentSize.height);
  const tiles = [];
  const placements = [];
  await mkdir(`${path}.tiles`, { recursive: true });
  for (let top = 0; top < height; top += 4096) {
    const tileHeight = Math.min(4096, height - top);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: top, width, height: tileHeight, scale: 1 },
    });
    const input = Buffer.from(data, 'base64');
    const dimensions = await sharp(input).metadata();
    if (dimensions.width !== width || dimensions.height !== tileHeight)
      throw new Error('Screenshot tile dimensions differ from its CSS clip');
    const filename = `tile-${top}.png`;
    await writeFile(`${path}.tiles/${filename}`, input);
    tiles.push({ input, top, left: 0 });
    placements.push({ filename, top, width, height: tileHeight });
  }
  await sharp({ create: { width, height, channels: 4, background: '#fff' } })
    .composite(tiles)
    .png()
    .toFile(path);
  await writeFile(
    `${path}.tiles/map.json`,
    JSON.stringify({ width, height, tiles: placements }, null, 2) + '\n',
  );
  await cdp.detach();
}
