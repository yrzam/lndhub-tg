import { I18n, I18nContext, TemplateData } from '@grammyjs/i18n';
import { html } from 'telegram-format';

export const i18n = new I18n({
  defaultLanguageOnMissing: true,
  directory: 'res/locales',
  useSession: true,
  defaultLanguage: 'en',
  templateData: {
    opt(optVar: unknown, asVar: string, useKey: string) {
      if (optVar) {
        return i18n.t(
          (this as unknown as I18nContext).languageCode,
          useKey,
          { ...(this as unknown as I18nContext).templateData, ...{ [asVar]: optVar } },
        );
      }
      return '';
    },
  },
});

export function tOrKey(
  i18nCtx: I18nContext,
  k: string,
  templateData?: Readonly<TemplateData>,
): string {
  if (i18nCtx.repository[i18nCtx.languageCode]?.[k]) { return i18nCtx.t(k, templateData); }
  return k.split('.').at(-1) || k;
}

export function tToAll(k: string, templateData: Readonly<TemplateData> = {}) : Array<string> {
  const res = Object.values(i18n.repository)
    .map((v) => v[k]?.(templateData))
    .filter((el) => el);
  return res as Array<string>;
}

export function esc(str: string) {
  return html.escape(str);
}
