import pilot from '../data/manuals/receiver-web-pilot.json' with { type: 'json' };
import batch2 from '../data/manuals/receiver-web-batch2.json' with { type: 'json' };

import batch3 from '../data/manuals/receiver-web-batch3.json' with { type: 'json' };

import batch4 from '../data/manuals/receiver-web-batch4.json' with { type: 'json' };

import batch5 from '../data/manuals/receiver-web-batch5.json' with { type: 'json' };

import batch6 from '../data/manuals/receiver-web-batch6.json' with { type: 'json' };

import bymedb from '../data/manuals/bymedb-web.json' with { type: 'json' };

const manuals = [
  ...pilot.manuals,
  ...batch2.manuals,
  ...batch3.manuals,
  ...batch4.manuals,
  ...batch5.manuals,
  ...batch6.manuals,
  ...bymedb.manuals,
];
if (new Set(manuals.map((m) => m.product_id)).size !== manuals.length)
  throw new Error('Duplicate receiver manual scope');
export default { manuals };
