import localforage from 'localforage';

export const productStore = localforage.createInstance({
  name: 'NiagantaPOS',
  storeName: 'products'
});

export const transactionStore = localforage.createInstance({
  name: 'NiagantaPOS',
  storeName: 'transactions'
});

// Tambahan store pengaturan toko
export const settingsStore = localforage.createInstance({
  name: 'Niaganta Pos',
  storeName: 'settings'
});

export const initDB = async () => {
  // Inisialisasi awal pengaturan toko jika belum ada
  const storeInfo = await settingsStore.getItem('storeInfo');
  if (!storeInfo) {
    await settingsStore.setItem('storeInfo', {
      storeName: 'Niaganta Pos',
      address: 'Jl. kediri, No 4',
      phone: '0812-5505-4202',
      footerMsg: 'Terima kasih atas kunjungan Anda!'
    });
  }
};