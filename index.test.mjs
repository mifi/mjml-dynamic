import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createElement, Fragment } from 'react';
import { MjmlTable } from '@faire/mjml-react';
import { renderToStaticMarkup } from 'react-dom/server';

import mjml2html, { parseXml } from './index.js';

// eslint-disable-next-line no-underscore-dangle
const __dirname = dirname(fileURLToPath(import.meta.url));

const xml1 = `\
<mjml>
  <mj-body>
    <mj-include path="test-fixture.mjml" />

    <mj-section>
      <mj-column>
        <mj-text mj-replace-id="replaced" align="left" color="red">Test <span>inside span {{interpolation1}} {{interpolation2}}</span></mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

describe('mjml', () => {
  test('parseXml with missing replacer', () => {
    // console.log(JSON.stringify(parseXml(xml1, { filePath: __dirname }), null, 2))

    const parsed = parseXml(xml1, { filePath: __dirname, validateReplacers: false });
    expect(parsed.mjmlOptions).toMatchObject({
      filePath: expect.stringMatching(/^.+$/),
    });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'some text',
                      attributes: {
                        align: 'center',
                      },
                    },
                  ],
                },
              ],
            },
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'Test <span>inside span {{interpolation1}} {{interpolation2}}</span>',
                      attributes: {
                        align: 'left',
                        color: 'red',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          tagName: 'mj-head',
          attributes: {},
          children: [
            {
              tagName: 'mj-attributes',
              attributes: {},
              children: [
                {
                  tagName: 'mj-all',
                  attributes: {
                    padding: '0px',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test('parseXml with replacer', () => {
    const replacers = {
      replaced: {
        tagName: 'mj-text2',
        attributes: { align: 'right' },
        content: 'This is injected via JSON',
      },
    };

    const parsed = parseXml(xml1, { filePath: __dirname, replacers, validateReplacers: false });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'some text',
                      attributes: {
                        align: 'center',
                      },
                    },
                  ],
                },
              ],
            },
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text2',
                      content: 'This is injected via JSON',
                      attributes: {
                        align: 'right',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          tagName: 'mj-head',
          attributes: {},
          children: [
            {
              tagName: 'mj-attributes',
              attributes: {},
              children: [
                {
                  tagName: 'mj-all',
                  attributes: {
                    padding: '0px',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test('parseXml with replacer in included file', () => {
    const replacers = {
      included: {
        content: 'some new text',
      },
    };

    const parsed = parseXml(xml1, { filePath: __dirname, replacers, validateReplacers: false });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'some new text',
                      attributes: {
                        align: 'center',
                      },
                    },
                  ],
                },
              ],
            },
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'Test <span>inside span {{interpolation1}} {{interpolation2}}</span>',
                      attributes: {
                        align: 'left',
                        color: 'red',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          tagName: 'mj-head',
          attributes: {},
          children: [
            {
              tagName: 'mj-attributes',
              attributes: {},
              children: [
                {
                  tagName: 'mj-all',
                  attributes: {
                    padding: '0px',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test('parseXml with functional replacer', () => {
    const replacers = {
      replaced: {
        tagName: (existing) => `${existing}3`,
        attributes: (existing) => ({ ...existing, align: 'right' }),
        content: (existing) => existing.replace('{{interpolation1}}', 'Jane Doe'),
      },
    };

    const parsed = parseXml(xml1, { filePath: __dirname, replacers, validateReplacers: false });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'some text',
                      attributes: {
                        align: 'center',
                      },
                    },
                  ],
                },
              ],
            },
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text3',
                      content: 'Test <span>inside span Jane Doe {{interpolation2}}</span>',
                      attributes: {
                        align: 'right',
                        color: 'red',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          tagName: 'mj-head',
          attributes: {},
          children: [
            {
              tagName: 'mj-attributes',
              attributes: {},
              children: [
                {
                  tagName: 'mj-all',
                  attributes: {
                    padding: '0px',
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test('parseXml with functional replacer (children)', () => {
    const xml = `\
<mjml>
  <mj-body>
    <mj-section>
      <mj-column mj-replace-id="replaced1" />
      <mj-column mj-replace-id="replaced2">
        <mj-image src="https://google.com/" />
        <mj-text>old text</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

    const replacers = {
      replaced1: {
        children: [{ tagName: 'mj-text', content: 'replaced1 text' }],
      },
      replaced2: {
        children: (existing) => [...existing, { tagName: 'mj-text', content: 'replaced2 text' }],
      },
    };

    const parsed = parseXml(xml, { filePath: __dirname, replacers });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-text',
                      content: 'replaced1 text',
                    },
                  ],
                },
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      tagName: 'mj-image',
                      attributes: {
                        src: 'https://google.com/',
                      },
                    },
                    {
                      tagName: 'mj-text',
                      content: 'old text',
                      attributes: {},
                    },
                    {
                      tagName: 'mj-text',
                      content: 'replaced2 text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  test('mjml2html', () => {
    const replacers = {
      replaced: { content: 'This is injected via JSON' },
    };

    const { html } = mjml2html(xml1, { filePath: __dirname, replacers, validateReplacers: false });
    // console.log(html)
    expect(html).toMatchSnapshot();
  });
});

describe('with mjml-react', () => {
  test('simple', () => {
    const elements = createElement(
      MjmlTable,
      null,
      createElement(
        'tr',
        null,
        createElement(
          'td',
          { padding: '0 10px' },
          'this is a table column'
        ),
      ),
    );
  
    const mjml = renderToStaticMarkup(elements);
    const { json: reactJson } = parseXml(mjml);
    expect(reactJson).toEqual({
      tagName: 'mj-table',
      attributes: {},
      content: '<tr><td padding="0 10px">this is a table column</td></tr>',
    })
    
    // console.log(reactJson)

    const xml = `\
<mjml>
  <mj-body>
    <mj-section>
      <mj-column mj-replace-id="replacedReact" />
    </mj-section>
  </mj-body>
</mjml>
`;

  const replacers = {
    replacedReact: {
      children: [reactJson],
    },
  };

    const parsed = parseXml(xml, { filePath: __dirname, replacers });
    expect(parsed.json).toEqual({
      tagName: 'mjml',
      attributes: {},
      children: [
        {
          tagName: 'mj-body',
          attributes: {},
          children: [
            {
              tagName: 'mj-section',
              attributes: {},
              children: [
                {
                  tagName: 'mj-column',
                  attributes: {},
                  children: [
                    {
                      attributes: {},
                      tagName: 'mj-table',
                      content: '<tr><td padding="0 10px">this is a table column</td></tr>',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe('validation', () => {
  test('validateReplacers, missing replacer', () => {
    const xml = `\
<mjml>
  <mj-body>
    <mj-section>
      <mj-column mj-replace-id="replaced" />
    </mj-section>
  </mj-body>
</mjml>
`;

    const replacers = {};
    expect(() => parseXml(xml, { filePath: __dirname, replacers })).toThrow('Replacer "replaced" not found in options');
  });
  test('validateReplacers, extraneous replacer', () => {
    const xml = `\
<mjml>
  <mj-body>
    <mj-section>
      <mj-column />
    </mj-section>
  </mj-body>
</mjml>
`;

    const replacers = {
      replaced: { content: 'wat' },
    };
    expect(() => parseXml(xml, { filePath: __dirname, replacers })).toThrow('Replacer "replaced" not found in document');
  });
});
