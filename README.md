# Dynamic JSON content for MJML templates

![mjml](https://user-images.githubusercontent.com/402547/212595358-e7d16377-381e-442a-8b94-ed4d9e135df7.png)

[MJML](https://github.com/mjmlio/mjml) is a great open source tool for building emails, however as developers we often want to include dynamic content in our emails. The problem is that MJML **does not have any templating support** (and they have no intention to.) This can be worked around by using placeholders in your MJML and then compiling the markup first using a templating engine like [Handlebars](https://github.com/handlebars-lang/handlebars.js), [Pug](https://github.com/pugjs/pug) etc, however what if we could generate the content dynamically using JavaScript! It turns out that MJML already supports rendering [JSON markup](https://documentation.mjml.io/#using-mjml-in-json) instead of MJML. The problem is that there is no way to **include partial JSON content, but `mjml-dynamic` solves this problem.**

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

The `mjml2html()` API of `mjml-dynamic` is exactly the same as the upstream `mjml` API, but there is an added option called `replacers` which is an object where each key corresponds to a `mj-replace-id` and the value is either `null` or an object with one or more of the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `content` | `string` | Change the text or HTML content of the element. |
| `attributes` | `object<string,string>` | Change the HTML attributes of the element. |
| `children` | `array<object>` | Change the element's MJML children elements (for example with `mjml-react`.) |
| `tagName` | `string` | Change the tag to a completely different tag. |

Any of the above `replacers` properties are optional. You may alternatively supply a **function** that receives the existing value as its only argument and returns the new value. This can be used to modify the existing values. **`content` and `attributes` replacements are automatically escaped, however if you specify the functional `content` replacer, the response is not escaped.**

If you specify `null` as the replacer's value instead of the above object, the matching node *will be removed*.

## Examples

```
yarn add -D mjml mjml-dynamic
```

```js
import mjml2html from 'mjml-dynamic';

const replacers = {
  myId: {
    tagName: 'mj-button',
    // these values are all automatically escaped:
    content: 'new text content', 
    attributes: { color: 'red', href: '&' },
  },
  removedId: null, // use null to completey remove the node
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

        <mj-button color="red" href="&amp;">
          new text content
        </mj-button>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Example: functional `replacers`

```js
const replacers = {
  myId: {
    // Add an additional color attribute, while preserving the existing attributes:
    attributes: (attributes) => ({ ...attributes, color: 'red' },

    // Rewrite the HTML content:
    content: (content) => content.replace('{{something}}', 'something else'),
    // NOTE! mjml-dynamic does not automatically escape the replacement HTML here, so you need to do it yourself.
    // (You may use a template engine like handlebars for more sophisticated replacements)
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

### Practical example: usage with [`mjml-react`](https://github.com/Faire/mjml-react)

Example to replace parts of your `.mjml` document with React code:

Assuming you have a `template.mjml` with an overall email layout that you can preview using official MJML tooling:

```xml
<mjml>
  <mj-body>
    <mj-include path="header.mjml" />

    <mj-section>
      <mj-column>
        <mj-text>Here is a list of people</mj-text>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column mj-replace-id="peopleList" />
    </mj-section>

    <mj-include path="footer.mjml" />
  </mj-body>
</mjml>
```

Then you can render the contents of the element `<mj-column mj-replace-id="peopleList">` using `mjml-react`:

```jsx
import readFile from 'fs/promises';
import { parseXml } from 'mjml-dynamic';

const tableData = [
  { id: 1, name: 'Jane Doe' },
  { id: 2, name: 'John Doe' },
];

const mjml = renderToStaticMarkup((
  <MjmlTable>
    {tableData.map(({ id, name }) => (
      <tr key={id}>
        <td style={{ padding: '0 10px' }}>
          {name}
        </td>
      </tr>
    )}
  </MjmlTable>
));

const { json: reactJson } = parseXml(mjml);

const xml = await readFile('template.mjml', 'utf-8');

const replacers = {
  peopleList: {
    children: [reactJson],
  },
};

const { html } = mjml2html(xml, { replacers });
```

### [More examples](./index.test.mjs)

## Other options

### `validateReplacers` (default `true`)

Whether to check if all `mj-replace-id` in the MJML tree are specified in options, and check if all `replacers` exist in the MJML tree. This is useful in order to reduce the chance of coding mistakes.

## TODO
- Support running in the browser
- Types (PR most welcome!)

## References

See initial discussion here: https://github.com/mjmlio/mjml/discussions/2619


## Other cool MJML packages

- [`mjml-react`](https://github.com/Faire/mjml-react)
- [`mjml-json`](https://github.com/lenfestlab/mjml-json)
- [`react-mailkit`](https://github.com/pavkout/react-mailkit)
- [`easy-email`](https://github.com/zalify/easy-email)

## Release

```
np
```
