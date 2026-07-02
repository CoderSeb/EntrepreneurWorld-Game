import { en } from '@/i18n/en';

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

/** Shape every locale file must satisfy. Values are `string`; keys mirror `en.ts`. */
export type TranslationDictionary = DeepStringRecord<typeof en>;
