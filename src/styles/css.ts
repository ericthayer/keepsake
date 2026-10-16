/** Builds a constructable stylesheet. Tag the template so editors highlight it as CSS. */
export function css(strings: TemplateStringsArray, ...values: readonly (string | number)[]): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(String.raw({ raw: strings }, ...values));
  return sheet;
}
