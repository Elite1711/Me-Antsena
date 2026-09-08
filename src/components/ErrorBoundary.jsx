import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("Me-Antsena UI error:", error); }
  reload = () => window.location.reload();
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="grid min-h-screen place-items-center bg-[#FFF1F1] p-6 text-center dark:bg-[#17002d]"><div className="card max-w-md p-8"><p className="text-5xl font-black text-brand-500">Oups !</p><h1 className="mt-3 text-2xl font-black">Une erreur est survenue</h1><p className="mt-2 text-sm muted">L’interface a rencontré un problème. Vos données locales n’ont pas été supprimées.</p><button onClick={this.reload} className="btn-primary mt-6">Recharger l’application</button></div></div>;
  }
}
