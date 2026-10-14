export async function decodePublicationImages(page) {
  return page.locator('img:visible').evaluateAll(async (images) => {
    // Load offscreen lazy figures without hundreds of scroll/layout round trips.
    for (const image of images) image.loading = 'eager';
    return Promise.all(
      images.map(async (image) => {
        await image.decode();
        return image.naturalWidth;
      }),
    );
  });
}

export async function capturePublicationScreenshot(page, path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          globalThis.requestAnimationFrame(() =>
            globalThis.requestAnimationFrame(resolve),
          ),
        ),
    );
    try {
      await page.screenshot({ path, fullPage: true, scale: 'css' });
      return;
    } catch (error) {
      if (
        attempt === 1 ||
        !String(error).includes(
          'Protocol error (Page.captureScreenshot): Unable to capture screenshot',
        )
      )
        throw error;
      console.warn(`Retrying Chromium screenshot once: ${path}`);
    }
  }
}
