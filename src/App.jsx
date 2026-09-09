import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import UserOnlyRoute from "./components/UserOnlyRoute";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Categories from "./pages/Categories";
import Recommendations from "./pages/Recommendations";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Favorites from "./pages/Favorites";
import Notifications from "./pages/Notifications";

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/reset-password" element={<ResetPassword/>}/>
    <Route element={<UserOnlyRoute/>}>
      <Route element={<AppLayout/>}>
        <Route path="/" element={<Home/>}/>
        <Route path="/products" element={<Products/>}/>
        <Route path="/products/:id" element={<ProductDetail/>}/>
        <Route path="/categories" element={<Categories/>}/>
        <Route path="/recommendations" element={<Recommendations/>}/>
        <Route path="/favorites" element={<Favorites/>}/>
        <Route path="/notifications" element={<Notifications/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/checkout" element={<ProtectedRoute><Checkout/></ProtectedRoute>}/>
        <Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/>
      </Route>
    </Route>
    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout/></ProtectedRoute>}>
      <Route index element={<AdminDashboard/>}/>
      <Route path="produits" element={<AdminDashboard/>}/>
      <Route path="commandes" element={<AdminDashboard/>}/>
      <Route path="utilisateurs" element={<AdminDashboard/>}/>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}
