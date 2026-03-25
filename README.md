# Metrics

A single-page Bitcoin dashboard built with Astro, Tailwind CSS v4, and TypeScript. Displays live price, market context, and a 24-hour sparkline chart using data from Binance and CoinGecko.

## Commands

All commands are run from the root of the project:

| Command             | Action                                      |
| :------------------ | :------------------------------------------ |
| `npm install`       | Install dependencies                        |
| `npm run dev`       | Start local dev server at `localhost:4321`   |
| `npm run build`     | Build production site to `./dist/`           |
| `npm run preview`   | Preview build locally before deploying       |
| `npm run test`      | Run unit tests with Vitest                   |
| `npm run lint`      | Lint source files with ESLint                |
| `npm run format`    | Format source files with Prettier            |

## Tech Stack

- **Astro 6.x** — static site generator with Islands Architecture
- **Tailwind CSS v4** — utility-first CSS via Vite plugin
- **TypeScript** — strict mode
- **Vitest** — unit testing
- **nanostores** — lightweight state management
- **lightweight-charts** — financial charting library
