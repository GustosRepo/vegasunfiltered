import type { PublicReceiptDetails } from "@/lib/cms-content";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function TheReceipt({ receipt }: { receipt: PublicReceiptDetails }) {
  const amounts = [
    ["Food", receipt.foodSubtotal],
    ["Drinks", receipt.drinksSubtotal],
    ["Additional charges", receipt.additionalCharges],
    ["Tax", receipt.salesTax],
    ["Tip", receipt.tip],
  ] as const;
  return (
    <section className="receipt-box" aria-label="The receipt">
      <span className="eyebrow">THE RECEIPT</span>
      <h2>{receipt.restaurantName}</h2>
      {receipt.itemsOrdered.length > 0 && (
        <ul aria-label="Items ordered">
          {receipt.itemsOrdered.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              {item.name}{item.amount !== undefined && <> — {currency.format(item.amount)}</>}
            </li>
          ))}
        </ul>
      )}
      {amounts.map(([label, amount]) => amount > 0 ? (
        <p key={label}>{label}: {currency.format(amount)}</p>
      ) : null)}
      <p className="receipt-total">{receipt.totalAdjusted ? "Adjusted total" : "Verified total"}: {currency.format(receipt.finalTotal)}</p>
      <p>Party size: {receipt.partySize}</p>
      <p>Visited: {new Date(`${receipt.visitedAt}T12:00:00`).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      {receipt.wouldReturn !== null && <p>Would we return? {receipt.wouldReturn ? "Yes" : "No"}</p>}
      {receipt.editorialVerdict && <p>{receipt.editorialVerdict}</p>}
    </section>
  );
}
