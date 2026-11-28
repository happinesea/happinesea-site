import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { docsLoader } from '@astrojs/starlight/loaders';
import receiverManuals from './receiver-manuals.mjs';
import {
  initialManualReleaseEntries,
  isInitialManualRelease,
} from './manual-release.mjs';

export function manualDocsLoader(): ReturnType<typeof docsLoader> {
  const loader = docsLoader();
  if (process.env.PUBLICATION_MODE !== 'production') return loader;
  const known = new Map(
    receiverManuals.manuals.map((entry) => [entry.route, entry]),
  );
  return {
    ...loader,
    async load(context) {
      await loader.load(context);
      const seen = new Set<string>();
      for (const [id, entry] of context.store.entries()) {
        const route = `/${entry.data.slug}/`;
        const manual = known.get(route);
        if (!manual) continue;
        if (!isInitialManualRelease(manual)) {
          // RTC8 is an existing noindex compatibility URL outside the product catalogue.
          if (
            manual.publication_status !== 'PUBLISHED' &&
            route !== '/manuals/rtc8/'
          )
            context.store.delete(id);
          continue;
        }
        const bytes = await readFile(resolve(entry.filePath ?? ''));
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (hash !== manual.mdx_sha256)
          throw new Error(`Initial release MDX SHA mismatch: ${route}`);
        seen.add(route);
        const head = Array.isArray(entry.data.head) ? entry.data.head : [];
        context.store.set({
          ...entry,
          digest: `${entry.digest}:initial-release`,
          data: {
            ...entry.data,
            status: 'published',
            draft: false,
            head: head.filter(
              (tag) => !(tag.tag === 'meta' && tag.attrs?.name === 'robots'),
            ),
          },
        });
      }
      for (const release of initialManualReleaseEntries) {
        if (!seen.has(release.route))
          throw new Error(
            `Initial release route missing or not bound to manifest: ${release.route}`,
          );
      }
    },
  };
}
