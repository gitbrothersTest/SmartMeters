import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product, ProductCategory } from '../types';
import { Edit, Trash, Plus, Save, X } from 'lucide-react';

const Admin: React.FC = () => {
  const { products, updateProduct, deleteProduct, addProduct } = useProducts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Initial state for new product
  const initialNewProduct: Product = {
    id: '',
    sku: '',
    name: '',
    manufacturer: '',
    category: ProductCategory.ELECTRIC,
    price: 0,
    currency: 'RON',
    stockStatus: 'in_stock',
    image: 'https://picsum.photos/200',
    shortDescription: { ro: '', en: '' },
    fullDescription: { ro: '', en: '' },
    specs: {}
  };

  const [newProductForm, setNewProductForm] = useState<Product>(initialNewProduct);

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editForm.id) {
        // In a real app, strict validation here
        updateProduct(editForm as Product);
        setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const handleCreate = () => {
      const newId = (Math.random() * 10000).toString().substring(0, 5);
      addProduct({ ...newProductForm, id: newId });
      setIsAdding(false);
      setNewProductForm(initialNewProduct);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-slate-700 flex items-center gap-2"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Add Product Form (Mock) */}
      {isAdding && (
          <div className="bg-white p-6 rounded shadow mb-8 border border-gray-200">
              <h3 className="font-bold mb-4">New Product</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <input placeholder="Name" className="border p-2 rounded" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} />
                  <input placeholder="Manufacturer" className="border p-2 rounded" value={newProductForm.manufacturer} onChange={e => setNewProductForm({...newProductForm, manufacturer: e.target.value})} />
                  <input placeholder="SKU" className="border p-2 rounded" value={newProductForm.sku} onChange={e => setNewProductForm({...newProductForm, sku: e.target.value})} />
                  <input type="number" placeholder="Price" className="border p-2 rounded" value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} />
                  <select className="border p-2 rounded" value={newProductForm.category} onChange={e => setNewProductForm({...newProductForm, category: e.target.value as ProductCategory})}>
                      {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
                  <button onClick={() => setIsAdding(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
              </div>
          </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="p-4 border-b">SKU</th>
              <th className="p-4 border-b">Name</th>
              <th className="p-4 border-b">Category</th>
              <th className="p-4 border-b text-right">Price</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => {
              const isEditing = editingId === product.id;
              
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm font-mono text-gray-500">{product.sku}</td>
                  
                  <td className="p-4">
                    {isEditing ? (
                      <input 
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{product.name}</span>
                    )}
                  </td>

                  <td className="p-4 text-sm">
                    {product.category}
                  </td>
                  
                  <td className="p-4 text-right font-bold text-slate-700">
                    {isEditing ? (
                       <input 
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                      />
                    ) : (
                      `${product.price} ${product.currency}`
                    )}
                  </td>

                  <td className="p-4 flex justify-center space-x-2">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-1"><Save size={18}/></button>
                        <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 p-1"><X size={18}/></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(product)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={18}/></button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 p-1"><Trash size={18}/></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-500">
          * Note: Changes in this demo are local to the session and will reset on refresh.
      </div>
    </div>
  );
};

export default Admin;