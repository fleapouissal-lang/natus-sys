"use client";

import { useEffect, useMemo, useState } from "react";

/** Taille par défaut des tableaux (commandes, ventes, réclamations…). */
export const DEFAULT_PAGE_SIZE = 10;

/** Catalogue produits (directeur / gérant). */
export const PRODUCT_PAGE_SIZE = 50;

/** Table inventaire stock (magasin / global). */
export const INVENTORY_PAGE_SIZE = 50;

/** Cartes magasins et stock déplié par magasin. */
export const STORE_PAGE_SIZE = 6;

/** Journal des actualités (articles longs). */
export const NEWS_PAGE_SIZE = 5;

export function usePagination<T>(
  items: T[],
  pageSize: number,
  resetToken?: string | number
) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [resetToken]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeStart = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, items.length);

  return {
    page: safePage,
    setPage,
    totalPages,
    paginated,
    totalItems: items.length,
    rangeStart,
    rangeEnd,
  };
}
