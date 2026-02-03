/**
 * Product Management Page
 * Main page for Milestone 5 - Product catalog management
 */

import React from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import ProductManagementList from '@/components/sales/ProductManagementList';

const ProductManagement: React.FC = () => {
  return (
    <ResponsiveLayout>
      <ProductManagementList />
    </ResponsiveLayout>
  );
};

export default ProductManagement;
