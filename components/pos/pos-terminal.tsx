"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { ManagerScanPanel } from "@/components/pos/manager-scan-panel";
import { PosOrdersPanel } from "@/components/pos/pos-orders-panel";
import { Modal } from "@/components/ui/modal";
import { Receipt, printReceipt, type ReceiptData } from "@/components/pos/receipt";
import { ProductCatalog } from "@/components/pos/product-catalog";
import { PosCheckoutPanel } from "@/components/pos/pos-checkout-panel";
import { CashierNotificationBell } from "@/components/notifications/cashier-notification-bell";
import { CashierNotificationBar } from "@/components/notifications/cashier-notification-bar";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { completeSale, completeShopifyOrderSale, prepareShopifyOrderForPos, lookupLoyaltyCustomerByScan } from "@/lib/actions";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { mapShopifyLineItemsToCart } from "@/lib/shopify/order-cart";
import { shopifyOrderToPosContext } from "@/lib/shopify/order-pos";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import { formatCurrency } from "@/lib/utils";
import { computeTvaBreakdown, TVA_RATE } from "@/lib/constants/sales";
import { cn } from "@/lib/utils";
import type { Product, CartItem, UserRole, PaymentMethod, Store, ShopifyOrder, LoyaltyCustomer, LoyaltySettings } from "@/lib/types";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";
import { parseLoyaltyQrPayload } from "@/lib/loyalty/qr";
import {
  discountFromPoints,
  pointsEarnedForAmount,
} from "@/lib/loyalty/points";
import {
  checkoutTotal,
  promoDiscountAmount,
  type AppliedPosPromo,
} from "@/lib/marketing/pos-promo";
import type { ShopifyOrderPosContext } from "@/lib/orders";

type ManagerMode = "stock" | "sale";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "TPE", icon: CreditCard },
];

