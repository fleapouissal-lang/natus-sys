"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  Warehouse,
  ShoppingCart,
  Loader2,
  Banknote,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { ManagerScanPanel } from "@/components/pos/manager-scan-panel";
import { CashierScanPanel } from "@/components/pos/cashier-scan-panel";
import { Modal } from "@/components/ui/modal";
import { Receipt, printReceipt, type ReceiptData } from "@/components/pos/receipt";
import { ProductCatalog } from "@/components/pos/product-catalog";
import { completeSale, completeShopifyOrderSale } from "@/lib/actions";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/utils";
import { computeTvaBreakdown, TVA_RATE } from "@/lib/constants/sales";
import { cn } from "@/lib/utils";
import type { Product, CartItem, UserRole, PaymentMethod, Store } from "@/lib/types";
import type { ShopifyOrderPosContext } from "@/lib/orders";

type ManagerMode = "stock" | "sale";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "Carte", icon: CreditCard },
];

export function PosTerminal({
  products,
  role,
  cashierName,
  stores = [],
  defaultStoreId = "",
  storeName,
  initialCart,
  shopifyOrder,
  missingShopifyProducts = [],
}: {
  products: Product[];
  role: UserRole;
  cashierName: string;
  stores?: Store[];
  defaultStoreId?: string;
  storeName?: string;
  initialCart?: CartItem[];
  shopifyOrder?: ShopifyOrderPosContext;
  missingShopifyProducts?: string[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [managerMode, setManagerMode] = useState<ManagerMode>("sale");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const autoCheckoutRef = useRef(false);

  const isManagementUser = role === "manager" || role === "directeur";
  const isStockScan = isManagementUser && managerMode === "stock";
  const isOnlineShopifyOrder = shopifyOrder?.paymentType === "online";
  const isCodShopifyOrder = shopifyOrder?.paymentType === "cod";
  const autoPrepareShopifyOrder = isOnlineShopifyOrder || isCodShopifyOrder;

  useEffect(() => {
    if (shopifyOrder?.defaultPayment) {
      setPaymentMethod(shopifyOrder.defaultPayment);
    } else if (isCodShopifyOrder) {
      setPaymentMethod("cash");
    }
  }, [shopifyOrder, isCodShopifyOrder]);

  const handleScan = useCallback(
    (code: string) => {
      const product = products.find((p) => p.barcode === code.trim());
      if (!product) {
        setError(`Produit non trouvé : ${code}`);
        return;
      }
      setError("");
      setScannedProduct(product);
    },
    [products]
  );

  const { inputRef, handleKeyDown, handleChange } = useBarcodeScanner({
    onScan: handleScan,
    enabled: isStockScan && !receipt && !scannedProduct,
  });

  function addToCart(product: Product, qty: number) {
    if (product.stock <= 0) {
      setError(`${product.name} — rupture de stock`);
      return;
    }
    setError("");
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          setError(`Stock insuffisant pour ${product.name}`);
          return prev;
        }
        setLastAddedProduct(product);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      if (qty > product.stock) {
        setError(`Stock insuffisant pour ${product.name}`);
        return prev;
      }
      setLastAddedProduct(product);
      return [...prev, { product, quantity: qty }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.product.stock) {
            setError("Stock insuffisant");
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
    setError("");
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  async function handlePay(paymentMethod: PaymentMethod) {
    if (cart.length === 0) return;

    setLoading(true);
    setError("");

    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    const result = shopifyOrder
      ? await completeShopifyOrderSale(
          shopifyOrder.id,
          items,
          paymentMethod,
          isManagementUser ? defaultStoreId : undefined
        )
      : await completeSale(
          items,
          paymentMethod,
          isManagementUser ? defaultStoreId : undefined
        );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const total = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    setReceipt({
      saleId: result.saleId!,
      total,
      paymentMethod,
      paymentLabel:
        shopifyOrder?.paymentType === "cod"
          ? "COD — à la livraison"
          : shopifyOrder?.paymentType === "online"
            ? "E.L — payé en ligne"
            : undefined,
      cashierName,
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      createdAt: new Date().toISOString(),
      shopifyOrderNumber: shopifyOrder?.orderNumber,
      customerName: shopifyOrder?.customerName || undefined,
    });

    setCart([]);
    setShowPayment(false);
    setLoading(false);
    setLastAddedProduct(null);

    if (!shopifyOrder) {
      router.refresh();
    }

    setTimeout(() => printReceipt(), 300);
  }

  const checkout = useCallback(
    (paymentMethod: PaymentMethod) => {
      void handlePay(paymentMethod);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlePay stable enough for checkout trigger
    [cart, shopifyOrder, cashierName, defaultStoreId, isManagementUser]
  );

  useEffect(() => {
    if (
      autoCheckoutRef.current ||
      !autoPrepareShopifyOrder ||
      !shopifyOrder ||
      cart.length === 0 ||
      receipt ||
      loading
    ) {
      return;
    }
    autoCheckoutRef.current = true;
    checkout(
      shopifyOrder.defaultPayment ?? (isCodShopifyOrder ? "cash" : "card")
    );
  }, [
    autoPrepareShopifyOrder,
    isCodShopifyOrder,
    shopifyOrder,
    cart.length,
    receipt,
    loading,
    checkout,
  ]);

  function closeReceipt() {
    setReceipt(null);
    if (shopifyOrder) {
      router.replace("/cashier/orders");
    } else {
      inputRef.current?.focus();
    }
  }

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const { ht: totalHt, tva: totalTva, ttc: totalTtc } = computeTvaBreakdown(total);
  const tvaPercent = Math.round(TVA_RATE * 100);

  return (
    <>
      <div className="animate-fade-in relative flex h-full min-h-0 flex-col">
        {autoPrepareShopifyOrder && !receipt && loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Préparation du ticket...</p>
            {shopifyOrder && (
              <p className="text-sm text-muted">
                Commande {shopifyOrder.orderNumber}
                {shopifyOrder.customerName ? ` — ${shopifyOrder.customerName}` : ""}
                {isCodShopifyOrder ? " — COD" : " — E.L"}
              </p>
            )}
          </div>
        )}

        {isStockScan && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 px-4 pt-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary">Scan stock</h1>
                <p className="mt-1 text-muted">
                  Scannez un code-barres pour réapprovisionner
                  {storeName && (
                    <span className="ml-2 text-primary">· {storeName}</span>
                  )}
                </p>
              </div>

              {isManagementUser && (
                <div className="flex rounded-md border border-border bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setManagerMode("stock")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                      managerMode === "stock"
                        ? "bg-champagne text-black"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    <Warehouse className="h-4 w-4" />
                    Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagerMode("sale")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                      managerMode === "sale"
                        ? "bg-champagne text-black"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Vente
                  </button>
                </div>
              )}
            </div>

            <Card className="mx-4 mb-6">
              <div className="flex items-center gap-3">
                <ScanBarcode className="h-5 w-5 shrink-0 text-primary" />
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={handleKeyDown}
                  onChange={handleChange}
                  placeholder="Prêt au scan — passez le code-barres devant le lecteur..."
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                  autoComplete="off"
                />
                <Badge variant="accent">Scanner actif</Badge>
              </div>
            </Card>

            {error && (
              <p className="mx-4 mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}

        {!isStockScan && (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Colonne gauche 60% — scroll catalogue uniquement */}
            <div className="flex min-h-0 w-full flex-col lg:w-[60%]">
              <div className="shrink-0 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-primary">Caisse</h1>
                    {storeName && (
                      <p className="mt-0.5 text-sm text-muted">{storeName}</p>
                    )}
                  </div>
                  {isManagementUser && (
                    <div className="flex rounded-md border border-border bg-surface p-1">
                      <button
                        type="button"
                        onClick={() => setManagerMode("stock")}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                          managerMode === "stock"
                            ? "bg-champagne text-black"
                            : "text-muted hover:text-foreground"
                        )}
                      >
                        <Warehouse className="h-4 w-4" />
                        Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerMode("sale")}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                          managerMode === "sale"
                            ? "bg-champagne text-black"
                            : "text-muted hover:text-foreground"
                        )}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Vente
                      </button>
                    </div>
                  )}
                </div>

                {shopifyOrder && (
                  <Card className="mt-3 border-primary/40 bg-primary/10 !p-3">
                    <p className="text-sm font-semibold text-foreground">
                      Commande Shopify {shopifyOrder.orderNumber}
                    </p>
                    {shopifyOrder.customerName && (
                      <p className="text-xs text-muted">Client : {shopifyOrder.customerName}</p>
                    )}
                    {missingShopifyProducts.length > 0 && (
                      <p className="mt-1 text-xs text-danger">
                        Produits non chargés : {missingShopifyProducts.join(", ")}
                      </p>
                    )}
                  </Card>
                )}

                {error && (
                  <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-natus">
                <ProductCatalog
                  products={products}
                  onAddToCart={addToCart}
                  onBarcodeScan={handleScan}
                  lastAddedProduct={lastAddedProduct}
                  scannerEnabled={!receipt && !scannedProduct}
                  compact
                />
              </div>
            </div>

            {/* Colonne droite 40% — panier fixe pleine hauteur */}
            <div className="flex h-full min-h-0 w-full flex-col bg-page lg:w-[40%] lg:border-l lg:border-border">
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-4 py-4">
                  <h2 className="text-lg font-bold text-primary">Facture</h2>
                  <p className="text-xs text-muted">
                    {cart.length} article{cart.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-natus">
                  {cart.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted">Panier vide</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.product.id} className="relative pt-2.5 pr-2.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="avatar-round absolute right-0 top-0 z-10 flex h-9 w-9 rotate-12 items-center justify-center bg-danger text-white shadow-md ring-2 ring-surface transition-transform hover:scale-110 hover:rotate-0 cursor-pointer"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="relative flex min-h-[7.5rem] items-stretch overflow-hidden border border-border bg-surface">
                            <ProductImage product={item.product} strip />

                            <div className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-4 pr-4">
                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                              <p className="line-clamp-2 text-base font-bold leading-tight">
                                {item.product.name}
                              </p>

                              <p className="text-sm text-muted">
                                {item.quantity} x {formatCurrency(item.product.price)}
                              </p>

                              <div className="avatar-round mt-1 flex w-fit items-center gap-0.5 border border-border bg-page px-1 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product.id, -1)}
                                  className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 cursor-pointer"
                                  aria-label="Diminuer"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[1.5rem] text-center text-sm font-bold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product.id, 1)}
                                  className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 cursor-pointer"
                                  aria-label="Augmenter"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <p className="shrink-0 text-lg font-bold text-primary">
                              {formatCurrency(item.product.price * item.quantity)}
                            </p>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 bg-surface px-4 py-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted">
                      <span>Total HT</span>
                      <span>{formatCurrency(totalHt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span>TVA ({tvaPercent} %)</span>
                      <span>{formatCurrency(totalTva)}</span>
                    </div>
                    <div className="border-t border-dashed border-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">Total TTC</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totalTtc)}
                      </span>
                    </div>
                  </div>

                  {!autoPrepareShopifyOrder && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        Mode de paiement
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => {
                          const selected = paymentMethod === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setPaymentMethod(id)}
                              disabled={cart.length === 0}
                              className={cn(
                                "flex flex-col items-center gap-1.5 border bg-page px-3 py-3 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                                selected
                                  ? "border-primary bg-champagne/30"
                                  : "border-border hover:border-primary/60"
                              )}
                            >
                              <Icon className="h-5 w-5 text-primary" />
                              <span className="text-xs font-semibold">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {shopifyOrder?.paymentType === "cod" && (
                        <p className="mt-2 text-xs text-muted">
                          Commande COD — espèces recommandées
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={() =>
                      autoPrepareShopifyOrder
                        ? checkout(
                            shopifyOrder?.defaultPayment ??
                              (isCodShopifyOrder ? "cash" : "card")
                          )
                        : checkout(paymentMethod)
                    }
                    disabled={cart.length === 0 || loading}
                    loading={loading}
                  >
                    <Printer className="h-4 w-4" />
                    {autoPrepareShopifyOrder ? "Imprimer le ticket" : "Imprimer la facture"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isStockScan && (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Warehouse className="mb-4 h-12 w-12 text-primary" />
            <p className="text-lg font-medium">Mode réapprovisionnement</p>
            <p className="mt-2 max-w-sm text-muted">
              Scannez le code-barres d&apos;un produit pour ajouter des unités au stock
            </p>
          </Card>
        )}
      </div>

      {scannedProduct && isStockScan && (
        <ManagerScanPanel
          product={scannedProduct}
          stores={stores}
          defaultStoreId={defaultStoreId}
          onClose={() => {
            setScannedProduct(null);
            inputRef.current?.focus();
          }}
        />
      )}

      {scannedProduct && !isStockScan && (
        <CashierScanPanel
          product={scannedProduct}
          onAdd={addToCart}
          onClose={() => {
            setScannedProduct(null);
            inputRef.current?.focus();
          }}
        />
      )}

      {receipt && (
        <Modal onClose={closeReceipt} size="md" scrollable={false}>
          <Receipt data={receipt} />
          <div className="mt-4 flex justify-center gap-3 print:hidden">
            <Button onClick={() => printReceipt()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="secondary" onClick={closeReceipt}>
              {shopifyOrder ? "Retour aux commandes" : "Nouvelle vente"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
