# dubas.us

A minimalist digital business card for visual artist Tamila Dubas.

## Local development

Node.js 24 is required.

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

The digital business card is available at `/card`. Visiting `/` also opens the
card through React Router.

## Content

Public content is stored outside `src`:

```text
content/
├── info/data.json
└── images/
    ├── portrait/
    │   ├── data.json
    │   └── original.jpg
    └── signature/
        ├── data.json
        └── original.svg
```

During development, content is served from `/content/*`. The production build
generates responsive WebP variants of the portrait and copies public content
to `dist/content/*`.

## Verification

```bash
npm run lint
npm run build
npm run test:performance
```

Pushing to `main` deploys `dist` through GitHub Pages.
