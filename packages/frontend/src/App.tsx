import { BrowserRouter, Route, Routes } from "react-router"
import { Layout } from "./components/layout/Layout"
import { CartProvider } from "./context/CartProvider"
import { AdminProductsPage } from "./pages/admin/AdminProductsPage"
import { NewProductPage } from "./pages/admin/NewProductPage"
import { CartPage } from "./pages/CartPage"
import { CatalogPage } from "./pages/CatalogPage"
import { CheckoutPage } from "./pages/CheckoutPage"
import { HomePage } from "./pages/HomePage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { ProductPage } from "./pages/ProductPage"

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="disco/:id" element={<ProductPage />} />
            <Route path="carrito" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="admin/productos" element={<AdminProductsPage />} />
            <Route path="admin/productos/nuevo" element={<NewProductPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App
