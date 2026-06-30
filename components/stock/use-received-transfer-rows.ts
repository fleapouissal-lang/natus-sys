"use client";

import { useMemo } from "react";
import type { ReceivedTransfersFilterScope } from "@/lib/stock-transfers/received-filters";
import {
  mergeLocationOptionsFromRows,
  storesToLocationOptions,
  withAllLocationOption,
  type ReceivedTransferLocationOption,
  type ReceivedTransferLocationSites,
} from "@/lib/stock-transfers/received-location-filters";
import {
  applyReceivedTransferRowFilters,
  buildReceivedTransferRows,
  type ReceivedTransferProductLookup,
  type ReceivedTransferRowGroup,
} from "@/lib/stock-transfers/received-transfer-rows";

export type ReceivedTransfersLocationConfig = {
  sourceSites: ReceivedTransferLocationSites[];
  destinationSites: ReceivedTransferLocationSites[];
  /** Caissier : destination figée sur le magasin du compte */
  lockDestination?: boolean;
  /** Gérant : destination limitée aux magasins associés (sans enrichissement depuis les lignes) */
  strictDestinationOptions?: boolean;
};

export function useReceivedTransferRows(
  groups: ReceivedTransferRowGroup[],
  filter: ReceivedTransfersFilterScope,
  productLookup?: ReceivedTransferProductLookup,
  locationConfig?: ReceivedTransfersLocationConfig
) {
  const allRows = useMemo(() => buildReceivedTransferRows(groups), [groups]);

  const sourceOptions = useMemo((): ReceivedTransferLocationOption[] => {
    if (!locationConfig) {
      return withAllLocationOption(
        mergeLocationOptionsFromRows([], allRows, "source"),
        "Toutes les sources"
      );
    }
    const base = storesToLocationOptions(locationConfig.sourceSites);
    return withAllLocationOption(
      mergeLocationOptionsFromRows(base, allRows, "source"),
      "Toutes les sources"
    );
  }, [allRows, locationConfig]);

  const destinationOptions = useMemo((): ReceivedTransferLocationOption[] => {
    if (!locationConfig) {
      return withAllLocationOption(
        mergeLocationOptionsFromRows([], allRows, "destination"),
        "Toutes les destinations"
      );
    }
    const base = storesToLocationOptions(locationConfig.destinationSites);
    const options = locationConfig.strictDestinationOptions
      ? base
      : mergeLocationOptionsFromRows(base, allRows, "destination");
    return withAllLocationOption(options, "Toutes les destinations");
  }, [allRows, locationConfig]);

  const rows = useMemo(
    () => applyReceivedTransferRowFilters(allRows, filter, productLookup),
    [
      allRows,
      filter.productQuery,
      filter.status,
      filter.sourceStoreId,
      filter.destStoreId,
      productLookup,
    ]
  );

  return {
    rows,
    allRows,
    sourceOptions,
    destinationOptions,
    lockDestination: locationConfig?.lockDestination ?? false,
  };
}
