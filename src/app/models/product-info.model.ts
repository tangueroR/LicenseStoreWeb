import { ProductType } from './sico-anlage.model';

/**
 * Static product knowledge that is not part of the backend data: display name,
 * lifecycle and the categorical chart color. Used by the statistics view so a
 * missing bar can be read as "product was not sold yet / any more" instead of
 * "no data".
 */
export interface ProductInfo {
  product: ProductType;
  label: string;
  /** First year the product was no longer sold; undefined = still available */
  discontinuedFrom?: number;
  /** First year the product was sold; undefined = sold for as long as records go back */
  availableFrom?: number;
  /** Lifecycle note shown in the statistics legend */
  note: string;
  /** Categorical palette slot (1-4), resolved to a color via --viz-series-N */
  colorSlot: 1 | 2 | 3 | 4;
}

/**
 * Order matters: it is the fixed categorical color order of the charts, so a
 * product keeps its color no matter which products are on screen.
 */
export const PRODUCT_INFOS: readonly ProductInfo[] = [
  {
    product: 'sico6000',
    label: 'Sico6000',
    availableFrom: 2022,
    note: 'Löst die Sico5000 ab, seit 2022 im Verkauf.',
    colorSlot: 1
  },
  {
    product: 'sico2020',
    label: 'Sico2020',
    note: 'Nachfolger der Sico1010, im Verkauf.',
    colorSlot: 2
  },
  {
    product: 'sico1010',
    label: 'Sico1010',
    note: 'Von der Sico2020 abgelöst, wird aber weiterhin verkauft.',
    colorSlot: 3
  },
  {
    product: 'sico5000',
    label: 'Sico5000',
    discontinuedFrom: 2022,
    note: 'Seit 2022 nicht mehr im Verkauf, ersetzt durch die Sico6000.',
    colorSlot: 4
  }
];
