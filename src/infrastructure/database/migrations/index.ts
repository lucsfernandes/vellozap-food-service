import { Baseline1717200000000 } from './0000000000000-Baseline.js';
import { AddAuthTables1717200001000 } from './0001000000000-AddAuthTables.js';
import { AddProductCategorySize1717200002000 } from './0002000000000-AddProductCategorySize.js';
import { AddDeliveryZones1717200003000 } from './0003000000000-AddDeliveryZones.js';
import { AddWhatsApp1717200004000 } from './0004000000000-AddWhatsApp.js';
import { AddPromotions1717200005000 } from './0005000000000-AddPromotions.js';

export const ALL_MIGRATIONS = [
  Baseline1717200000000,
  AddAuthTables1717200001000,
  AddProductCategorySize1717200002000,
  AddDeliveryZones1717200003000,
  AddWhatsApp1717200004000,
  AddPromotions1717200005000,
] as const;

/** The name TypeORM records for the baseline; used by scripts/baseline.ts. */
export const BASELINE_MIGRATION_NAME = 'Baseline1717200000000';
