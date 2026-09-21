import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return <div className="page-shell"><Header/><main className="pb-24 md:pb-8"><Outlet/></main><BottomNav/></div>;
}
