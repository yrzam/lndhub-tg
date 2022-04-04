export function readableNum(num : number, precision = 2) {
  const str = (+num.toFixed(precision)).toString().split('.');
  if (str[0] && str[0]?.length >= 5) {
    str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1\'');
  }
  return str.join('.');
}

export function readableBias(multiplier: number, applied: boolean): string | undefined {
  if (!applied) return undefined;
  let biasPercent: string | number = +(multiplier * 100 - 100).toFixed(2);
  if (biasPercent === 0) return undefined;
  biasPercent = biasPercent > 0 ? `+${biasPercent}` : `${biasPercent}`;
  return biasPercent;
}
