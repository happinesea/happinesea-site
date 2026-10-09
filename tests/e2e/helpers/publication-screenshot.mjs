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
