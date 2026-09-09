const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const PRODUCTS_STORAGE_KEY = "me-antsena-admin-products";
const DELETED_PRODUCTS_STORAGE_KEY = "me-antsena-admin-deleted-products";

const products = [
  { id: 1, name: "Casque Bluetooth SoundPro X1", price: 120000, oldPrice: 150000, category: "Électronique", rating: 4.6, reviews: 128, stock: 45, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", tags: ["audio","bluetooth","casque"], description: "Casque sans fil confortable avec réduction de bruit, autonomie longue durée et son équilibré." },
  { id: 2, name: "Sac à dos tendance", price: 85000, oldPrice: 0, category: "Mode", rating: 4.4, reviews: 74, stock: 30, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", tags: ["sac","mode","quotidien"], description: "Sac à dos moderne, pratique et résistant pour les études, le travail et les sorties." },
  { id: 3, name: "Montre connectée Fit 3", price: 110000, oldPrice: 135000, category: "Électronique", rating: 4.5, reviews: 91, stock: 20, image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80", tags: ["montre","sport","smartwatch"], description: "Montre connectée avec suivi d'activité, notifications et autonomie optimisée." },
  { id: 4, name: "Lampe LED moderne", price: 45000, oldPrice: 0, category: "Maison", rating: 4.3, reviews: 53, stock: 60, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80", tags: ["lampe","bureau","maison"], description: "Lampe LED minimaliste idéale pour le bureau ou la chambre." },
  { id: 5, name: "Baskets Urban Run", price: 165000, oldPrice: 190000, category: "Sports", rating: 4.7, reviews: 62, stock: 18, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", tags: ["chaussures","sport","running"], description: "Baskets légères pensées pour la marche, le running et un usage quotidien." },
  { id: 6, name: "Montre classique Élégance", price: 98000, oldPrice: 0, category: "Mode", rating: 4.2, reviews: 38, stock: 12, image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80", tags: ["montre","élégance","mode"], description: "Une montre classique au design intemporel." },
  { id: 7, name: "Sneakers Nova", price: 145000, oldPrice: 175000, category: "Sports", rating: 4.5, reviews: 47, stock: 25, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80", tags: ["sneakers","sport","mode"], description: "Sneakers confortables avec semelle souple et style urbain." },
  { id: 8, name: "Sac cuir Premium", price: 185000, oldPrice: 220000, category: "Mode", rating: 4.8, reviews: 29, stock: 8, image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80", tags: ["cuir","sac","premium"], description: "Sac premium avec finition élégante et compartiments pratiques." },
  { id: 9, name: "T-shirt Essential", price: 55000, oldPrice: 65000, category: "Mode", rating: 4.1, reviews: 80, stock: 100, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80", tags: ["tshirt","mode","essentiel"], description: "T-shirt confortable en coton, facile à porter au quotidien." },
  { id: 10, name: "Clavier mécanique", price: 135000, oldPrice: 155000, category: "Électronique", rating: 4.6, reviews: 42, stock: 16, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80", tags: ["clavier","gaming","ordinateur"], description: "Clavier mécanique compact pour le travail et le gaming." }
];

const categories = [
  ["Électronique","💻"],["Mode","👕"],["Maison","🏠"],["Sports","⚽"],["Livres","📚"],["Bijoux","💍"],["Beauté","💄"],["Auto","🚗"]
];

export async function getProducts(params = {}) {
  await wait();
  let result = getStoredProducts();
  const q = (params.q || "").toLowerCase();
  if (q) result = result.filter(p => `${p.name} ${p.description} ${p.category} ${p.tags.join(" ")}`.toLowerCase().includes(q));
  if (params.category) result = result.filter(p => p.category === params.category);
  if (params.minPrice) result = result.filter(p => p.price >= Number(params.minPrice));
  if (params.maxPrice) result = result.filter(p => p.price <= Number(params.maxPrice));
  if (params.minRating) result = result.filter(p => p.rating >= Number(params.minRating));
  if (params.sort === "priceAsc") result.sort((a,b) => a.price-b.price);
  if (params.sort === "priceDesc") result.sort((a,b) => b.price-a.price);
  if (params.sort === "rating") result.sort((a,b) => b.rating-a.rating);
  if (params.sort === "newest") result.reverse();
  return result;
}

export async function getProduct(id) {
  await wait(250);
  return getStoredProducts().find(p => p.id === Number(id)) || null;
}

export async function getCategories() {
  await wait(180);
  const currentProducts = getStoredProducts();
  return categories.map(([name, icon]) => ({ name, icon, count: currentProducts.filter(p => p.category === name).length }));
}

export async function getRecommendations() {
  await wait(300);
  const currentProducts = getStoredProducts();
  return {
    collaborative: currentProducts.slice(0, 3),
    content: currentProducts.slice(3, 6),
    hybrid: currentProducts.slice(0, 4)
  };
}

export async function getDashboardStats() {
  await wait(250);
  const currentProducts = getStoredProducts();
  const rawOrders = localStorage.getItem("me_antsena_orders");
  let currentOrders = [];
  try { currentOrders = rawOrders ? JSON.parse(rawOrders) : []; } catch { currentOrders = []; }
  const completedSales = currentOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  return {
    sales: completedSales || 8750000, users: 1256, orders: currentOrders.length || 320, conversion: 6.4, ctr: 18.6,
    lowStock: currentProducts.filter(p => Number(p.stock) < 15).length,
    chart: [42,55,48,76,68,92,84,108,101,124,116,141],
    products: currentProducts
  };
}

export function getStoredProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    const deletedRaw = localStorage.getItem(DELETED_PRODUCTS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : [];
    const deleted = new Set(deletedRaw ? JSON.parse(deletedRaw) : []);
    return [...saved, ...products.filter((base) => !deleted.has(base.id) && !saved.some((item) => item.id === base.id))];
  } catch {
    return [...products];
  }
}

export function saveAdminProducts(nextProducts) {
  const baseIds = new Set(products.map((p) => p.id));
  const currentIds = new Set(nextProducts.map((p) => p.id));
  const customProducts = nextProducts.filter((p) => !baseIds.has(p.id));
  const editedBaseProducts = nextProducts.filter((p) => baseIds.has(p.id));
  const deletedBaseIds = products.filter((p) => !currentIds.has(p.id)).map((p) => p.id);
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify([...customProducts, ...editedBaseProducts]));
    localStorage.setItem(DELETED_PRODUCTS_STORAGE_KEY, JSON.stringify(deletedBaseIds));
  } catch (error) {
    console.warn("Impossible de sauvegarder les produits localement", error);
  }
}

export const mockProducts = products;
