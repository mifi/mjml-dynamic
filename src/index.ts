import mjml2html from 'mjml';
// eslint-disable-next-line import/no-extraneous-dependencies
import { components, MJMLParsingOptions, MJMLJsonObject, MJMLParseResults } from 'mjml-core';
// eslint-disable-next-line import/no-extraneous-dependencies
// @ts-ignore
import Parser from 'mjml-parser-xml';
import { escapeUTF8, escapeAttribute } from 'entities';


// https://github.com/mjmlio/mjml/blob/master/packages/mjml-parser-xml/test/test.js
// https://github.com/mjmlio/mjml/discussions/2619
// https://github.com/mjmlio/mjml/issues/2465


export const replacerAttributeName = 'mj-replace-id' as const;

/**
 * null means delete node
 */
export type Replacer = {
  tagName?: string | ((a: string) => string) | undefined,
  content?: string | ((a: string) => string) | undefined,
  attributes?: Record<string, unknown> | ((a: Record<string, unknown>) => Record<string, unknown>) | undefined,
  children?: MJMLJsonObject[] | ((a: MJMLJsonObject[]) => MJMLJsonObject[]) | undefined,
} | null;

export type Replacers = Record<string, Replacer>

export interface Options extends MJMLParsingOptions {
  validateReplacers?: boolean | undefined,
  replacers?: Replacers | undefined,
}

export function parseXml(xml: unknown, options: Options = {}) {
  const { replacers, validateReplacers = true, ...mjmlOptions } = options;
  const { keepComments, filePath, ignoreIncludes, preprocessors } = mjmlOptions;

  const replacersMap = new Map(replacers != null ? Object.entries(replacers) : []);

  const jsonRaw = Parser(xml, {
    keepComments,
    components,
    filePath,
    preprocessors,
    ignoreIncludes,
  }) as MJMLJsonObject;

  // console.log(JSON.stringify(jsonRaw, null, 2))

  const replacersFound = new Set();

  const defaultEscaper = <T>(v: T) => v;

  const replace = <T extends (Function | string | object)>(
    existing: T,
    replacement: T | ((a: T) => T),
    escaper: (a: T) => T = defaultEscaper,
  ) => (
    // auto-escape only non-functional
    typeof replacement === 'function' ? replacement(existing) : escaper(replacement)
  );

  // auto-encode newly added attributes, pass thru existing
  const deepReplacementOrFn = (
    existingAttributes: Record<string, unknown>,
    replacement: Record<string, unknown> | ((a: Record<string, unknown>) => Record<string, unknown>),
    escaper: (a: unknown) => unknown = defaultEscaper,
  ) => {
    const newAttributes = (typeof replacement === 'function' ? replacement(existingAttributes) : replacement);

    if (!newAttributes) return {};

    return Object.fromEntries(Object.entries(newAttributes).map(([key, value]) => [
      key,
      existingAttributes[key] != null ? value : escaper(value),
    ]));
  };

  const mapTag = ({ tagName, attributes, ...rest }: MJMLJsonObject): MJMLJsonObject | undefined => {
    const children = 'children' in rest && Array.isArray(rest.children)
      ? rest.children.map(mapTag).flatMap((child) => (child != null ? [child] : []))
      : undefined;
    
    const content = 'content' in rest && rest.content != null ? rest.content : undefined;

    const ret = {
      tagName,
      attributes,
      ...(children != null && { children }),
      ...(content != null && { content }),
    };

    if (replacerAttributeName in attributes && attributes[replacerAttributeName] != null) {
      const replacerId = attributes[replacerAttributeName];
      if (typeof replacerId !== 'string') throw new Error(`Invalid replacer ${replacerId}`)
      if (replacerAttributeName in ret.attributes) delete ret.attributes[replacerAttributeName];

      if (replacersMap.has(replacerId)) {
        const replacer = replacersMap.get(replacerId);

        replacersFound.add(replacerId);

        if (replacer === null) return undefined; // null means delete this node

        if (replacer === undefined) throw new Error(`Replacer ${replacerId} cannot be undefined`);

        if (replacer.tagName != null) {
          ret.tagName = replace(
            tagName,
            replacer.tagName,
          );
        }

        if (replacer.children != null) {
          ret.children = replace(
            children ?? [],
            replacer.children,
          );
        }

        if (replacer.content != null) {
          ret.content = replace(
            content ?? '',
            replacer.content,
            (v) => escapeUTF8(v),
          );
        }

        if (replacer.attributes != null) {
          ret.attributes = deepReplacementOrFn(
            attributes,
            replacer.attributes,
            (v) => typeof v === 'string' ? escapeAttribute(v) : v,
          );
        }
      } else if (validateReplacers) {
        throw new Error(`Replacer "${replacerId}" not found in options`);
      }
    }

    return ret;
  };

  const json = mapTag(jsonRaw);
  // console.log(JSON.stringify(json, null, 2))

  if (replacers != null && validateReplacers) {
    const nonUsedReplacers = Object.entries(replacers).filter(([, replacer]) => replacer != null).filter(([replacerId]) => !replacersFound.has(replacerId));
    if (nonUsedReplacers.length > 0) throw new Error(`Replacer "${nonUsedReplacers[0][0]}" not found in document`);
  }

  return { json, mjmlOptions };
}

export default (xml: unknown, options: Options): MJMLParseResults => {
  const { json, mjmlOptions } = parseXml(xml, options);
  if (json == null) throw new Error('Nothing was returned from parse');
  return mjml2html(json, mjmlOptions);
};
