import type { AreaDef, Catalog, GenreDef, ItemDef } from '../core/catalog';
import genresJson from './genres.json';
import itemsJson from './items.json';
import strataJson from './strata.json';

export const CATALOG: Catalog = {
  areas: strataJson as AreaDef[],
  genres: genresJson as GenreDef[],
  items: itemsJson as ItemDef[],
};
