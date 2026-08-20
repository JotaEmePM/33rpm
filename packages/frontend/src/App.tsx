// RouterProvider debe venir de "react-router/dom": es el único que dispara
// document.startViewTransition() en las navegaciones marcadas con `viewTransition`.
import { RouterProvider } from "react-router/dom"
import { CartProvider } from "./context/CartProvider"
import { FlyToCartProvider } from "./context/FlyToCartProvider"
import { router } from "./router"

function App() {
  return (
    <CartProvider>
      <FlyToCartProvider>
        <RouterProvider router={router} />
      </FlyToCartProvider>
    </CartProvider>
  )
}

export default App
