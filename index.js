const mjml2html = require('mjml');
// eslint-disable-next-line import/no-extraneous-dependencies
const { components } = require('mjml-core');
// eslint-disable-next-line import/no-extraneous-dependencies
const Parser = require('mjml-parser-xml');

// https://github.com/mjmlio/mjml/blob/master/packages/mjml-parser-xml/test/test.js
// https://github.com/mjmlio/mjml/discussions/2619
// https://github.com/mjmlio/mjml/issues/2465


const jsonIncludeAttributeName = 'mj-replace-id';

function parseXml(xml, options = {}) {
  const { replacers, validateReplacers = true, ...mjmlOptions } = options;
  const { keepComments, filePath, ignoreIncludes, preprocessors } = mjmlOptions;

  const replacersMap = new Map(replacers != null ? Object.entries(replacers) : []);

  const jsonRaw = Parser(xml, {
    keepComments,
    components,
    filePath,
    preprocessors,
    ignoreIncludes,
  });

  // console.log(JSON.stringify(jsonRaw, null, 2))

  const replacersFound = new Set();

  const mapTag = ({ tagName, children, attributes, content }) => {
    const ret = { tagName };
    if (attributes != null) ret.attributes = attributes;
    if (children != null) ret.children = children?.map(mapTag);
    if (content != null) ret.content = content;

    if (attributes != null && attributes[jsonIncludeAttributeName] != null) {
      const replacerId = attributes[jsonIncludeAttributeName];
      delete ret.attributes[jsonIncludeAttributeName];

      if (replacersMap.has(replacerId)) {
        const match = replacersMap.get(replacerId);
        replacersFound.add(replacerId);
        const replacementOrFn = (existing, replacement) => (typeof replacement === 'function' ? replacement(existing) : replacement);
        if (match.tagName != null) ret.tagName = replacementOrFn(tagName, match.tagName);
        if (match.attributes != null) ret.attributes = replacementOrFn(attributes, match.attributes);
        if (match.children != null) ret.children = replacementOrFn(Array.isArray(children) ? children.map(mapTag) : children, match.children);
        if (match.content != null) ret.content = replacementOrFn(content, match.content);
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

module.exports = (xml, options) => {
  const { json, mjmlOptions } = parseXml(xml, options);
  return mjml2html(json, mjmlOptions);
};

module.exports.parseXml = parseXml;
