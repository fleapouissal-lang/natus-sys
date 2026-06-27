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
  ChevronLeft,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { ManagerScanPanel } from "@/components/pos/manager-scan-panel";
import { PosOrdersPanel } from "@/components/pos/pos-orders-panel";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { SaleDocumentsModal } from "@/components/pos/sale-documents-modal";
import { printSaleDocument } from "@/components/pos/print-sale-document";
import { ProductCatalog } from "@/components/pos/product-catalog";
import { PosCheckoutPanel } from "@/components/pos/pos-checkout-panel";
import {
  PosScanAlertToast,
  createLoyaltyScanAlertFromLookup,
  type PosScanAlert,
} from "@/components/pos/pos-scan-alert-modal";
import {
  CashChangeCalculator,
  parseCashReceived,
} from "@/components/pos/cash-change-calculator";
import {
  PosPaymentModeSelector,
  type PosPaymentOption,
} from "@/components/pos/pos-payment-mode-selector";
import { CashierNotificationBell } from "@/components/notifications/cashier-notification-bell";
import { CashierNotificationBar } from "@/components/notifications/cashier-notification-bar";
import { ProClientQrButton } from "@/components/pro-client/pro-client-qr-modal";
import {
  PosDayClosureButton,
  PosDayClosureModal,
} from "@/components/pos/pos-day-closure-modal";
import { QuantityHoldButton } from "@/components/pos/quantity-hold-button";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { notificationHref } from "@/lib/notifications/display";
import { CountBadge } from "@/components/ui/count-badge";
import { completeSale, completeShopifyOrderSale, prepareShopifyOrderForPos, lookupLoyaltyCustomerByScan } from "@/lib/actions";
import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { mapShopifyLineItemsToCart } from "@/lib/shopify/order-cart";
import { canPrepareOrderForPos, shopifyOrderToPosContext } from "@/lib/shopify/order-pos";
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
import { type AppliedPosPromo } from "@/lib/marketing/pos-promo";
import { computePosCheckoutDiscounts, isActiveProClient } from "@/lib/pro-client/discount";
import { PosLuxuryCartFab } from "@/components/pos/pos-luxury-cart-fab";
import {
  PosMobileCartStepBar,
  resolveMobileCartSteps,
  type PosMobileCartStep,
} from "@/components/pos/pos-mobile-cart-step-bar";
import type { ShopifyOrderPosContext } from "@/lib/orders";
import type { ProductSalesQtyMap } from "@/lib/pos/product-sales-rank";

type ManagerMode = "stock" | "sale";

