import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { OrdersProvider } from "./context/OrdersContext";
import { SettingsProvider } from "./context/SettingsContext";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <FavoritesProvider>
              <OrdersProvider>
                <CartProvider>
                  <App />
                  <Toaster position="top-right" toastOptions={{
              duration: 2800,
              style: { borderRadius: "14px", fontSize: "14px" }
                  }} />
                </CartProvider>
              </OrdersProvider>
            </FavoritesProvider>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
