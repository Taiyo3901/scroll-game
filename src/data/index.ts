import type { AreaDef, Catalog, GenreDef, ItemDef } from '../core/catalog';
import genresJson from './genres.json';
import itemsJson from './items.json';
import areasJson from './areas.json';

export const CATALOG: Catalog = {
  areas: areasJson as AreaDef[],
  genres: genresJson as GenreDef[],
  items: itemsJson as ItemDef[],
};
