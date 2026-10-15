import type { Catalog, OreDef, StratumDef } from '../core/strata';
import oresJson from './ores.json';
import strataJson from './strata.json';

export const CATALOG: Catalog = {
  strata: strataJson as StratumDef[],
  ores: oresJson as OreDef[],
};
