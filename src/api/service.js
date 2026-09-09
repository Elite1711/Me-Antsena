import { supabase } from '../lib/supabase';

const CATEGORY_ICONS = { 'Électronique':'💻','Mode':'👕','Maison':'🏠','Sports':'⚽','Livres':'📚','Bijoux':'💍','Beauté':'💄','Auto':'🚗','Alimentation':'🛒' };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
const PRODUCT_SELECT = 'id,name,description,price,stock,category_id,images,tags,created_at,category:categories(id,name,icon)';
const mapProduct = p => ({ id:p.id,name:p.name,description:p.description||'',price:Number(p.price),oldPrice:0,category:p.category?.name||'Autres',categoryId:p.category_id??null,rating:Number(p.average_rating)||0,reviews:Number(p.review_count)||0,stock:Number(p.stock)||0,image:Array.isArray(p.images)&&p.images[0]?p.images[0]:FALLBACK_IMAGE,images:Array.isArray(p.images)?p.images:[],tags:Array.isArray(p.tags)?p.tags:[] });
const mapReview = r => ({ id:r.id,rating:Number(r.rating),comment:r.comment||'',author:`${r.profile?.first_name||''} ${r.profile?.last_name||''}`.trim()||'Client',date:new Date(r.created_at).toLocaleDateString('fr-FR') });
const STATUS_LABELS={pending:'En cours',paid:'Payée',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'};
const STATUS_VALUES=Object.fromEntries(Object.entries(STATUS_LABELS).map(([k,v])=>[v,k]));

async function ensureOk({data,error}) { if(error) throw new Error(error.message); return data; }
export async function getCategories(){ const {data,error}=await supabase.from('categories').select('id,name,icon,products(count)').order('id'); if(error) throw new Error(error.message); return data.map(c=>({id:c.id,name:c.name,icon:c.icon||CATEGORY_ICONS[c.name]||'🏷️',count:c.products?.[0]?.count||0})); }
export async function getProducts(params={}) { let q=supabase.from('products').select(`${PRODUCT_SELECT},reviews(rating)`).gt('stock',0); if(params.q) q=q.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`); if(params.minPrice) q=q.gte('price',Number(params.minPrice)); if(params.maxPrice) q=q.lte('price',Number(params.maxPrice)); if(params.category){const cats=await getCategories();const c=cats.find(x=>x.name===params.category);if(c)q=q.eq('category_id',c.id);} const sort={priceAsc:['price',true],priceDesc:['price',false],newest:['created_at',false],rating:['created_at',false]}[params.sort]||['created_at',false]; q=q.order(sort[0],{ascending:sort[1]}).limit(60); const {data,error}=await q; if(error) throw new Error(error.message); return (data||[]).map(p=>({...mapProduct(p),rating:p.reviews?.length?p.reviews.reduce((a,r)=>a+Number(r.rating),0)/p.reviews.length:0,reviews:p.reviews?.length||0})); }
export async function getProduct(id){ const {data,error}=await supabase.from('products').select(`${PRODUCT_SELECT},reviews(rating)`).eq('id',id).single(); if(error) return null; return {...mapProduct(data),rating:data.reviews?.length?data.reviews.reduce((a,r)=>a+Number(r.rating),0)/data.reviews.length:0,reviews:data.reviews?.length||0}; }
export async function getRecommendations(){
  try {
    const mlBase = (import.meta.env.VITE_ML_API_URL || 'http://localhost:8000').replace(/\/$/, '');
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'demo-user';
    const res = await fetch(`${mlBase}/recommendations/${encodeURIComponent(userId)}?limit=6`);
    if (res.ok) {
      const json = await res.json();
      return {
        collaborative: (json.collaborative || []).map(item => ({ ...item, image: item.image || item.images?.[0] || FALLBACK_IMAGE, rating: Number(item.rating || 0), reviews: Number(item.reviews || 0) })),
        content: (json.content || []).map(item => ({ ...item, image: item.image || item.images?.[0] || FALLBACK_IMAGE, rating: Number(item.rating || 0), reviews: Number(item.reviews || 0) })),
        hybrid: (json.hybrid || []).map(item => ({ ...item, image: item.image || item.images?.[0] || FALLBACK_IMAGE, rating: Number(item.rating || 0), reviews: Number(item.reviews || 0) }))
      };
    }
  } catch {}

  try {
    const products = await getProducts({ sort: 'rating' });
    return { collaborative: products.slice(0, 3), content: products.slice(3, 6), hybrid: products.slice(0, 4) };
  } catch {
    return { collaborative: [], content: [], hybrid: [] };
  }
}

export async function getMLEval(limit = 5){
  try{
    const mlBase = (import.meta.env.VITE_ML_API_URL || 'http://localhost:8000').replace(/\/$/, '');
    const res = await fetch(`${mlBase}/eval?limit=${Number(limit)}`);
    if(res.ok) return await res.json();
  }catch(e){/* ignore */}
  return null;
}
export async function logInteraction(productId,type,value){ const {data:{user}}=await supabase.auth.getUser(); if(!user)return; await supabase.from('interactions').insert({user_id:user.id,product_id:productId,type,value:value==null?null:Number(value)}); }
export async function getFavorites(){ const {data,error}=await supabase.from('favorites').select(`product:products(${PRODUCT_SELECT},reviews(rating))`).order('created_at',{ascending:false}); if(error) throw new Error(error.message); return data.map(x=>mapProduct(x.product)); }
export const addFavorite=productId=>supabase.from('favorites').insert({product_id:productId}).then(ensureOk);
export const removeFavorite=productId=>supabase.from('favorites').delete().eq('product_id',productId).then(ensureOk);
export async function getProductReviews(productId){ const {data,error}=await supabase.from('reviews').select('id,rating,comment,created_at,profile:profiles(first_name,last_name)').eq('product_id',productId).order('created_at',{ascending:false}); if(error) throw new Error(error.message); return data.map(mapReview); }
export async function submitReview(productId,{rating,comment}){ const {data,error}=await supabase.from('reviews').upsert({product_id:productId,rating:Number(rating),comment:comment?.trim()||null},{onConflict:'user_id,product_id'}).select('id,rating,comment,created_at').single(); if(error) throw new Error(error.message); return data; }
const mapOrder=o=>({id:`CMD-${o.id}`,rawId:o.id,status:STATUS_LABELS[o.status]||o.status,total:Number(o.total),date:new Date(o.created_at).toLocaleDateString('fr-FR'),customer:o.profile?`${o.profile.first_name||''} ${o.profile.last_name||''}`.trim():'',email:o.profile?.email||'',items:(o.order_items||[]).map(i=>({id:i.product_id,name:i.product_name,price:Number(i.unit_price),quantity:i.quantity}))});
export async function getMyOrders(){ const {data,error}=await supabase.from('orders').select('id,total,status,created_at,profile:profiles(first_name,last_name,email),order_items(product_id,product_name,unit_price,quantity)').order('created_at',{ascending:false}); if(error) throw new Error(error.message); return data.map(mapOrder); }
export const mapStatusLabel=s=>STATUS_LABELS[s]||s; export const mapStatusValue=s=>STATUS_VALUES[s]||'pending';
export async function createOrder({items,address,paymentMethod,deliveryMethod}){ let addressId=null; if(address?.trim()){const {data,error}=await supabase.from('addresses').insert({label:'Livraison',street:address.trim()}).select('id').single();if(error)throw new Error(error.message);addressId=data.id;} const {data,error}=await supabase.rpc('create_order',{p_items:items.map(i=>({product_id:i.id,quantity:i.quantity})),p_address_id:addressId,p_payment_method:paymentMethod||null,p_delivery_method:deliveryMethod||null}); if(error)throw new Error(error.message); return {id:`CMD-${data.id}`,rawId:data.id}; }
export async function getDashboardStats(opts = {}){
  // Fetch orders with order items so we can compute reliable sales figures
  const [u,o,p,i]=await Promise.all([
    supabase.from('profiles').select('id',{count:'exact',head:true}).eq('role','user'),
    supabase.from('orders').select('id,status,created_at,order_items(unit_price,quantity)'),
    supabase.from('products').select('id,stock',{count:'exact'}),
    supabase.from('interactions').select('type')
  ]);

  const orders = o.data || [];
  const interactions = i.data || [];

  // Normalize status checks: accept both raw keys and French labels
  const isDelivered = s => {
    if (!s) return false;
    const norm = String(s).toLowerCase();
    return ['delivered','livree','livré','livrée'].includes(norm) || norm === 'delivered';
  };

  // Compute sales from order_items when available, otherwise fallback to 0
  const orderSales = orders.map(order => {
    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length) {
      return order.order_items.reduce((sum, it) => sum + (Number(it.unit_price || 0) * Number(it.quantity || 0)), 0);
    }
    return 0;
  });

  const deliveredOrdersIdx = orders.map((o, idx) => ({ o, idx })).filter(({ o }) => isDelivered(o.status));
  const sales = deliveredOrdersIdx.reduce((sum, { idx }) => sum + (orderSales[idx] || 0), 0);

  const users = u.count || 0;
  const conversion = users ? Number((deliveredOrdersIdx.length / users * 100).toFixed(1)) : 0;
  const views = interactions.filter(x => x.type === 'view').length;
  const carts = interactions.filter(x => x.type === 'add_to_cart').length;

  // Daily sales for the last N days (relative to now). Default: 30 days.
  const now = new Date();
  const DAYS = Number(opts.days) || 30;
  const days = Array.from({ length: DAYS }).map((_, i) => {
    // create a date for each day in the window (preserve local date)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS - 1 - i));
    return d;
  });

  const chart = days.map(daily => {
    let sum = 0;
    orders.forEach((ord, idx) => {
      const dt = ord.created_at ? new Date(ord.created_at) : null;
      if (!dt) return;
      if (dt.getFullYear() === daily.getFullYear() && dt.getMonth() === daily.getMonth() && dt.getDate() === daily.getDate() && isDelivered(ord.status)) {
        sum += (orderSales[idx] || 0);
      }
    });
    return sum;
  });

  return {
    sales,
    users,
    orders: orders.length,
    conversion,
    ctr: views ? Number((carts / views * 100).toFixed(1)) : 0,
    lowStock: (p.data || []).filter(x => x.stock < 15).length,
    chart
  };
}

export async function adminGetProducts(){const {data,error}=await supabase.from('products').select(`${PRODUCT_SELECT},reviews(rating)`).order('created_at',{ascending:false});if(error)throw new Error(error.message);return data.map(p=>({...mapProduct(p),rating:p.reviews?.length?p.reviews.reduce((a,r)=>a+Number(r.rating),0)/p.reviews.length:0,reviews:p.reviews?.length||0,__existing:true}));}
async function uploadProductImage(image){ if(!image||!image.startsWith('data:'))return image||null; const res=await fetch(image);const blob=await res.blob();const ext=blob.type.split('/')[1]||'jpg';const path=`${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('product-images').upload(path,blob,{contentType:blob.type,upsert:false});if(error)throw new Error(error.message);const {data}=supabase.storage.from('product-images').getPublicUrl(path);return data.publicUrl; }
export async function adminSaveProduct(form){const cats=await getCategories();const cat=cats.find(c=>c.name===form.category);const image=await uploadProductImage(form.image);const payload={name:form.name.trim(),description:form.description||'',price:Number(form.price)||0,category_id:cat?.id||null,stock:Number(form.stock)||0,images:image?[image]:[],tags:Array.isArray(form.tags)?form.tags:[]};let result;if(form.id&&form.__existing)result=await supabase.from('products').update(payload).eq('id',form.id).select(`${PRODUCT_SELECT}`).single();else result=await supabase.from('products').insert(payload).select(`${PRODUCT_SELECT}`).single();if(result.error)throw new Error(result.error.message);return mapProduct(result.data);}
export const adminDeleteProduct=id=>supabase.from('products').delete().eq('id',id).then(ensureOk);
export async function adminGetUsers(){const {data,error}=await supabase.from('profiles').select('id,first_name,last_name,email,phone,role,status,created_at').order('created_at',{ascending:false});if(error)throw new Error(error.message);return data.map(u=>({id:u.id,name:`${u.first_name} ${u.last_name}`.trim(),email:u.email,status:u.status==='active'?'Actif':'Suspendu',role:u.role,createdAt:u.created_at}));}
export const adminSetUserStatus=async(id,status)=>{const {data,error}=await supabase.rpc('admin_set_user_status',{p_user_id:id,p_status:status==='Actif'?'active':'suspended'});if(error)throw new Error(error.message);return data;};
export async function adminGetOrders(){const {data,error}=await supabase.from('orders').select('id,total,status,created_at,profile:profiles(first_name,last_name,email),order_items(product_id,product_name,unit_price,quantity)').order('created_at',{ascending:false});if(error)throw new Error(error.message);return data.map(mapOrder);}
export const adminUpdateOrderStatus=async(rawId,statusLabel)=>{
  const nextStatus = mapStatusValue(statusLabel);
  const { data: currentOrder, error: currentError } = await supabase.from('orders').select('id,status').eq('id', rawId).single();
  if (currentError) throw new Error(currentError.message);
  if (currentOrder.status === 'delivered' && nextStatus !== 'delivered') {
    throw new Error('La commande livrée ne peut plus être modifiée.');
  }

  if (nextStatus === 'cancelled' && currentOrder.status !== 'cancelled') {
    const { data: items, error: itemsError } = await supabase.from('order_items').select('product_id,quantity').eq('order_id', rawId);
    if (itemsError) throw new Error(itemsError.message);

    for (const item of items || []) {
      if (!item.product_id) continue;
      const { data: product, error: productError } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      if (productError) throw new Error(productError.message);
      const restoredStock = Number(product.stock || 0) + Number(item.quantity || 0);
      const { error: updateError } = await supabase.from('products').update({ stock: restoredStock, updated_at: new Date().toISOString() }).eq('id', item.product_id);
      if (updateError) throw new Error(updateError.message);
    }
  }

  const { data, error } = await supabase.from('orders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', rawId).select().single();
  if (error) throw new Error(error.message);
  return data;
};
