// One restaurant's cart at a time, kept on the phone.
import { useEffect, useState } from 'react';
const KEY = 'ft_cart';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (c) => { try { c && c.items.length ? localStorage.setItem(KEY, JSON.stringify(c)) : localStorage.removeItem(KEY); } catch {} window.dispatchEvent(new Event('ft:cart')); };

export function useCart() {
  const [cart, set] = useState(read);
  useEffect(() => { const f = () => set(read()); window.addEventListener('ft:cart', f); return () => window.removeEventListener('ft:cart', f); }, []);
  return cart;
}
export const cartCount = (c) => (c ? c.items.reduce((a, i) => a + i.quantity, 0) : 0);
export const cartTotal = (c) => (c ? c.items.reduce((a, i) => a + i.price * i.quantity, 0) : 0);

/** Change an item's quantity by +1/-1. Returns false if the cart holds another restaurant and the customer said no. */
export function bump(vendor, item, delta) {
  let c = read();
  if (c && c.vendor_id !== vendor.id) {
    if (!confirm(`Your cart has food from ${c.vendor_name}. Start a new cart for ${vendor.business_name}?`)) return false;
    c = null;
  }
  c = c || { vendor_id: vendor.id, vendor_name: vendor.business_name, items: [] };
  const it = c.items.find((i) => i.menu_item_id === item.id);
  if (it) it.quantity = Math.max(0, Math.min(50, it.quantity + delta));
  else if (delta > 0) c.items.push({ menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 });
  c.items = c.items.filter((i) => i.quantity > 0);
  write(c); navigator.vibrate?.(8);
  return true;
}
export const clearCart = () => write(null);
export const qtyOf = (c, itemId) => c?.items.find((i) => i.menu_item_id === itemId)?.quantity || 0;
