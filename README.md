# Pulse Dashboard

This is a modern, executive-style dashboard for monitoring customer data health, built with Next.js, shadcn/ui, Lucide React icons, and Tailwind CSS. It visualizes key metrics from the `vibe_data.csv` dataset.

## Prerequisites
- Node.js (v18 or later recommended)
- npm (v9 or later)

## 1. Install dependencies
Navigate to the project directory and install dependencies:

```bash
cd pulse-dashboard
npm install
```

## 2. Start the development server
Run the following command to start the app locally:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 3. Project structure
- `public/` — Contains the logo images and `vibe_data.csv` dataset
- `src/app/` — Main app pages and layout
- `src/components/` — UI components (shadcn/ui)

## 4. Troubleshooting
- If you see errors about missing dependencies, run `npm install` again.
- If you change the CSV file, restart the dev server to reload data.
- For issues with shadcn/ui, see [shadcn/ui docs](https://ui.shadcn.com/docs/installation/next)

## 5. Customization
- To change the logo, replace the image in `public/vibe_logo_darkmode.png`.
- To update the dataset, replace `public/vibe_data.csv`.

---

For further help, open an issue or contact the developer.
