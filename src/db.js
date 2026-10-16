import localforage from 'localforage';

export const productStore = localforage.createInstance({ name: 'pos_products' });
export const transactionStore = localforage.createInstance({ name: 'pos_transactions' });

export const initDB = async () => {
  const keys = await productStore.keys();
  if (keys.length === 0) {
    const defaultProducts = [
      { id: '1', name: 'Air Mineral 600ml', price: 3500, stock: 50 },
      { id: '2', name: 'Kopi Susu Dingin', price: 8000, stock: 30 },
      { id: '3', name: 'Roti Bakar Cokelat', price: 12000, stock: 20 },
      { id: '4', name: 'Keripik Singkong', price: 6500, stock: 25 }
    ];
    for (const item of defaultProducts) {
      await productStore.setItem(item.id, item);
    }
  }
};