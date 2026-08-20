import type { RouteObject } from "react-router"
import { RequireAdmin } from "../components/auth/RequireAdmin"
import { Layout } from "../components/layout/Layout"
import { RouteError } from "../components/RouteError"
import { AdminProductsPage } from "../pages/admin/AdminProductsPage"
import { EditProductPage } from "../pages/admin/EditProductPage"
import { NewProductPage } from "../pages/admin/NewProductPage"
import { PhotosPage } from "../pages/admin/PhotosPage"
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
      {
        path: "admin/productos/:id",
        element: (
          <RequireAdmin>
            <EditProductPage />
          </RequireAdmin>
        ),
      },
      {
        path: "admin/fotos",
        element: (
          <RequireAdmin>
            <PhotosPage />
          </RequireAdmin>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
