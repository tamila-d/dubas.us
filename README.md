# dubas.us

Минималистичная визитная карточка художницы Тамилы Дубас.

## Локальная разработка

Требуется Node.js 24.

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Страница визитки доступна по адресу `/card`. Переход на `/` также открывает
визитку через React Router.

## Контент

Публичные данные находятся вне `src`:

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

Во время разработки контент доступен по `/content/*`. Сборка создаёт
адаптивные WebP-варианты портрета и копирует публичный контент в
`dist/content/*`.

## Проверка

```bash
npm run lint
npm run build
npm run test:performance
```

Push в ветку `main` запускает публикацию `dist` через GitHub Pages.
