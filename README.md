# dubas.us

A minimalist website for visual artist Tamila Dubas.

## Local development

Node.js 24 is required.

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

The digital business card is available at `/card`, the artwork catalog at
`/portfolio`, and contact details at `/contact`. Visiting `/` opens the card
through React Router.

## Interaction design

Phone and tablet layouts are touch-first: primary actions use at least a
44-pixel target, never depend on hover, and keep safe-area spacing. Desktop
layouts preserve visible keyboard focus and use space more compactly for mouse
and keyboard interaction.

## Content

Public content is stored outside `src`:

```text
content/
├── info/data.json
├── portfolio/
│   └── {work-id}/data.json
└── images/
    ├── portrait/
    │   ├── data.json
    │   └── original.jpg
    ├── portfolio-{id}/
    │   ├── data.json
    │   └── original.jpg
    └── signature/
        ├── data.json
        └── original.svg
```

During development, content is served from `/content/*`. The production build
generates responsive image variants, derives `/content/portfolio/data.json`
from the individual work records, and copies the public content API to
`dist/content/*`. The contact page creates a downloadable vCard in the browser
from the same author data.

## Verification

```bash
npm run lint
npm run build
npm run test:performance
```

Pushing to `main` deploys `dist` through GitHub Pages.
