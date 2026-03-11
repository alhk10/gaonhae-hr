// Authentication validation utilities for system testing

export const validateSuperadminAccess = (userrole: string | null, userEmail: string | null) => {
  console.log('🔍 Auth Validation: Checking superadmin access');
  console.log('  - userrole:', userrole);
  console.log('  - userEmail:', userEmail);
  
  if (userrole === 'superadmin') {
    console.log('✅ Auth Validation: Superadmin access confirmed');
    return true;
  }
  
  console.log('❌ Auth Validation: Superadmin access denied');
  return false;
};

export const validateAdminAccess = (userrole: string | null, adminAccess: any) => {
  console.log('🔍 Auth Validation: Checking admin access');
  console.log('  - userrole:', userrole);
  console.log('  - adminAccess:', adminAccess);
  
  if (userrole === 'superadmin') {
    console.log('✅ Auth Validation: Admin access via superadmin');
    return true;
  }
  
  if (userrole === 'admin' && adminAccess) {
    const hasAnyAdmin = Object.values(adminAccess).some(Boolean);
    console.log('✅ Auth Validation: Admin access via permissions:', hasAnyAdmin);
    return hasAnyAdmin;
  }
  
  console.log('❌ Auth Validation: Admin access denied');
  return false;
};

export const validateEmployeeAccess = (userrole: string | null, pageAccess: any) => {
  console.log('🔍 Auth Validation: Checking employee access');
  console.log('  - userrole:', userrole);
  console.log('  - pageAccess:', pageAccess);
  
  // Superadmin and admin always have employee access
  if (userrole === 'superadmin' || userrole === 'admin') {
    console.log('✅ Auth Validation: Employee access via elevated role');
    return true;
  }
  
  if (userrole === 'employee' && pageAccess) {
    console.log('✅ Auth Validation: Employee access via page permissions');
    return true;
  }
  
  console.log('❌ Auth Validation: Employee access denied');
  return false;
};

export const logAuthState = (context: string, authData: any) => {
  // Auth state logging suppressed in production for security
};