export function PosTerminal({
  products,
  role,
  cashierName,
  stores = [],
  defaultStoreId = "",
  storeName,
  initialCart,
  shopifyOrder: initialShopifyOrder,
  missingShopifyProducts: initialMissingProducts = [],
  shopifyOrders = [],
  loyaltySettings = DEFAULT_LOYALTY_SETTINGS,
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
  shopifyOrders?: ShopifyOrder[];
  loyaltySettings?: LoyaltySettings;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [activeShopifyOrder, setActiveShopifyOrder] = useState<ShopifyOrderPosContext | null>(
    initialShopifyOrder ?? null
  );
  const [missingShopifyProducts, setMissingShopifyProducts] = useState<string[]>(
    initialMissingProducts
  );
  const [validatedQty, setValidatedQty] = useState<Record<string, number>>({});
  const [showOrdersPanel, setShowOrdersPanel] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [managerMode, setManagerMode] = useState<ManagerMode>("sale");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPosPromo | null>(null);
  const [scanListening, setScanListening] = useState(true);
  const autoCheckoutRef = useRef(false);
  const scanBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderNotifications = useCashierNotifications();

  const isManagementUser =
    role === "manager" || role === "directeur" || role === "admin";
  const isStockScan = isManagementUser && managerMode === "stock";
  const isOrderMode = !!activeShopifyOrder && !isStockScan;
  const isShopifyOrderCheckout = !!activeShopifyOrder;
  const shopifyPaymentLabel =
    activeShopifyOrder?.paymentType === "cod"
      ? "COD — à la livraison"
      : activeShopifyOrder?.paymentType === "online"
        ? "E.L — payé en ligne"
        : null;

  useEffect(() => {
    if (!activeShopifyOrder) return;
    setPaymentMethod(activeShopifyOrder.defaultPayment);
  }, [activeShopifyOrder]);

  const addToCart = useCallback((product: Product, qty: number) => {
    if (activeShopifyOrder) return;
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
  }, [activeShopifyOrder]);

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const loyaltyPayload = parseLoyaltyQrPayload(trimmed);
      if (loyaltyPayload && !isStockScan && !activeShopifyOrder) {
        void lookupLoyaltyCustomerByScan(trimmed).then((result) => {
          if ("customer" in result) {
            setLoyaltyCustomer(result.customer);
            setPointsToRedeem(0);
            setError("");
          } else {
            setError(result.error);
          }
        });
        return;
      }

      const product = products.find((p) => p.barcode === trimmed);
      if (!product) {
        setError(`Produit non trouvé : ${trimmed}`);
        return;
      }
      if (isStockScan) {
        setError("");
        setScannedProduct(product);
        return;
      }
      if (activeShopifyOrder) {
        const cartItem = cart.find((item) => item.product.id === product.id);
        if (!cartItem) {
          setError(`${product.name} — absent de la commande`);
          return;
        }
        const validated = validatedQty[product.id] ?? 0;
        if (validated >= cartItem.quantity) {
          setError(`${product.name} — quantité déjà validée (${cartItem.quantity})`);
          return;
        }
        setValidatedQty((prev) => ({ ...prev, [product.id]: validated + 1 }));
        setLastAddedProduct(product);
        setError("");
        return;
      }
      setError("");
      addToCart(product, 1);
    },
    [products, isStockScan, addToCart, activeShopifyOrder, cart, validatedQty]
  );

  async function loadShopifyOrder(order: ShopifyOrder) {
    const { cart: orderCart, missing } = mapShopifyLineItemsToCart(order.line_items, products);
    if (orderCart.length === 0) {
      setError(
        missing.length > 0
          ? `Produits non trouvés : ${missing.join(", ")}`
          : "Aucun produit dans la commande"
      );
      return;
    }
    const context = {
      ...shopifyOrderToPosContext(order),
      workflowStatus: "preparing" as const,
    };
    setCart(orderCart);
    setActiveShopifyOrder(context);
    setMissingShopifyProducts(missing);
    setValidatedQty({});
    setError("");
    setLastAddedProduct(null);
    setShowOrdersPanel(false);
    autoCheckoutRef.current = false;
    setPaymentMethod(context.defaultPayment);

    const result = await prepareShopifyOrderForPos(order.id);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setActiveShopifyOrder((prev) =>
      prev ? { ...prev, workflowStatus: result.status } : null
    );
  }

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: isStockScan && !receipt && !scannedProduct,
  });

  const stockScannerActive =
    isStockScan && !receipt && !scannedProduct && scanListening;

  function armStockScanner() {
    if (scanBlurTimerRef.current) {
      clearTimeout(scanBlurTimerRef.current);
      scanBlurTimerRef.current = null;
    }
    setScanListening(true);
    focusInput();
  }

  function disarmStockScanner() {
    scanBlurTimerRef.current = setTimeout(() => {
      setScanListening(false);
      scanBlurTimerRef.current = null;
    }, 200);
  }

  useEffect(() => {
    if (isStockScan && !receipt && !scannedProduct) {
      setScanListening(true);
      focusInput();
    } else {
      setScanListening(false);
    }
  }, [isStockScan, receipt, scannedProduct, focusInput]);

  useEffect(
    () => () => {
      if (scanBlurTimerRef.current) clearTimeout(scanBlurTimerRef.current);
    },
    []
  );

  function updateQuantity(productId: string, delta: number) {
    if (isOrderMode) return;
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
    if (isOrderMode) return;
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    if (cart.length === 0 && !activeShopifyOrder) return;
    setCart([]);
    setActiveShopifyOrder(null);
    setMissingShopifyProducts([]);
    setValidatedQty({});
    setLoyaltyCustomer(null);
    setPointsToRedeem(0);
    setError("");
    setLastAddedProduct(null);
  }

  const orderFullyValidated = useMemo(() => {
    if (!activeShopifyOrder) return true;
    return cart.every(
      (item) => (validatedQty[item.product.id] ?? 0) >= item.quantity
    );
  }, [activeShopifyOrder, cart, validatedQty]);

  const orderValidationTotal = useMemo(() => {
    if (!activeShopifyOrder) return 0;
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [activeShopifyOrder, cart]);

  const orderValidationDone = useMemo(
    () => Object.values(validatedQty).reduce((sum, n) => sum + n, 0),
    [validatedQty]
  );

  async function handlePay(paymentMethod: PaymentMethod) {
    if (cart.length === 0) return;
    if (activeShopifyOrder) {
      const fullyValidated = cart.every(
        (item) => (validatedQty[item.product.id] ?? 0) >= item.quantity
      );
      if (!fullyValidated) {
        setError("Scannez tous les produits de la commande avant de valider");
        return;
      }
    }

    setLoading(true);
    setError("");

    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    const effectivePaymentMethod = activeShopifyOrder
      ? activeShopifyOrder.defaultPayment
      : paymentMethod;

    const result = activeShopifyOrder
      ? await completeShopifyOrderSale(
          activeShopifyOrder.id,
          items,
          effectivePaymentMethod,
          isManagementUser ? defaultStoreId : undefined
        )
      : await completeSale(
          items,
          effectivePaymentMethod,
          isManagementUser ? defaultStoreId : undefined,
          loyaltyCustomer
            ? { customerId: loyaltyCustomer.id, pointsToRedeem }
            : undefined,
          appliedPromo?.code
        );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const loyaltyDiscount = discountFromPoints(pointsToRedeem, loyaltySettings);
    const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
    const promoDiscount = appliedPromo
      ? promoDiscountAmount(afterLoyalty, appliedPromo.discountPercent)
      : 0;
    const total = checkoutTotal(subtotal, loyaltyDiscount, appliedPromo);
    const pointsEarned = loyaltyCustomer ? pointsEarnedForAmount(total, loyaltySettings) : 0;

    setReceipt({
      saleId: result.saleId ?? activeShopifyOrder?.id ?? "web",
      total,
      subtotal,
      loyaltyDiscount,
      promoCode: appliedPromo?.code,
      promoDiscount,
      pointsEarned,
      pointsRedeemed: pointsToRedeem,
      paymentMethod: effectivePaymentMethod,
      paymentLabel: shopifyPaymentLabel ?? undefined,
      cashierName,
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      createdAt: new Date().toISOString(),
      shopifyOrderNumber: activeShopifyOrder?.orderNumber,
      customerName: loyaltyCustomer?.full_name || activeShopifyOrder?.customerName || undefined,
      loyaltyCardNumber: loyaltyCustomer?.card_number,
    });

    setCart([]);
    const wasShopifyOrder = !!activeShopifyOrder;
    setActiveShopifyOrder(null);
    setLoyaltyCustomer(null);
    setPointsToRedeem(0);
    setAppliedPromo(null);
    setValidatedQty({});
    setMissingShopifyProducts([]);
    setLoading(false);
    setLastAddedProduct(null);

    if (!wasShopifyOrder) {
      router.refresh();
    }

    setTimeout(() => printReceipt(), 300);
  }

  function closeReceipt() {
    setReceipt(null);
    if (initialShopifyOrder || shopifyOrders.length > 0) {
      router.replace("/cashier/orders");
    } else {
      inputRef.current?.focus();
    }
  }

  const cartQuantities = useMemo(
    () => Object.fromEntries(cart.map((item) => [item.product.id, item.quantity])),
    [cart]
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const loyaltyDiscount = discountFromPoints(pointsToRedeem, loyaltySettings);
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const promoDiscount = appliedPromo
    ? promoDiscountAmount(afterLoyalty, appliedPromo.discountPercent)
    : 0;
  const total = checkoutTotal(subtotal, loyaltyDiscount, appliedPromo);
  const { ht: totalHt, tva: totalTva, ttc: totalTtc } = computeTvaBreakdown(total);
  const tvaPercent = Math.round(TVA_RATE * 100);

  return (
    <>
      <div className="animate-fade-in relative flex h-full min-h-0 flex-col">
        {loading && !receipt && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Traitement en cours...</p>
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
                      (managerMode as ManagerMode) === "sale"
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
              <div
                role="button"
                tabIndex={-1}
                onClick={armStockScanner}
                className={cn(
                  "flex cursor-text items-center gap-3 rounded-full border bg-page px-4 py-2",
                  stockScannerActive ? "border-primary" : "border-border"
                )}
              >
                <ScanBarcode
                  className={cn(
                    "h-5 w-5 shrink-0",
                    stockScannerActive ? "text-primary" : "text-muted"
                  )}
                />
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={handleKeyDown}
                  onChange={handleChange}
                  onFocus={armStockScanner}
                  onBlur={disarmStockScanner}
                  placeholder={
                    stockScannerActive
                      ? "Passez le code-barres devant le lecteur…"
                      : "Cliquez pour activer le scanner…"
                  }
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                  autoComplete="off"
                />
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
              {orderNotifications && <CashierNotificationBar />}
              <div className="shrink-0 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-primary">Caisse</h1>
                    {storeName && (
                      <p className="mt-0.5 truncate text-sm text-muted">{storeName}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(shopifyOrders.length > 0 || orderNotifications) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowOrdersPanel(true)}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Commandes
                      </Button>
                    )}
                    {orderNotifications && (
                      <CashierNotificationBell
                        onSelect={() => setShowOrdersPanel(true)}
                      />
                    )}
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
                            (managerMode as ManagerMode) === "sale"
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
                </div>

                {activeShopifyOrder && (
                  <Card className="mt-3 border-primary/40 bg-primary/10 !p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            Commande Shopify {activeShopifyOrder.orderNumber}
                          </p>
                          <Badge variant="warning">
                            {workflowStatusLabel(activeShopifyOrder.workflowStatus)}
                          </Badge>
                        </div>
                        {activeShopifyOrder.customerName && (
                          <p className="mt-1 text-xs text-muted">
                            Client : {activeShopifyOrder.customerName}
                          </p>
                        )}
                        {missingShopifyProducts.length > 0 && (
                          <p className="mt-1 text-xs text-danger">
                            Produits non chargés : {missingShopifyProducts.join(", ")}
                          </p>
                        )}
                      </div>
                      <Badge variant={orderFullyValidated ? "success" : "warning"}>
                        {orderValidationDone}/{orderValidationTotal} scannés
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Scannez chaque produit pour valider les quantités avant d&apos;imprimer
                    </p>
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
                  onUpdateQuantity={updateQuantity}
                  cartQuantities={cartQuantities}
                  onBarcodeScan={handleScan}
                  lastAddedProduct={lastAddedProduct}
                  scannerEnabled={!receipt && (!isStockScan || !scannedProduct)}
                  orderMode={isOrderMode}
                  compact
                />
              </div>
            </div>

            {/* Colonne droite 40% — panier fixe pleine hauteur */}
            <div className="flex h-full min-h-0 w-full flex-col bg-page lg:w-[40%] lg:border-l lg:border-border">
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-primary">Facture</h2>
                      <p className="text-xs text-muted">
                        {cart.length} article{cart.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={clearCart}
                        disabled={cart.length === 0 || !!receipt}
                      >
                        <Trash2 className="h-4 w-4" />
                        Vider le panier
                      </Button>
                    </div>
                  </div>

                  {!isShopifyOrderCheckout && !isStockScan && (
                    <div className="mt-4">
                      <PosCheckoutPanel
                        subtotal={subtotal}
                        storeId={defaultStoreId || undefined}
                        customer={loyaltyCustomer}
                        pointsToRedeem={pointsToRedeem}
                        promo={appliedPromo}
                        onCustomerChange={setLoyaltyCustomer}
                        onPointsToRedeemChange={setPointsToRedeem}
                        onPromoChange={setAppliedPromo}
                        loyaltySettings={loyaltySettings}
                      />
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-natus">
                  {cart.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted">Panier vide</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => {
                        const validated = validatedQty[item.product.id] ?? 0;
                        const isItemValidated = validated >= item.quantity;

                        return (
                        <div key={item.product.id} className="relative pt-2.5 pr-2.5">
                          {!isOrderMode && (
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="avatar-round absolute right-0 top-0 z-10 flex h-9 w-9 rotate-12 items-center justify-center bg-danger text-white shadow-md ring-2 ring-surface transition-transform hover:scale-110 hover:rotate-0 cursor-pointer"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          <div
                            className={cn(
                              "relative flex min-h-[7.5rem] items-stretch overflow-hidden border bg-surface",
                              isOrderMode && isItemValidated
                                ? "border-success/50 ring-1 ring-success/30"
                                : "border-border"
                            )}
                          >
                            <ProductImage product={item.product} strip />

                            <div className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-4 pr-4">
                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                              <p className="line-clamp-2 text-base font-bold leading-tight">
                                {item.product.name}
                              </p>

                              <p className="text-sm text-muted">
                                {item.quantity} x {formatCurrency(item.product.price)}
                              </p>

                              {isOrderMode ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant={isItemValidated ? "success" : "warning"}>
                                    {isItemValidated ? (
                                      <span className="inline-flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Validé {validated}/{item.quantity}
                                      </span>
                                    ) : (
                                      `${validated}/${item.quantity} scanné${validated !== 1 ? "s" : ""}`
                                    )}
                                  </Badge>
                                </div>
                              ) : (
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
                              )}
                            </div>

                            <p className="shrink-0 text-lg font-bold text-primary">
                              {formatCurrency(item.product.price * item.quantity)}
                            </p>
                          </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shrink-0 bg-surface px-4 py-4">
                  <div className="space-y-2 text-sm">
                    {(loyaltyDiscount > 0 || promoDiscount > 0) && (
                      <>
                        <div className="flex items-center justify-between text-muted">
                          <span>Sous-total</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {loyaltyDiscount > 0 && (
                          <div className="flex items-center justify-between text-success">
                            <span>Points fidélité</span>
                            <span>-{formatCurrency(loyaltyDiscount)}</span>
                          </div>
                        )}
                        {promoDiscount > 0 && appliedPromo && (
                          <div className="flex items-center justify-between text-success">
                            <span>Code {appliedPromo.code}</span>
                            <span>-{formatCurrency(promoDiscount)}</span>
                          </div>
                        )}
                      </>
                    )}
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

                  <div className="mt-4">
                    {isShopifyOrderCheckout ? (
                      <div className="rounded-lg border border-primary/30 bg-champagne/20 px-3 py-3">
                        <p className="text-xs font-medium text-muted">Paiement commande web</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {shopifyPaymentLabel}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Le ticket s&apos;imprime directement — pas de choix espèces/carte
                        </p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                    {isOrderMode && !orderFullyValidated && (
                      <p className="mt-2 text-xs text-warning">
                        Scannez tous les produits ({orderValidationDone}/{orderValidationTotal}) pour valider
                      </p>
                    )}
                  </div>

                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={() =>
                      void handlePay(
                        isShopifyOrderCheckout
                          ? activeShopifyOrder!.defaultPayment
                          : paymentMethod
                      )
                    }
                    disabled={
                      cart.length === 0 ||
                      loading ||
                      (isOrderMode && !orderFullyValidated)
                    }
                    loading={loading}
                  >
                    <Printer className="h-4 w-4" />
                    {isShopifyOrderCheckout ? "Imprimer le ticket" : "Imprimer la facture"}
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

      {receipt && (
        <Modal onClose={closeReceipt} size="md" scrollable={false}>
          <Receipt data={receipt} />
          <div className="mt-4 flex justify-center gap-3 print:hidden">
            <Button onClick={() => printReceipt()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="secondary" onClick={closeReceipt}>
              {initialShopifyOrder || shopifyOrders.length > 0
                ? "Retour aux commandes"
                : "Nouvelle vente"}
            </Button>
          </div>
        </Modal>
      )}

      <PosOrdersPanel
        orders={shopifyOrders}
        open={showOrdersPanel}
        onClose={() => setShowOrdersPanel(false)}
        onSelectOrder={loadShopifyOrder}
      />
    </>
  );
}
