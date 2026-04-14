# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## API URL Configuration

The frontend resolves its backend base URL in this order:

1. `VITE_API_URL`
2. `window.__CLEARANCE_API_URL__`
3. `<meta name="clearance-api-url" content="...">`
4. `/api`

In production, set one of the first three options to the deployed backend URL if the API is not hosted on the same origin as the frontend.

## Netlify Hosting

This project includes a Netlify proxy for `/api/*`.

- Set `API_PROXY_TARGET=https://your-backend-domain.com/api` in Netlify environment variables.
- Redeploy after setting the variable.
- Keep frontend requests on `/api`.
