import React, { useState } from 'react';
import { Package, Box, Droplets, Settings as SettingsIcon, FolderTree, Filter, Plus, Edit, Trash2, Search, X, Save, DollarSign } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Tab Components
import ProductsManagement from './SettingsTabs/ProductsManagement';
import ContainersManagement from './SettingsTabs/ContainersManagement';
import TankSettings from './SettingsTabs/TankSettings';
import SystemSettings from './SettingsTabs/SystemSettings';
import CategoriesManagement from './SettingsTabs/CategoriesManagement';
import FiltersManagement from './SettingsTabs/FiltersManagement';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('products');

  const tabs = [
    { id: 'products', name: 'Products', icon: Package },
    { id: 'categories', name: 'Categories', icon: FolderTree }, 
    { id: 'containers', name: 'Containers', icon: Box },
    { id: 'filters', name: 'Filters', icon: Filter },
    { id: 'tank', name: 'Tank', icon: Droplets },
    { id: 'system', name: 'System', icon: SettingsIcon },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage products, containers, tank settings, and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'products' && <ProductsManagement />}
        {activeTab === 'categories' && <CategoriesManagement />}
        {activeTab === 'containers' && <ContainersManagement />}
        {activeTab === 'filters' && <FiltersManagement />}
        {activeTab === 'tank' && <TankSettings />}
        {activeTab === 'system' && <SystemSettings />}
      </div>
    </div>
  );
};

export default Settings;