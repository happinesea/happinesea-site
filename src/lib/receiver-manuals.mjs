import pilot from '../data/manuals/receiver-web-pilot.json' with { type: 'json' };
import batch2 from '../data/manuals/receiver-web-batch2.json' with { type: 'json' };

const manuals = [...pilot.manuals, ...batch2.manuals];
if (new Set(manuals.map((m) => m.product_id)).size !== manuals.length)
  throw new Error('Duplicate receiver manual scope');
export default { manuals };
