"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  Warehouse,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { ManagerScanPanel } from "@/components/pos/manager-scan-panel";
import { CashierScanPanel } from "@/components/pos/cashier-scan-panel";
import { PaymentModal } from "@/components/pos/payment-modal";
import { Modal } from "@/components/ui/modal";
import { Receipt, printReceipt, type ReceiptData } from "@/components/pos/receipt";
import { ProductCatalog } from "@/components/pos/product-catalog";
import { completeSale } from "@/lib/actions";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product, CartItem, UserRole, PaymentMethod, Store } from "@/lib/types";

type ManagerMode = "stock" | "sale";

export function PosTerminal({
  products,
  role,
  cashierName,
  stores = [],
  defaultStoreId = "",
  storeName,
}: {
  products: Product[];
  role: UserRole;
  cashierName: string;
  stores?: Store[];
  defaultStoreId?: string;
  storeName?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [managerMode, setManagerMode] = useState<ManagerMode>("stock");
  const [showPayment, setShowPayment] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);

  const isManagementUser = role === "manager" || role === "directeur";
  const isStockScan = isManagementUser && managerMode === "stock";

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
    enabled: isStockScan && !showPayment && !receipt && !scannedProduct,
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

    const result = await completeSale(
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
      cashierName,
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      createdAt: new Date().toISOString(),
    });

    setCart([]);
    setShowPayment(false);
    setLoading(false);
    setLastAddedProduct(null);
    router.refresh();

    setTimeout(() => printReceipt(), 300);
  }

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <>
      <div className="animate-fade-in">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isStockScan ? "Scan stock" : "Caisse"}
            </h1>
            <p className="mt-1 text-muted">
              {isStockScan
                ? "Scannez un code-barres pour réapprovisionner"
                : "Scannez un code-barres pour vendre"}
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
                    ? "bg-primary text-black"
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
                    ? "bg-primary text-black"
                    : "text-muted hover:text-foreground"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                Vente
              </button>
            </div>
          )}
        </div>

        {isStockScan && (
          <Card className="mb-6">
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
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {!isStockScan && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-4">
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                <ProductCatalog
                  products={products}
                  onSelect={(p) => setScannedProduct(p)}
                  onBarcodeScan={handleScan}
                  lastAddedProduct={lastAddedProduct}
                  scannerEnabled={!showPayment && !receipt && !scannedProduct}
                />
              </div>

              {cart.length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <h2 className="text-sm font-medium text-muted">Panier en cours</h2>
                  {cart.map((item) => (
                    <Card key={item.product.id} className="flex items-center gap-4 !p-4">
                      <ProductImage product={item.product} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted">
                          {formatCurrency(item.product.price)} / unité
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="border border-border p-2 hover:bg-primary/10 cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="border border-border p-2 hover:bg-primary/10 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="w-24 text-right font-semibold">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-danger hover:bg-danger/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card className="sticky top-8">
                <h2 className="mb-4 text-lg font-semibold">Panier</h2>
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-muted">Panier vide</p>
                ) : (
                  <>
                    <div className="mb-4 space-y-2">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <span className="truncate text-muted">
                            {item.quantity}× {item.product.name}
                          </span>
                          <span>{formatCurrency(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="mb-4 flex justify-between">
                        <span className="text-lg font-medium">Total</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => setShowPayment(true)}
                        disabled={cart.length === 0}
                      >
                        Valider la commande
                      </Button>
                    </div>
                  </>
                )}
              </Card>
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

      {showPayment && (
        <PaymentModal
          total={total}
          loading={loading}
          onPay={handlePay}
          onClose={() => setShowPayment(false)}
        />
      )}

      {receipt && (
        <Modal
          onClose={() => {
            setReceipt(null);
            inputRef.current?.focus();
          }}
          size="md"
          scrollable={false}
        >
          <Receipt data={receipt} />
          <div className="mt-4 flex justify-center gap-3 print:hidden">
            <Button onClick={() => printReceipt()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setReceipt(null);
                inputRef.current?.focus();
              }}
            >
              Nouvelle vente
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
