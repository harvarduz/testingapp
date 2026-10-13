const priceInCents = value => {
  const text = String(value).trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents >= 1 && cents <= 10000 ? cents : null;
};

export function comparePacks(a, b) {
  const packs = [a, b].map(pack => {
    const priceCents = priceInCents(pack.price);
    const quantity = /^\d{1,2}$/.test(String(pack.quantity)) ? Number(pack.quantity) : 0;
    return { priceCents, quantity, validPrice: priceCents !== null, validQuantity: quantity >= 1 && quantity <= 12 };
  });
  if (packs.some(pack => !pack.validPrice || !pack.validQuantity)) return { valid: false, packs };
  const [first, second] = packs;
  // Compare the entered prices exactly, before rounding the display values.
  const difference = first.priceCents * second.quantity - second.priceCents * first.quantity;
  return {
    valid: true,
    packs: packs.map(pack => ({ ...pack, unitPrice: pack.priceCents / 100 / pack.quantity })),
    winner: difference === 0 ? 'equal' : difference < 0 ? 'a' : 'b',
  };
}
