// Self-check for the Orders page's filter + Excel export (orderExport.ts).
// No test runner in this project, so it is a plain script:
//   node --experimental-strip-types --no-warnings src/lib/orderExport.check.mjs
import assert from "node:assert/strict";
import { EXPORT_COLUMNS, filterOrders, ordersToCsv } from "./orderExport.ts";

const order = (n, over = {}) => ({
  _id: `6a76a5b7fcf63ef67636c${String(n).padStart(3, "0")}`,
  user: { name: `Customer ${n}`, email: `c${n}@example.com`, phone: "9876543210" },
  items: [{ product: { name: "Tentra Sofa" }, quantity: 2, price: 5000, size: "L" }],
  shippingAddress: { street: "1 MG Road", city: "Kochi", state: "Kerala", zipCode: "682001", country: "India" },
  subtotal: 10000, discount: 0, shippingFee: 0, total: 10000,
  paymentMethod: "razorpay", paymentStatus: "completed", orderStatus: "processing",
  razorpayOrderId: `order_${n}`, razorpayPaymentId: `pay_${n}`,
  createdAt: new Date(Date.UTC(2026, 9, 1, 6, 30) + n * 3600_000).toISOString(),
  ...over,
});

/** Minimal RFC 4180 parser: quoted cells, doubled quotes, CRLF rows. */
function parseCsv(text) {
  assert.ok(text.startsWith("﻿"), "UTF-8 BOM so Excel reads ₹ and names correctly");
  const s = text.slice(1);
  const rows = [[]];
  let cellText = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cellText += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cellText += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { rows.at(-1).push(cellText); cellText = ""; }
    else if (ch === "\r" && s[i + 1] === "\n") { rows.at(-1).push(cellText); cellText = ""; rows.push([]); i++; }
    else cellText += ch;
  }
  rows.at(-1).push(cellText);
  return rows;
}

const exportedIds = (orders) => parseCsv(ordersToCsv(orders)).slice(1).map((r) => r[0]);

// 45 orders: three pages at the page's 20-per-page size.
const all = Array.from({ length: 45 }, (_, i) =>
  order(i + 1, {
    orderStatus: ["processing", "shipped", "delivered"][i % 3],
    ...(i === 7 ? { user: { name: "Asha MENON", email: "asha@example.com" } } : {}),
  })
);
const ids = (list) => list.map((o) => o._id);

// 1. No filters: every order, in the listing's order — not just page one.
assert.deepEqual(exportedIds(filterOrders(all, "", "all")), ids(all));
assert.equal(exportedIds(filterOrders(all, "", "all")).length, 45);

// 2. One filter: status.
const shipped = filterOrders(all, "", "shipped");
assert.deepEqual(exportedIds(shipped), ids(all.filter((o) => o.orderStatus === "shipped")));
assert.equal(shipped.length, 15);

// 3. Search: customer name, case-insensitive; short id with '#'; full id.
assert.deepEqual(exportedIds(filterOrders(all, "  asha menon ", "all")), [all[7]._id]);
assert.deepEqual(exportedIds(filterOrders(all, all[12]._id, "all")), [all[12]._id]);
assert.deepEqual(exportedIds(filterOrders(all, all[12]._id.toUpperCase(), "all")), [all[12]._id]);
assert.equal(filterOrders(all, "#6a76a5b7", "all").length, 45, "short id prefix with # matches like the listing");

// 4. Search AND status together (Asha's order is the 8th: index 7 → 'shipped').
assert.equal(all[7].orderStatus, "shipped");
assert.deepEqual(exportedIds(filterOrders(all, "ASHA", "shipped")), [all[7]._id]);
assert.deepEqual(exportedIds(filterOrders(all, "asha", "delivered")), []);

// 5–7. Changed and cleared filters: each call reflects only its own arguments.
assert.equal(filterOrders(all, "", "delivered").length, 15);
assert.equal(filterOrders(all, "", "all").length, 45);
assert.equal(filterOrders(all, "   ", "all").length, 45, "blank search excludes nothing");

// 8. Multiple pages: all 15 'processing' orders export even though page one shows 20 of 45.
assert.equal(exportedIds(filterOrders(all, "", "processing")).length, 15);

// 9. No matches: header only.
const empty = parseCsv(ordersToCsv(filterOrders(all, "no-such-order", "all")));
assert.equal(empty.length, 1);

// 10. An unsupported status value matches nothing — never "everything".
assert.equal(filterOrders(all, "", "bogus").length, 0);

// 11. No duplicates.
const allIds = exportedIds(all);
assert.equal(new Set(allIds).size, allIds.length);

// 12. Columns and values.
const tricky = order(99, {
  user: { name: '=HYPERLINK("http://evil.example","Click")', email: "x@example.com" },
  items: [
    { product: { name: 'Chair "Royal"' }, quantity: 1, price: 2500 },
    { product: null, quantity: 3, price: 100, size: "M" },
  ],
  shippingAddress: { street: "-Flat 4, Line\nTwo", city: "Kochi", state: "Kerala", zipCode: "682001", country: "India" },
  subtotal: 2800, discount: 300, shippingFee: 0, total: 2500,
  paymentMethod: "cod", advanceAmount: 250, balanceAmount: 2250,
  razorpayPaymentId: undefined,
});
const [header, row] = parseCsv(ordersToCsv([tricky]));
assert.deepEqual(header, [...EXPORT_COLUMNS]);
assert.equal(row.length, EXPORT_COLUMNS.length);
const col = (name) => row[EXPORT_COLUMNS.indexOf(name)];
assert.equal(col("Order ID"), tricky._id);
assert.equal(col("Customer Name"), `'=HYPERLINK("http://evil.example","Click")`, "formula defused");
assert.equal(col("Street"), "'-Flat 4, Line\nTwo", "leading '-' defused; comma and newline kept inside the cell");
assert.equal(col("Items"), 'Chair "Royal" x1 @ 2500; Product unavailable (M) x3 @ 100');
assert.equal(col("Total Quantity"), "4");
assert.equal(col("Subtotal (INR)"), "2800");
assert.equal(col("Discount (INR)"), "300");
assert.equal(col("Total (INR)"), "2500");
assert.equal(col("Paid Online (INR)"), "250");
assert.equal(col("Due on Delivery (INR)"), "2250");
assert.equal(col("Customer Phone"), "", "missing optional value → empty cell");
assert.equal(col("Razorpay Payment ID"), "");
const d = new Date(tricky.createdAt);
const p = (n) => String(n).padStart(2, "0");
assert.equal(col("Order Date"), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`);
// Amounts are bare numbers in the file (unquoted), so Excel can sum them.
assert.match(ordersToCsv([tricky]), /,2500,"cod",/);

console.log("order export checks passed");
