import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string; // e.g. "performance-single" | "performance-pack4"
  stack: string; // "The 4-A-Day Performance Stack™"
  variant: "Single Crate" | "4-Crate Monthly Stack";
  unitPrice: number; // GHS, the price per added line unit
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  totalItems: number;
  totalCrates: number;
  totalPrice: number;
  pickup: string;
  setPickup: (v: string) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "gb-naturals-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // hydrate
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = useCallback<CartContextValue["add"]>((item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + qty } : p,
        );
      }
      return [...prev, { ...item, qty }];
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback<CartContextValue["setQty"]>((id, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.id !== id)
        : prev.map((p) => (p.id === id ? { ...p, qty } : p)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { totalItems, totalCrates, totalPrice } = useMemo(() => {
    let totalItems = 0;
    let totalCrates = 0;
    let totalPrice = 0;
    for (const it of items) {
      totalItems += it.qty;
      totalCrates += it.qty * (it.variant === "4-Crate Monthly Stack" ? 4 : 1);
      totalPrice += it.qty * it.unitPrice;
    }
    return { totalItems, totalCrates, totalPrice };
  }, [items]);

  const value: CartContextValue = {
    items,
    add,
    setQty,
    remove,
    clear,
    totalItems,
    totalCrates,
    totalPrice,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function formatGHS(n: number) {
  return `GHS ${n.toLocaleString("en-GH")}`;
}
