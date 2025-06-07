export const parsePercent = v =>
  typeof v === "string" && /^([0-9.]+)%$/.test(v) ? parseFloat(v) : 0;
export const roundInt = x => Math.round(x);
export const arraysEqual = (a, b) =>
  a.length === b.length &&
  a.map(x => x.id || x.name).sort().every((id, i) => id === (b.map(x => x.id || x.name).sort()[i]));
export const getPriceClass = c => c <= 1500 ? 'item-teal' : c >= 9000 ? 'item-epic' : 'item-science';
