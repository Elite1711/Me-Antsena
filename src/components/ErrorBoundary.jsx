import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, showDetails: false };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Me-Antsena UI error:", error, info); }
  reload = () => window.location.reload();
  toggleDetails = () => this.setState(s => ({ showDetails: !s.showDetails }));
  copyDetails = async () => {
    try {
      const payload = `${this.state.error?.toString() || ''}\n\n${this.state.error?.stack || ''}`;
      await navigator.clipboard.writeText(payload);
      alert('Détails copiés dans le presse-papiers');
    } catch (error) {
      console.error('Impossible de copier les détails du crash', error);
      alert('Impossible de copier — ouvrez la console pour voir les détails');
    }
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="grid min-h-screen place-items-center bg-[#FBF6EF] p-6 text-center dark:bg-[#17110A]"><div className="card max-w-md p-6 text-left"><div className="text-center"><p className="text-5xl font-black text-brand-500">Oups !</p><h1 className="mt-3 text-2xl font-black">Une erreur est survenue</h1><p className="mt-2 text-sm muted">L’interface a rencontré un problème. Vos données locales n’ont pas été supprimées.</p></div>
      <div className="mt-4 flex gap-2">
        <button onClick={this.reload} className="btn-primary">Recharger l’application</button>
        <button onClick={this.toggleDetails} className="btn-secondary">{this.state.showDetails? 'Masquer les détails' : 'Afficher les détails'}</button>
        <button onClick={this.copyDetails} className="btn-ghost">Copier les détails</button>
      </div>
      {this.state.showDetails && <pre className="mt-4 max-h-64 overflow-auto rounded border bg-slate-50 p-3 text-xs dark:bg-[#17110A]">{String(this.state.error && (this.state.error.stack || this.state.error))}</pre>}
    </div></div>;
  }
}
