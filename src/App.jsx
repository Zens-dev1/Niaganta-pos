import React, { useState, useEffect } from 'react';
import { productStore, transactionStore, settingsStore, initDB } from './db';
import Receipt from './Receipt';
import { exportTransactionsToExcel } from './exportExcel';
import { 
  Store, ShoppingBag, PackagePlus, History, Settings,
  Search, Plus, Minus, Trash2, 
  CheckCircle, Printer, RotateCcw, X, CreditCard, Banknote, Image as ImageIcon,
  Download, Edit3, TrendingUp, Save, Calendar
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('kasir'); // 'kasir' | 'produk' | 'riwayat' | 'pengaturan'
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'

  // Profil & Pengaturan Toko
  const [storeInfo, setStoreInfo] = useState({
    storeName: 'Niaganta Pos',
    address: 'Jl. Kediri No. 4',
    phone: '0812-5505-4202',
    footerMsg: 'Terima kasih atas kunjungan Anda!'
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Keranjang & Transaksi
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('tunai'); // 'tunai' | 'qris'
  const [cashGiven, setCashGiven] = useState('');
  const [lastTrx, setLastTrx] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form Tambah Produk
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Minuman',
    sellPrice: '',
    stock: '',
    image: null
  });

  // Modal Edit Produk / Stok
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    initDB().then(() => {
      loadProducts();
      loadTransactions();
      loadSettings();
    });
  }, []);

  const loadProducts = async () => {
    const list = [];
    await productStore.iterate((val) => { list.push(val); });
    setProducts(list);
  };

  const loadTransactions = async () => {
    const list = [];
    await transactionStore.iterate((val) => { list.push(val); });
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    setTransactions(list);
  };

  const loadSettings = async () => {
    const saved = await settingsStore.getItem('storeInfo');
    if (saved) setStoreInfo(saved);
  };

  // Fungsi Cetak Terpadu (Electron IPC / Fallback Browser)
  const triggerPrint = () => {
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('print-receipt');
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const categories = ['Semua', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Hitungan Kasir
  const subtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.qty), 0);
  const change = Number(cashGiven) >= subtotal ? Number(cashGiven) - subtotal : 0;

  // Filter Tanggal Transaksi
  const filteredTransactions = transactions.filter((t) => {
    if (dateFilter === 'all') return true;
    const trxDate = new Date(t.date);
    const now = new Date();
    if (dateFilter === 'today') {
      return trxDate.toDateString() === now.toDateString();
    }
    if (dateFilter === '7days') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      return trxDate >= past7;
    }
    if (dateFilter === '30days') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      return trxDate >= past30;
    }
    return true;
  });

  const totalOmzet = filteredTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalTransaksiCount = filteredTransactions.length;

  const addToCart = (product) => {
    if (product.stock <= 0) return alert('Stok produk habis!');
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        if (exists.qty + 1 > product.stock) {
          alert('Pesanan melebihi stok yang ada!');
          return prev;
        }
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > item.stock) {
          alert('Jumlah melebihi stok!');
          return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.id !== id));

  const handleConfirmPayment = async () => {
    if (paymentMethod === 'tunai' && Number(cashGiven) < subtotal) {
      return alert('Nominal uang tunai masih kurang!');
    }

    const nominalBayar = paymentMethod === 'qris' ? subtotal : Number(cashGiven);
    const nominalKembali = paymentMethod === 'qris' ? 0 : change;

    const trxData = {
      id: 'TRX-' + Date.now(),
      date: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.sellPrice
      })),
      total: subtotal,
      method: paymentMethod.toUpperCase(),
      cash: nominalBayar,
      change: nominalKembali
    };

    for (const item of cart) {
      const p = await productStore.getItem(item.id);
      if (p) {
        await productStore.setItem(p.id, { ...p, stock: p.stock - item.qty });
      }
    }

    await transactionStore.setItem(trxData.id, trxData);
    setLastTrx(trxData);
    setShowPayment(false);
    setShowSuccess(true);
    setCart([]);
    loadProducts();
    loadTransactions();
  };

  const handleReprint = (trx) => {
    setLastTrx(trx);
    setTimeout(() => {
      triggerPrint();
    }, 200);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await settingsStore.setItem('storeInfo', storeInfo);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sellPrice || !newProd.stock) {
      return alert('Lengkapi data produk terlebih dahulu!');
    }

    const id = Date.now().toString();
    const item = {
      id,
      name: newProd.name,
      category: newProd.category || 'Umum',
      sellPrice: Number(newProd.sellPrice),
      stock: Number(newProd.stock),
      image: newProd.image
    };

    await productStore.setItem(id, item);
    setNewProd({ name: '', category: 'Minuman', sellPrice: '', stock: '', image: null });
    loadProducts();
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.name || editingProduct.sellPrice === '' || editingProduct.stock === '') {
      return alert('Data tidak boleh kosong!');
    }

    const updated = {
      ...editingProduct,
      sellPrice: Number(editingProduct.sellPrice),
      stock: Number(editingProduct.stock)
    };

    await productStore.setItem(updated.id, updated);
    setEditingProduct(null);
    loadProducts();
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Hapus produk ini dari daftar?')) {
      await productStore.removeItem(id);
      loadProducts();
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER TOPBAR */}
      <header style={{ background: '#0f172a', color: '#fff', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Store size={22} color="#38bdf8" />
          <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.3px' }}>
            {storeInfo.storeName || 'Niaganta Pos'}
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('kasir')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: activeTab === 'kasir' ? '#38bdf8' : 'transparent',
              color: activeTab === 'kasir' ? '#0f172a' : '#94a3b8'
            }}
          >
            <ShoppingBag size={16} /> Kasir
          </button>
          <button 
            onClick={() => setActiveTab('produk')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: activeTab === 'produk' ? '#38bdf8' : 'transparent',
              color: activeTab === 'produk' ? '#0f172a' : '#94a3b8'
            }}
          >
            <PackagePlus size={16} /> Produk & Stok
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: activeTab === 'riwayat' ? '#38bdf8' : 'transparent',
              color: activeTab === 'riwayat' ? '#0f172a' : '#94a3b8'
            }}
          >
            <History size={16} /> Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('pengaturan')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: activeTab === 'pengaturan' ? '#38bdf8' : 'transparent',
              color: activeTab === 'pengaturan' ? '#0f172a' : '#94a3b8'
            }}
          >
            <Settings size={16} /> Pengaturan
          </button>
        </nav>
      </header>

      {/* KONTEN UTAMA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* TAB 1: KASIR */}
        {activeTab === 'kasir' && (
          <>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Cari nama barang..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{ 
                      padding: '6px 14px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                      borderColor: selectedCategory === cat ? '#0f172a' : '#e2e8f0',
                      background: selectedCategory === cat ? '#0f172a' : '#fff',
                      color: selectedCategory === cat ? '#fff' : '#64748b'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
                {filteredProducts.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{ 
                      background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: '110px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={26} color="#cbd5e1" />
                      )}
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: p.stock > 5 ? '#64748b' : '#ef4444', marginTop: '2px' }}>
                          Stok: {p.stock} {p.stock === 0 && '(Habis)'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7' }}>
                          Rp {p.sellPrice.toLocaleString('id-ID')}
                        </span>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PANEL KERANJANG */}
            <aside style={{ width: '320px', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>Pesanan Saat Ini</span>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>
                    Reset
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px', fontSize: '13px' }}>
                    Belum ada menu yang dipilih
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #f1f5f9' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Rp {item.sellPrice.toLocaleString('id-ID')}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7', marginTop: '2px' }}>
                          Rp {(item.qty * item.sellPrice).toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateCartQty(item.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}><Minus size={12} /></button>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '16px', textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}><Plus size={12} /></button>
                        <Trash2 size={14} color="#ef4444" style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => removeFromCart(item.id)} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Total Tagihan:</span>
                  <strong style={{ fontSize: '18px', color: '#0f172a' }}>Rp {subtotal.toLocaleString('id-ID')}</strong>
                </div>
                <button 
                  onClick={() => {
                    if (cart.length === 0) return alert('Keranjang masih kosong!');
                    setPaymentMethod('tunai');
                    setCashGiven('');
                    setShowPayment(true);
                  }}
                  style={{ 
                    width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', 
                    fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '8px'
                  }}
                >
                  Bayar Sekarang
                </button>
              </div>
            </aside>
          </>
        )}

        {/* TAB 2: KELOLA PRODUK & STOK */}
        {activeTab === 'produk' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>Tambah Produk Baru</h3>
                <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Nama Produk" 
                    value={newProd.name} 
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    style={{ flex: 2, minWidth: '150px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                  />
                  <input 
                    type="text" 
                    placeholder="Kategori" 
                    value={newProd.category} 
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    style={{ flex: 1, minWidth: '110px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                  />
                  <input 
                    type="number" 
                    placeholder="Harga (Rp)" 
                    value={newProd.sellPrice} 
                    onChange={(e) => setNewProd({ ...newProd, sellPrice: e.target.value })}
                    style={{ width: '110px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                  />
                  <input 
                    type="number" 
                    placeholder="Stok" 
                    value={newProd.stock} 
                    onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    style={{ width: '70px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }} 
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', background: newProd.image ? '#dcfce7' : '#f1f5f9', border: '1px solid #cbd5e1', padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: newProd.image ? '#166534' : '#475569' }}>
                    <ImageIcon size={14} /> {newProd.image ? 'Foto Siap' : 'Foto'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e.target.files[0], (data) => setNewProd(p => ({ ...p, image: data })))} />
                  </label>

                  <button type="submit" style={{ padding: '8px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                    Simpan
                  </button>
                </form>
              </div>

              {/* Tabel Daftar Produk */}
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Foto</th>
                      <th style={{ padding: '10px 14px' }}>Nama Produk</th>
                      <th style={{ padding: '10px 14px' }}>Kategori</th>
                      <th style={{ padding: '10px 14px' }}>Harga</th>
                      <th style={{ padding: '10px 14px' }}>Stok</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px' }}>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: '600' }}>{p.name}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.category}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>Rp {p.sellPrice.toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px 14px', color: p.stock > 5 ? '#10b981' : '#ef4444', fontWeight: '600' }}>{p.stock}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setEditingProduct({ ...p })} 
                            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0284c7', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p.id)} 
                            style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RIWAYAT TRANSAKSI & LAPORAN */}
        {activeTab === 'riwayat' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto' }}>
              
              {/* Filter Rentang Tanggal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                  <Calendar size={16} />
                  <span style={{ fontWeight: '500' }}>Rentang Waktu:</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: 'Semua', val: 'all' },
                    { label: 'Hari Ini', val: 'today' },
                    { label: '7 Hari Terakhir', val: '7days' },
                    { label: '30 Hari Terakhir', val: '30days' }
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setDateFilter(btn.val)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        borderColor: dateFilter === btn.val ? '#0284c7' : '#cbd5e1',
                        background: dateFilter === btn.val ? '#e0f2fe' : '#fff',
                        color: dateFilter === btn.val ? '#0369a1' : '#475569'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ringkasan Omzet Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Total Pendapatan (Omzet)</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Rp {totalOmzet.toLocaleString('id-ID')}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Jumlah Transaksi Selesai</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{totalTransaksiCount} Transaksi</div>
                  </div>
                  <button 
                    onClick={exportTransactionsToExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#194436', color: '#fff', padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    <Download size={14} /> Ekspor Excel
                  </button>
                </div>
              </div>

              {/* Tabel Riwayat */}
              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>No. Transaksi</th>
                      <th style={{ padding: '10px 14px' }}>Tanggal & Jam</th>
                      <th style={{ padding: '10px 14px' }}>Metode</th>
                      <th style={{ padding: '10px 14px' }}>Total Tagihan</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Belum ada transaksi di rentang waktu ini</td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b' }}>{t.id}</td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: t.method === 'QRIS' ? '#e0f2fe' : '#ecfdf5', color: t.method === 'QRIS' ? '#0369a1' : '#047857' }}>
                              {t.method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#0f172a' }}>
                            Rp {t.total.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <button 
                              onClick={() => handleReprint(t)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: '#0f172a' }}
                            >
                              <Printer size={12} /> Cetak Ulang
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PENGATURAN TOKO & STRUK */}
        {activeTab === 'pengaturan' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Store size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>Profil Toko & Struk Kasir</h3>
              </div>
              
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Nama Toko / Usaha:</label>
                  <input 
                    type="text" 
                    value={storeInfo.storeName} 
                    onChange={(e) => setStoreInfo({ ...storeInfo, storeName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Alamat Toko:</label>
                  <input 
                    type="text" 
                    value={storeInfo.address} 
                    onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Nomor Telepon / WhatsApp:</label>
                  <input 
                    type="text" 
                    value={storeInfo.phone} 
                    onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Pesan Footer Struk:</label>
                  <input 
                    type="text" 
                    value={storeInfo.footerMsg} 
                    onChange={(e) => setStoreInfo({ ...storeInfo, footerMsg: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                {settingsSaved && (
                  <div style={{ padding: '8px 12px', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                    ✓ Profil toko berhasil disimpan!
                  </div>
                )}

                <button 
                  type="submit" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}
                >
                  <Save size={16} /> Simpan Pengaturan
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT PRODUK / STOK */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', width: '380px', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Edit Produk & Stok</h3>
              <X size={18} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setEditingProduct(null)} />
            </div>

            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Nama Produk:</label>
                <input 
                  type="text" 
                  value={editingProduct.name} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Harga Jual (Rp):</label>
                <input 
                  type="number" 
                  value={editingProduct.sellPrice} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Jumlah Stok Tersedia:</label>
                <input 
                  type="number" 
                  min="0"
                  value={editingProduct.stock} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, padding: '9px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  Batal
                </button>
                <button type="submit" style={{ flex: 2, padding: '9px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PEMBAYARAN */}
      {showPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', width: '380px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '16px 20px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>TOTAL PEMBAYARAN</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8' }}>
                  Rp {subtotal.toLocaleString('id-ID')}
                </div>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowPayment(false)} />
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <button 
                  type="button"
                  onClick={() => { setPaymentMethod('tunai'); setCashGiven(''); }}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                    border: paymentMethod === 'tunai' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: paymentMethod === 'tunai' ? '#f0f9ff' : '#fff',
                    color: paymentMethod === 'tunai' ? '#0284c7' : '#64748b'
                  }}
                >
                  <Banknote size={16} /> Tunai (Cash)
                </button>
                <button 
                  type="button"
                  onClick={() => { setPaymentMethod('qris'); setCashGiven(subtotal.toString()); }}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                    border: paymentMethod === 'qris' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: paymentMethod === 'qris' ? '#f0f9ff' : '#fff',
                    color: paymentMethod === 'qris' ? '#0284c7' : '#64748b'
                  }}
                >
                  <CreditCard size={16} /> QRIS
                </button>
              </div>

              {paymentMethod === 'tunai' ? (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>UANG DITERIMA</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={cashGiven} 
                    onChange={(e) => setCashGiven(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', marginTop: '4px', fontSize: '16px', fontWeight: 'bold', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '8px 0 14px' }}>
                    <button type="button" onClick={() => setCashGiven(subtotal.toString())} style={{ padding: '6px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((nominal) => (
                      <button key={nominal} type="button" onClick={() => setCashGiven(nominal.toString())} style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        Rp {nominal.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                    <span>Kembalian:</span>
                    <strong style={{ color: Number(cashGiven) >= subtotal ? '#10b981' : '#64748b' }}>
                      Rp {change.toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <CreditCard size={28} color="#0284c7" style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Scan Kode QR Pelanggan</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Total otomatis pas Rp {subtotal.toLocaleString('id-ID')}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowPayment(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Batal
                </button>
                <button type="button" onClick={handleConfirmPayment} style={{ flex: 2, padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Konfirmasi Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUKSES TRANSAKSI */}
      {showSuccess && lastTrx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', width: '340px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#10b981', padding: '16px', textAlign: 'center', color: '#fff' }}>
              <CheckCircle size={36} style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Transaksi Berhasil</div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>{lastTrx.id}</div>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Metode:</span>
                  <strong style={{ color: '#0f172a' }}>{lastTrx.method}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Bayar:</span>
                  <strong style={{ color: '#0f172a' }}>Rp {lastTrx.total.toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kembalian:</span>
                  <strong style={{ color: '#10b981' }}>Rp {lastTrx.change.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSuccess(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  <RotateCcw size={12} /> Transaksi Baru
                </button>
                <button 
                  type="button" 
                  onClick={triggerPrint}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', background: '#0f172a', color: '#38bdf8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  <Printer size={12} /> Cetak Struk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STRUK THERMAL 58MM DINAMIS */}
      <Receipt data={lastTrx} storeInfo={storeInfo} />
    </div>
  );
}