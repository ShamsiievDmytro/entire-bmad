import { priceStore } from '../stores/price-store';
import { formatPrice } from '../utils/format-utils';

const DEFAULT_TITLE = 'Metrics';
const TITLE_SEPARATOR = ' — ';

export function initTabTitleUpdater(): void {
  priceStore.subscribe((tick) => {
    if (tick === null) {
      document.title = DEFAULT_TITLE;
      return;
    }
    document.title = formatPrice(tick.price) + TITLE_SEPARATOR + DEFAULT_TITLE;
  });
}
