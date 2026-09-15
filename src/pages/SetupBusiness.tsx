import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';

export default function SetupBusiness() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [vat, setVat] = useState(5);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuth();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const bizId = uuidv4();
      
      const newBiz = {
        id: bizId,
        ownerUid: currentUser.uid,
        members: [currentUser.uid],
        name,
        currency,
        vatPercentage: vat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('mock_business', JSON.stringify(newBiz));

      const storedUser = localStorage.getItem('mock_user_profile');
      if (storedUser) {
         const profile = JSON.parse(storedUser);
         profile.businessId = bizId;
         profile.updatedAt = new Date().toISOString();
         localStorage.setItem('mock_user_profile', JSON.stringify(profile));
      }

      await refreshProfile();
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Setup your Business</h2>
        <p className="mt-2 text-center text-sm text-gray-600">You need to create a business profile to start using the system.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSetup}>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Currency</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default VAT/Tax %</label>
              <input type="number" required min="0" max="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={vat} onChange={e => setVat(Number(e.target.value))} />
            </div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Create Business
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