const PAYMENT_OPTIONS: PosPaymentOption[] = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "TPE", icon: CreditCard },
  { id: "cheque", label: "Chèque", icon: ScrollText },
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
  isStorePos = false,
  cashierUserId,
  productSalesQty = {},
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
  isStorePos?: boolean;
  cashierUserId?: string;
  productSalesQty?: ProductSalesQtyMap;
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
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [receipt, setReceipt] = useState<SaleDocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPosPromo | null>(null);
  const [scanAlert, setScanAlert] = useState<PosScanAlert | null>(null);
  const [scanListening, setScanListening] = useState(true);
  const [mobilePosView, setMobilePosView] = useState<"catalog" | "cart">("catalog");
  const [checkoutStep, setCheckoutStep] = useState<PosMobileCartStep>("loyalty");
  const [showDayClosure, setShowDayClosure] = useState(false);
  const autoCheckoutRef = useRef(false);
  const scanBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cashCalculatorRef = useRef<HTMLDivElement>(null);
  const orderNotifications = useCashierNotifications();
  const preparableOrderCount = useMemo(
    () => shopifyOrders.filter(canPrepareOrderForPos).length,
    [shopifyOrders]
  );

  const isManagementUser =
    role === "manager" || role === "directeur" || role === "admin";
  const canDayClosure = role === "cashier";
  const isStockScan = isManagementUser && managerMode === "stock";
  const isOrderMode = !!activeShopifyOrder && !isStockScan;
  const isShopifyOrderCheckout = !!activeShopifyOrder;
  const checkoutSteps = useMemo(
    () => resolveMobileCartSteps(isShopifyOrderCheckout || isStockScan),
    [isShopifyOrderCheckout, isStockScan]
  );

  function openMobileCart(step: PosMobileCartStep = checkoutSteps[0]) {
    setCheckoutStep(step);
    setMobilePosView("cart");
  }

  function goToNextCartStep() {
    const index = checkoutSteps.indexOf(checkoutStep);
    if (index >= 0 && index < checkoutSteps.length - 1) {
      setCheckoutStep(checkoutSteps[index + 1]);
    }
  }

  function goToPrevCartStep() {
    const index = checkoutSteps.indexOf(checkoutStep);
    if (index > 0) {
      setCheckoutStep(checkoutSteps[index - 1]);
    }
  }

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

  useEffect(() => {
    if (!orderNotifications) return;
    orderNotifications.setNotificationOpenHandler((notification) => {
      if (notification.kind === "hub_transfer") {
        router.push(notificationHref(notification.kind, notification.audience));
        return;
      }
      if (
        notification.kind === "stock_low" ||
        notification.kind === "stock_out"
      ) {
        return;
      }
      setShowOrdersPanel(true);
    });
    return () => orderNotifications.setNotificationOpenHandler(null);
  }, [orderNotifications, router]);

  const addToCart = useCallback((product: Product, qty: number) => {
    if (activeShopifyOrder) return;
    if (product.stock <= 0) {
      setScanAlert({ kind: "out_of_stock", product });
      return;
    }
    setError("");
    let added = false;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          setScanAlert({
            kind: "insufficient_stock",
            product,
            available: product.stock,
          });
          return prev;
        }
        added = true;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      if (qty > product.stock) {
        setScanAlert({
          kind: "insufficient_stock",
          product,
          available: product.stock,
        });
        return prev;
      }
      added = true;
      return [...prev, { product, quantity: qty }];
    });
    if (added) {
      setLastAddedProduct(product);
      openMobileCart();
    }
  }, [activeShopifyOrder]);

  const adjustOrderValidation = useCallback(
    (productId: string, delta: number) => {
      if (!activeShopifyOrder || delta === 0) return;

      const cartItem = cart.find((item) => item.product.id === productId);
      if (!cartItem) {
        const product = products.find((p) => p.id === productId);
        setError(
          product
            ? `${product.name} — absent de la commande`
            : "Produit absent de la commande"
        );
        return;
      }

      const validated = validatedQty[productId] ?? 0;
      const next = Math.max(0, Math.min(cartItem.quantity, validated + delta));

      if (next === validated) return;

      setValidatedQty((prev) => {
        if (next === 0) {
          const { [productId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [productId]: next };
      });

      if (delta > 0) {
        setLastAddedProduct(cartItem.product);
      }
      setError("");
    },
    [activeShopifyOrder, cart, products, validatedQty]
  );

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      const loyaltyPayload = parseLoyaltyQrPayload(trimmed);
      if (loyaltyPayload && !isStockScan && !activeShopifyOrder) {
        void lookupLoyaltyCustomerByScan(trimmed).then((result) => {
          if ("error" in result) {
            setScanAlert(createLoyaltyScanAlertFromLookup(trimmed, result));
            return;
          }
          if ("blocked" in result && result.blocked) {
            setScanAlert(createLoyaltyScanAlertFromLookup(trimmed, result));
            return;
          }
          setLoyaltyCustomer(result.customer);
          setPointsToRedeem(0);
          setError("");
          setScanAlert(createLoyaltyScanAlertFromLookup(trimmed, result));
        });
        return;
      }

      const product = products.find((p) => p.barcode === trimmed);
      if (!product) {
        setScanAlert({ kind: "not_found", barcode: trimmed });
        return;
      }
      if (isStockScan) {
        setError("");
        setScannedProduct(product);
        return;
      }
      if (activeShopifyOrder) {
        adjustOrderValidation(product.id, 1);
        return;
      }
      setError("");
      addToCart(product, 1);
    },
    [products, isStockScan, addToCart, activeShopifyOrder, adjustOrderValidation]
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
            setScanAlert({
              kind: "insufficient_stock",
              product: item.product,
              available: item.product.stock,
            });
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
    if (
      !activeShopifyOrder &&
      paymentMethod === "cash" &&
      parseCashReceived(cashReceivedInput) < totalTtc
    ) {
      setError("Montant remis insuffisant");
      return;
    }
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

    const wasShopifyOrder = !!activeShopifyOrder;
    const wasCodShopifyOrder = activeShopifyOrder?.paymentType === "cod";

    if (wasCodShopifyOrder) {
      setCart([]);
      setActiveShopifyOrder(null);
      setLoyaltyCustomer(null);
      setPointsToRedeem(0);
      setAppliedPromo(null);
      setValidatedQty({});
      setMissingShopifyProducts([]);
      setLoading(false);
      setLastAddedProduct(null);
      router.replace("/cashier/orders");
      router.refresh();
      return;
    }

    if (orderNotifications?.reportStockChanges && defaultStoreId) {
      const soldByProduct = new Map<
        string,
        { product: Product; quantity: number }
      >();
      for (const item of cart) {
        const existing = soldByProduct.get(item.product.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          soldByProduct.set(item.product.id, {
            product: item.product,
            quantity: item.quantity,
          });
        }
      }

      orderNotifications.reportStockChanges(
        [...soldByProduct.values()].map(({ product, quantity }) => ({
          storeId: defaultStoreId,
          productId: product.id,
          productName: product.name,
          previousStock: product.stock,
          nextStock: Math.max(0, product.stock - quantity),
        }))
      );
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const loyaltyDiscount = discountFromPoints(pointsToRedeem, loyaltySettings);
    const { total, proClientDiscount, promoDiscount } = computePosCheckoutDiscounts(
      subtotal,
      loyaltyDiscount,
      appliedPromo,
      loyaltyCustomer
    );
    const pointsEarned =
      loyaltyCustomer && !isActiveProClient(loyaltyCustomer)
        ? pointsEarnedForAmount(total, loyaltySettings)
        : 0;

    setReceipt({
      saleId: result.saleId ?? activeShopifyOrder?.id ?? "web",
      total,
      subtotal,
      loyaltyDiscount,
      proClientDiscount: proClientDiscount || undefined,
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
      customerName:
        loyaltyCustomer?.full_name ||
        activeShopifyOrder?.customerName ||
        INVOICE_CLIENT_DIVERS,
      customerPhone:
        loyaltyCustomer?.phone || activeShopifyOrder?.customerPhone || undefined,
      loyaltyCardNumber: loyaltyCustomer?.card_number,
      storeName,
    });

    setCart([]);
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

    setTimeout(() => printSaleDocument("ticket"), 300);
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
  const { total, proClientDiscount, promoDiscount } = computePosCheckoutDiscounts(
    subtotal,
    loyaltyDiscount,
    appliedPromo,
    loyaltyCustomer
  );
  const { ht: totalHt, tva: totalTva, ttc: totalTtc } = computeTvaBreakdown(total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const cashReceived = parseCashReceived(cashReceivedInput);
  const showCashCalculator =
    !isShopifyOrderCheckout && paymentMethod === "cash" && cart.length > 0;
  const cashPaymentReady = cashReceived >= totalTtc;

  useEffect(() => {
    if (!checkoutSteps.includes(checkoutStep)) {
      setCheckoutStep(checkoutSteps[0]);
    }
  }, [checkoutSteps, checkoutStep]);

  useEffect(() => {
    setCashReceivedInput("");
  }, [totalTtc]);

  useEffect(() => {
    if (paymentMethod !== "cash") {
      setCashReceivedInput("");
      return;
    }
    if (cart.length === 0) return;

    const timer = window.setTimeout(() => {
      cashCalculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [paymentMethod, cart.length]);

  function renderCartItems() {
    if (cart.length === 0) {
      return <p className="py-12 text-center text-sm text-muted">Panier vide</p>;
    }

    return (
      <div className="space-y-4 pb-2">
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
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={isItemValidated ? "success" : "warning"}>
                          {isItemValidated ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Validé {validated}/{item.quantity}
                            </span>
                          ) : (
                            `${validated}/${item.quantity} validé${validated !== 1 ? "s" : ""}`
                          )}
                        </Badge>
                        <div className="avatar-round flex items-center gap-0.5 border border-border bg-page px-1 py-0.5">
                          <QuantityHoldButton
                            direction="down"
                            disabled={validated <= 0}
                            onStep={(delta) => adjustOrderValidation(item.product.id, delta)}
                            ariaLabel="Retirer une validation"
                            className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="h-4 w-4" />
                          </QuantityHoldButton>
                          <span className="min-w-[1.5rem] text-center text-sm font-bold">
                            {validated}
                          </span>
                          <QuantityHoldButton
                            direction="up"
                            disabled={validated >= item.quantity}
                            onStep={(delta) => adjustOrderValidation(item.product.id, delta)}
                            ariaLabel="Valider une unité"
                            className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                          </QuantityHoldButton>
                        </div>
                      </div>
                    ) : (
                      <div className="avatar-round mt-1 flex w-fit items-center gap-0.5 border border-border bg-page px-1 py-0.5">
                        <QuantityHoldButton
                          direction="down"
                          onStep={(delta) => updateQuantity(item.product.id, delta)}
                          ariaLabel="Diminuer"
                          className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </QuantityHoldButton>
                        <span className="min-w-[1.5rem] text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <QuantityHoldButton
                          direction="up"
                          onStep={(delta) => updateQuantity(item.product.id, delta)}
                          ariaLabel="Augmenter"
                          className="avatar-round flex h-8 w-8 items-center justify-center transition-colors hover:bg-champagne/50 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </QuantityHoldButton>
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
    );
  }

  function renderCartTotals(variant: "full" | "dock" = "full") {
    const isDock = variant === "dock";

    return (
      <div className={cn("space-y-2", isDock ? "text-xs" : "text-sm")}>
        {(loyaltyDiscount > 0 || proClientDiscount > 0 || promoDiscount > 0) && (
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
            {proClientDiscount > 0 && (
              <div className="flex items-center justify-between text-success">
                <span>Client Pro (-34%)</span>
                <span>-{formatCurrency(proClientDiscount)}</span>
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
          <span className="font-medium text-foreground">{formatCurrency(totalHt)}</span>
        </div>

        <div className="border-t border-dashed border-border" />

        <div className="flex items-center justify-between">
          <span className={cn("font-semibold", isDock ? "text-sm" : "text-base")}>
            Total TTC
          </span>
          <span
            className={cn(
              "font-bold text-primary",
              isDock ? "text-xl" : "text-2xl"
            )}
          >
            {formatCurrency(totalTtc)}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-muted">
          <span>TVA ({tvaPercent} %)</span>
          <span>{formatCurrency(totalTva)}</span>
        </div>
      </div>
    );
  }

  function renderPaymentModeSelector(compact = false) {
    if (isShopifyOrderCheckout) {
      return (
        <div className="rounded-xl border border-primary/30 bg-champagne/20 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Paiement commande web
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{shopifyPaymentLabel}</p>
        </div>
      );
    }

    return (
      <PosPaymentModeSelector
        value={paymentMethod}
        options={PAYMENT_OPTIONS}
        onChange={setPaymentMethod}
        disabled={cart.length === 0}
        compact={compact}
      />
    );
  }

  function renderCartFixedTotal() {
    return (
      <div className="natus-pos-cart-total-bar">
        {(loyaltyDiscount > 0 || proClientDiscount > 0 || promoDiscount > 0) && (
          <div className="natus-pos-cart-total-discounts">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {loyaltyDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-success">
                <span>Fidélité</span>
                <span>-{formatCurrency(loyaltyDiscount)}</span>
              </div>
            )}
            {proClientDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-success">
                <span>Client Pro (-34%)</span>
                <span>-{formatCurrency(proClientDiscount)}</span>
              </div>
            )}
            {promoDiscount > 0 && appliedPromo && (
              <div className="flex items-center justify-between text-xs text-success">
                <span>{appliedPromo.code}</span>
                <span>-{formatCurrency(promoDiscount)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted">
          <span>Total HT</span>
          <span className="font-semibold text-foreground">{formatCurrency(totalHt)}</span>
        </div>

        <div className="natus-pos-cart-total-tva">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>TVA ({tvaPercent} %)</span>
            <span>{formatCurrency(totalTva)}</span>
          </div>
        </div>

        <div className="natus-pos-cart-total-divider" aria-hidden />

        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-foreground">Total TTC</span>
          <span className="natus-pos-cart-total-ttc">{formatCurrency(totalTtc)}</span>
        </div>
      </div>
    );
  }

  function renderPaymentStepContent() {
    return (
      <div className="space-y-3">
        {renderPaymentModeSelector(true)}
        {isOrderMode && !orderFullyValidated && (
          <p className="text-xs text-warning">
            Validez tous les produits ({orderValidationDone}/{orderValidationTotal}) — scan ou +
          </p>
        )}
      </div>
    );
  }

  function renderCartCheckoutBody() {
    const showLoyalty = checkoutStep === "loyalty" && !isShopifyOrderCheckout && !isStockScan;
    const skipLoyalty = isShopifyOrderCheckout || isStockScan;

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-natus">
          {showLoyalty ? (
            <>
              <div className="shrink-0 border-b border-primary/10 px-4 py-3">
                {renderLoyaltyStep()}
              </div>
              <div className="px-4 py-3">{renderCartItems()}</div>
            </>
          ) : checkoutStep === "payment" ? (
            <>
              {skipLoyalty && (
                <div className="border-b border-primary/10 px-4 py-3">{renderCartItems()}</div>
              )}
              <div className="px-4 py-3">{renderPaymentStepContent()}</div>
            </>
          ) : (
            <div className="px-4 py-3">{renderCartItems()}</div>
          )}
        </div>

        <div className="natus-pos-cart-checkout-footer shrink-0">
          {checkoutStep === "payment" && showCashCalculator && (
            <div className="natus-pos-cart-calc-dock border-b border-primary/10 px-4 py-2">
              {renderCashCalculatorPanel({ checkout: true })}
            </div>
          )}
          {renderCartFixedTotal()}
          <div className="px-4 pb-3 pt-2">{renderCheckoutNavButtons()}</div>
        </div>
      </div>
    );
  }

  function renderCashCalculatorPanel(options?: {
    compact?: boolean;
    dense?: boolean;
    checkout?: boolean;
  }) {
    if (!showCashCalculator) return null;

    return (
      <div ref={cashCalculatorRef} className="natus-pos-cash-calculator-panel">
        <CashChangeCalculator
          total={totalTtc}
          value={cashReceivedInput}
          onChange={setCashReceivedInput}
          compact={options?.compact}
          dense={options?.dense}
          checkout={options?.checkout}
          className={
            options?.compact || options?.dense || options?.checkout ? "mt-0" : undefined
          }
        />
      </div>
    );
  }

  function renderPaymentDetails(options?: {
    includePaymentMode?: boolean;
    includeCalculator?: boolean;
    compactCalculator?: boolean;
    denseCalculator?: boolean;
    checkoutCalculator?: boolean;
  }) {
    const includePaymentMode = options?.includePaymentMode ?? true;
    const includeCalculator = options?.includeCalculator ?? true;

    return (
      <>
        {includePaymentMode && <div className="mb-4">{renderPaymentModeSelector()}</div>}

        {renderCartTotals()}

        {(includeCalculator || isOrderMode) && (
          <div className="mt-4">
            {includeCalculator &&
              renderCashCalculatorPanel({
                compact: options?.compactCalculator,
                dense: options?.denseCalculator,
                checkout: options?.checkoutCalculator,
              })}
            {isOrderMode && !orderFullyValidated && (
              <p className="mt-2 text-xs text-warning">
                Validez tous les produits ({orderValidationDone}/{orderValidationTotal}) — scan ou +
              </p>
            )}
          </div>
        )}
      </>
    );
  }

  function renderCheckoutStepBar() {
    if (checkoutSteps.length <= 1) return null;
    return (
      <PosMobileCartStepBar
        step={checkoutStep}
        steps={checkoutSteps}
        onStepChange={setCheckoutStep}
      />
    );
  }

  function renderLoyaltyStep() {
    if (isShopifyOrderCheckout || isStockScan) return null;
    return (
      <PosCheckoutPanel
        subtotal={subtotal}
        storeId={defaultStoreId || undefined}
        customer={loyaltyCustomer}
        pointsToRedeem={pointsToRedeem}
        promo={appliedPromo}
        onCustomerChange={setLoyaltyCustomer}
        onPointsToRedeemChange={setPointsToRedeem}
        onPromoChange={setAppliedPromo}
        onLoyaltyLookupError={(code, result) => {
          setScanAlert(createLoyaltyScanAlertFromLookup(code, result));
        }}
        loyaltySettings={loyaltySettings}
      />
    );
  }

  function renderCheckoutNavButtons() {
    if (checkoutStep === "payment") {
      return (
        <div className="flex gap-2">
          {checkoutSteps.length > 1 && (
            <Button type="button" variant="secondary" className="flex-1" onClick={goToPrevCartStep}>
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
          )}
          <div className={checkoutSteps.length > 1 ? "flex-[2]" : "w-full"}>
            {renderPrintTicketButton()}
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        {checkoutSteps.indexOf(checkoutStep) > 0 ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={goToPrevCartStep}
          >
            Retour
          </Button>
        ) : null}
        {checkoutStep === "loyalty" ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={goToNextCartStep}
          >
            Passer
          </Button>
        ) : null}
        <Button type="button" className="flex-1" onClick={goToNextCartStep}>
          Suivant
        </Button>
      </div>
    );
  }

  function renderPrintTicketButton() {
    return (
      <Button
        className="w-full"
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
          (isOrderMode && !orderFullyValidated) ||
          (showCashCalculator && !cashPaymentReady)
        }
        loading={loading}
      >
        <Printer className="h-4 w-4" />
        Imprimer ticket
      </Button>
    );
  }

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
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 px-4 pt-4">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight text-primary">Scan stock</h1>
                <p className="mt-1 text-muted">
                  Scannez un code-barres pour réapprovisionner
                  {storeName ? (
                    <span className="mt-1 block text-primary">{storeName}</span>
                  ) : null}
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
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Onglets mobile — Produits / Panier */}
            <div className="natus-pos-mobile-tabs-shell shrink-0 px-3 pt-2 md:hidden">
              <div className="natus-pos-mobile-tabs flex gap-1">
                <button
                  type="button"
                  onClick={() => setMobilePosView("catalog")}
                  className={cn(
                    "natus-pos-mobile-tab flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold",
                    mobilePosView === "catalog" && "natus-pos-mobile-tab--active"
                  )}
                >
                  <ScanBarcode className="h-4 w-4" />
                  Produits
                </button>
                <button
                  type="button"
                  onClick={() => openMobileCart()}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold",
                    mobilePosView === "cart" && "natus-pos-mobile-tab--active",
                    mobilePosView !== "cart" && "natus-pos-mobile-tab"
                  )}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Panier
                  {cart.length > 0 && (
                    <span className="absolute right-3 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Colonne gauche — catalogue produits */}
            <div
              className={cn(
                "flex min-h-0 flex-1 w-full min-w-0 flex-col md:flex-[65]",
                mobilePosView !== "catalog" && "max-md:hidden"
              )}
            >
              {orderNotifications && (
                <CashierNotificationBar
                  onViewNotification={(notification) => {
                    if (notification.kind === "hub_transfer") {
                      router.push(
                        notificationHref(notification.kind, notification.audience)
                      );
                      return;
                    }
                    if (
                      notification.kind === "stock_low" ||
                      notification.kind === "stock_out"
                    ) {
                      return;
                    }
                    setShowOrdersPanel(true);
                  }}
                />
              )}
              <div className="natus-pos-luxury-header shrink-0 border-b border-primary/10 px-4 py-4 md:py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col">
                    <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight text-primary">
                      Caisse
                    </h1>
                    {storeName ? (
                      <p className="mt-1 text-sm text-muted">{storeName}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                    {preparableOrderCount > 0 && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="relative overflow-visible"
                        onClick={() => setShowOrdersPanel(true)}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Commandes
                        <CountBadge count={preparableOrderCount} />
                      </Button>
                    )}
                    {canDayClosure && !isStorePos && (
                      <PosDayClosureButton onClick={() => setShowDayClosure(true)} />
                    )}
                    <ProClientQrButton
                      storeId={defaultStoreId}
                      storeName={storeName}
                      disabled={!defaultStoreId}
                    />
                    {orderNotifications && (
                      <div className="relative overflow-visible">
                        <CashierNotificationBell
                          onSelect={(notification) => {
                            if (notification.kind === "hub_transfer") {
                              router.push(
                                notificationHref(notification.kind, notification.audience)
                              );
                              return;
                            }
                            if (
                              notification.kind === "stock_low" ||
                              notification.kind === "stock_out"
                            ) {
                              return;
                            }
                            setShowOrdersPanel(true);
                          }}
                        />
                      </div>
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
                      Scannez ou utilisez + pour valider chaque produit jusqu&apos;à la quantité commandée
                    </p>
                  </Card>
                )}

                {error && (
                  <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>

              <div className="natus-pos-luxury-catalog min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-28 scrollbar-natus md:px-4 md:py-4 md:pb-4">
                <ProductCatalog
                  products={products}
                  onAddToCart={(product, qty) => {
                    if (isOrderMode) {
                      for (let i = 0; i < qty; i++) adjustOrderValidation(product.id, 1);
                      return;
                    }
                    addToCart(product, qty);
                  }}
                  onUpdateQuantity={(productId, delta) => {
                    if (isOrderMode) {
                      adjustOrderValidation(productId, delta);
                      return;
                    }
                    updateQuantity(productId, delta);
                  }}
                  cartQuantities={cartQuantities}
                  validatedQuantities={isOrderMode ? validatedQty : undefined}
                  onBarcodeScan={handleScan}
                  lastAddedProduct={lastAddedProduct}
                  scannerEnabled={!receipt && (!isStockScan || !scannedProduct)}
                  orderMode={isOrderMode}
                  compact
                  luxuryMobile
                  productSalesQty={productSalesQty}
                />
              </div>
            </div>

            {/* Colonne droite — panier */}
            <div
              className={cn(
                "flex min-h-0 flex-1 w-full min-w-0 flex-col bg-page",
                mobilePosView !== "cart" && "max-md:hidden",
                "md:flex md:flex-[35] md:border-l md:border-border"
              )}
            >
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-primary/10 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setMobilePosView("catalog")}
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-surface text-primary md:hidden"
                        aria-label="Retour au catalogue"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex min-w-0 flex-col">
                        <h2 className="font-heading text-xl font-bold leading-tight text-primary md:text-lg">
                          Panier
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          {cart.length} article{cart.length !== 1 ? "s" : ""}
                        </p>
                      </div>
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

                </div>

                {renderCheckoutStepBar()}
                {renderCartCheckoutBody()}
              </div>
            </div>

            {mobilePosView === "catalog" && cart.length > 0 && (
              <PosLuxuryCartFab
                itemCount={cart.reduce((s, i) => s + i.quantity, 0)}
                totalLabel={formatCurrency(totalTtc)}
                onClick={() => openMobileCart()}
              />
            )}
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
        <SaleDocumentsModal
          data={receipt}
          onClose={closeReceipt}
          closeLabel={
            initialShopifyOrder || shopifyOrders.length > 0
              ? "Retour aux commandes"
              : "Nouvelle vente"
          }
        />
      )}

      {canDayClosure && !isStorePos && (
        <PosDayClosureModal
          open={showDayClosure}
          onClose={() => setShowDayClosure(false)}
          storeId={defaultStoreId}
          storeName={storeName}
          cashierUserId={cashierUserId}
          cashierName={cashierName}
          isStorePos={isStorePos}
          isManagementUser={isManagementUser}
        />
      )}

      <PosScanAlertToast
        alert={scanAlert}
        onClose={() => {
          setScanAlert(null);
          focusInput();
        }}
      />

      <PosOrdersPanel
        orders={shopifyOrders}
        open={showOrdersPanel}
        onClose={() => setShowOrdersPanel(false)}
        onSelectOrder={loadShopifyOrder}
      />
    </>
  );
}
