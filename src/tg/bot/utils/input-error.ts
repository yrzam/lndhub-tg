import { TemplateData } from '@grammyjs/i18n';

// eslint-disable-next-line @typescript-eslint/ban-types
type KeySuggestions = 'noAction' | string & {};

export default class InputError extends Error {
  readonly key;

  readonly tData?;

  constructor(
    message: KeySuggestions,
    key?: KeySuggestions,
    tData?: TemplateData,
  ) {
    super(message);
    this.key = key || message;
    this.tData = tData;
  }
}
