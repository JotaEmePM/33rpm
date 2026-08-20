import type { RouteObject } from "react-router"
import { RequireAdmin } from "../components/auth/RequireAdmin"
import { Layout } from "../components/layout/Layout"
import { RouteError } from "../components/RouteError"
import { AdminProductsPage } from "../pages/admin/AdminProductsPage"
import { NewProductPage } from "../pages/admin/NewProductPage"
import { CartPage } from "../pages/CartPage"
import { CatalogPage } from "../pages/CatalogPage"
import { CheckoutPage } from "../pages/CheckoutPage"
import { HomePage } from "../pages/HomePage"
import { LoginPage } from "../pages/LoginPage"
import { NotFoundPage } from "../pages/NotFoundPage"
import { ProductPage } from "../pages/ProductPage"
import { catalogLoader, releaseLoader } from "./loaders"

/** El árbol vive aparte para poder montarlo también en un memory router. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "catalogo",
        element: <CatalogPage />,
        loader: catalogLoader,
        errorElement: <RouteError />,
      },
      {
        path: "disco/:id",
        element: <ProductPage />,
        loader: releaseLoader,
        errorElement: <RouteError />,
      },
      { path: "login", element: <LoginPage /> },
      { path: "carrito", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      {
        path: "admin/productos",
        element: (
          <RequireAdmin>
            <AdminProductsPage />
          </RequireAdmin>
        ),
      },
      {
        path: "admin/productos/nuevo",
        element: (
          <RequireAdmin>
            <NewProductPage />
          </RequireAdmin>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
