import React, { useState, useEffect } from 'react';
import { productStore, transactionStore, initDB } from './db';
import Receipt from './Receipt';
import { exportTransactionsToExcel } from './exportExcel';
import { ShoppingCart, Trash2, Download, PlusCircle } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cashGiven, setCashGiven] = useState('');
  const [search, setSearch] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');

  useEffect(() => {
    initDB().then(loadProducts);
  }, []);

  const loadProducts = async () => {
    const list = [];
    await productStore.iterate((val) => { list.push(val); });
    setProducts(list);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock) return alert('Lengkapi data produk');
    
    const id = Date.now().toString();
    const newProduct = {
      id,
      name: newProdName,
      price: Number(newProdPrice),
      stock: Number(newProdStock)
    };
    
    await productStore.setItem(id, newProduct);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    loadProducts();
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return alert('Stok produk habis!');
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        if (exists.qty + 1 > product.stock) {
          alert('Jumlah melebihi stok yang ada');
          return prev;
        }
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.id !== id));

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const change = Number(cashGiven) >= total ? Number(cashGiven) - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang belanja kosong');
    if (Number(cashGiven) < total) return alert('Uang pembayaran kurang!');

    const transactionData = {
      id: 'TRX-' + Date.now(),
      date: new Date().toISOString(),
      items: [...cart],
      total,
      cash: Number(cashGiven),
      change
    };

    for (const item of cart) {
      const p = await productStore.getItem(item.id);
      if (p) {
        await productStore.setItem(p.id, { ...p, stock: p.stock - item.qty });
      }
    }

    await transactionStore.setItem(transactionData.id, transactionData);
    setLastReceipt(transactionData);

    setTimeout(() => {
      window.print();
    }, 300);

    setCart([]);
    setCashGiven('');
    loadProducts();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh', fontFamily: 'sans-serif', background: '#f1f5f9' }}>
      <div style={{ padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b' }}>Niaganta POS</h1>
          <button 
            onClick={exportTransactionsToExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Download size={16} /> Ekspor Excel
          </button>
        </div>

        <form onSubmit={handleAddProduct} style={{ background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Nama Barang" 
            value={newProdName} 
            onChange={(e) => setNewProdName(e.target.value)}
            style={{ flex: 2, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
          />
          <input 
            type="number" 
            placeholder="Harga (Rp)" 
            value={newProdPrice} 
            onChange={(e) => setNewProdPrice(e.target.value)}
            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
          />
          <input 
            type="number" 
            placeholder="Stok" 
            value={newProdStock} 
            onChange={(e) => setNewProdStock(e.target.value)}
            style={{ width: '80px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
          />
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <PlusCircle size={16} /> Tambah
          </button>
        </form>

        <input 
          type="text" 
          placeholder="Cari barang di katalog..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
          {products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)}
              style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: '600', color: '#334155', fontSize: '15px' }}>{p.name}</div>
              <div style={{ color: '#0284c7', fontWeight: 'bold', margin: '6px 0', fontSize: '16px' }}>Rp {p.price.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '12px', color: p.stock > 5 ? '#64748b' : '#ef4444' }}>
                Stok: {p.stock}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderLeft: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
            <ShoppingCart size={20} /> Kasir
          </h2>

          <div style={{ maxHeight: '45vh', overflowY: 'auto', marginTop: '12px' }}>
            {cart.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '30px' }}>Pilih produk di samping</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{item.qty} x Rp {item.price.toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Rp {(item.qty * item.price).toLocaleString('id-ID')}</span>
                    <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => removeFromCart(item.id)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>
              <span>Total Tagihan:</span>
              <strong style={{ fontSize: '18px', color: '#0f172a' }}>Rp {total.toLocaleString('id-ID')}</strong>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '12px', color: '#64748b' }}>Uang Diterima:</label>
              <input 
                type="number" 
                value={cashGiven} 
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="Contoh: 50000"
                style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px' }}>
              <span>Kembalian:</span>
              <strong style={{ color: Number(cashGiven) >= total && total > 0 ? '#10b981' : '#64748b' }}>
                Rp {change.toLocaleString('id-ID')}
              </strong>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            style={{ width: '100%', padding: '14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
          >
            Bayar & Cetak Nota
          </button>
        </div>
      </div>

      <Receipt data={lastReceipt} />
    </div>
  );
}