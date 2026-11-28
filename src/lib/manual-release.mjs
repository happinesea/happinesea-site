import release from '../data/manuals/initial-release.json' with { type: 'json' };

const entriesByRoute = new Map(release.map((entry) => [entry.route, entry]));
if (entriesByRoute.size !== release.length)
  throw new Error('Duplicate initial manual release route');

export function isInitialManualRelease(entry) {
  const releaseEntry = entriesByRoute.get(entry.route);
  return Boolean(
    releaseEntry &&
    releaseEntry.canonical_sha256 === entry.canonical_sha256 &&
    releaseEntry.mdx_sha256 === entry.mdx_sha256,
  );
}

export { release as initialManualReleaseEntries };
