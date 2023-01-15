# `mjml-dynamic` - Include dynamic MJML content via JSON

[MJML](https://github.com/mjmlio/mjml) is a great open source tool for building emails, however as developers we often want to include dynamic content in our emails. The problem is that MJML **does not include any templating support** (and they have no intention to.)  This can be worked around by using placeholders in your MJML and then compiling the markup first using a templating engine like [Handlebars](https://github.com/handlebars-lang/handlebars.js), [Pug](https://github.com/pugjs/pug) etc, however what if we could generate the content dynamically using JavaScript! It turns out that MJML already supports rendering [JSON markup](https://documentation.mjml.io/#using-mjml-in-json) instead of MJML. The problem is that there is no way to **include partial JSON content, but this package solves this problem.**

## Benefits:

- Easily inject text, tags, lists and more into your MJML programmatically.
- Replace parts of your MJML document with something dynamically generated.
- Rewrite `mj-` attributes, text content or child nodes on a per-node basis.
- No need for [conditionals, loops](https://handlebarsjs.com/guide/builtin-helpers.html) etc. Just use plain JavaScript!
- No need to escaping special characters or sanitize utrusted data.
- Don't worry about injection attacks or special characters breaking the layout.
- You can still design and preview your overall layout using existing MJML tooling.
- Use in conjuction with [`mjml-react`](https://github.com/Faire/mjml-react) to replace parts of your document with React code.

## How does it work?

### New MJML attribute: `mj-replace-id`

You include a special tag `mj-replace-id="myId"` into any of your `mj-` tags in your MJML document. This will allow you to process these tags programmatically or inject your own JSON MJML content into them, using a new `replacers` option for the `mjml2html` function.

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>

        <mj-button mj-replace-id="myId">
          Some text
        </mj-button>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### New `mjml2html` option: `replacers`

The `mjml2html` API is exactly the same as the upstream `mjml` API, but there is an added option called `replacers` which is an object where each key corresponds to a `mj-replace-id` and the value is an object with one or more of the following properties:

- `content` (`string`) - Allows you to change the text content of the element.
- `attributes` (`object<string,string>`) - Allows you to change the XML attributes of the element.
- `children` (`array<object>`) - Allows you to change the element's children.
- `tagName` (`string`) - Allows you to change the tag to a completely different tag.

Any of the above `replacers` properties are optional, and you may alternatively supply a function that receives the existing value as its only argument. This can be used to modify the existing values.

## Example

```
yarn add -D mjml mjml-dynamic
```

```js
import mjml2html from 'mjml-dynamic';

const replacers = {
  myId: {
    tagName: 'mj-text' 
    content: 'new text content',
    attributes: { color: 'red' },
  },
  // ... more `mj-replace-id`s
};

const { html } = mjml2html(mjml, { replacers });
```

This will output the equivalent of the following MJML document:

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>

        <mj-text color="red">
          new text content
        </mj-text>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Example: functional `replacers`

```js
const replacers = {
  myId: {
    // adds an additional color attribute:
    attributes: (attributes) => ({ ...attributes, color: 'red' },
    // rewrites the text content:
    content: (content) => content.replace('{{something}}', 'something else'),
    // (you may use a template engine line handlebars for more sophisticated replacements)
  },
};
```

### Example: list / loop (replacing `children`):

You can use this to include any kind of dynamic MJML as a node's `children`, and even loops to generate lists.

```xml
<mjml>
  <mj-body mj-replace-id="peopleList" />
</mjml>
```

```js
import mjml2html from 'mjml-dynamic';

const people = [
  { name 'John Doe', age: 23 },
  { name 'Jane Doe', age: 34 },
  { name 'Satoshi Nakamoto', age: 99 },
]

const replacers = {
  peopleList: {
    children: [{
      tagName: 'mj-section',
      children: [{
        tagName: 'mj-column',
        children: people.map(({ name, age }) => ({
          tagName: 'mj-text',
          content: `${name} - ${age} yr`,
        })),
      }],
    }],
  },
};

const { html } = mjml2html(xml, { replacers });
```

This will output the equivalent of the following MJML document:
```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          John Doe - 23 yr
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text>
          Jane Doe - 34 yr
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text>
          Satoshi Nakamoto - 99 yr
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Example: usage with [`mjml-react`](https://github.com/Faire/mjml-react)

Example to replace parts of your `.mjml` document with React code:

```jsx
import { parseXml } from 'mjml-dynamic';

const mjml = renderToStaticMarkup((
  <MjmlTable>
    <tr>
      <td style={{ padding: '0 10px' }}>
        this is a table column
      </td>
    </tr>
  </MjmlTable>
));
    const { json: reactJson } = parseXml(mjml);

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

const { html } = mjml2html(xml, { replacers });
```

### [More examples](./index.test.js)

## TODO
- Support running in the browser

## References

See initial discussion here: https://github.com/mjmlio/mjml/discussions/2619


## Related packages

- [`mjml-react`](https://github.com/Faire/mjml-react)
- [`mjml-json`](https://github.com/lenfestlab/mjml-json)
