// RouterProvider debe venir de "react-router/dom": es el único que dispara
// document.startViewTransition() en las navegaciones marcadas con `viewTransition`.
import { RouterProvider } from "react-router/dom"
import { CartProvider } from "./context/CartProvider"
import { FlyToCartProvider } from "./context/FlyToCartProvider"
import { WishlistProvider } from "./context/WishlistProvider"
import { router } from "./router"

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <FlyToCartProvider>
          <RouterProvider router={router} />
        </FlyToCartProvider>
      </WishlistProvider>
    </CartProvider>
  )
}

export default App
