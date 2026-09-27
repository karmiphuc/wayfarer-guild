// Prints the runtime loader's asset list as JSON (input for tools/pack_atlas.py).
import { assetList } from '../js/assets.js';
console.log(JSON.stringify([...new Set(assetList().map(([, s]) => s))]));
