
interface CPFRates {
  employeeRate: number;
  employerRate: number;
  totalRate: number;
}

export const getCPFRates = (residencyStatus: string, age: number = 30): CPFRates => {
  // Work permit holders, S Pass and Employment Pass holders don't contribute to CPF
  if (residencyStatus === 'Work Permit' || residencyStatus === 'S Pass' || residencyStatus === 'Employment Pass') {
    return {
      employeeRate: 0.00,
      employerRate: 0.00,
      totalRate: 0.00
    };
  }

  // PR Year 1 has reduced rates
  if (residencyStatus === 'Permanent Resident Year 1') {
    return {
      employeeRate: 0.05, // 5%
      employerRate: 0.04, // 4%
      totalRate: 0.09
    };
  }

  // Age-based rates for Singapore Citizens and PR Year 2 onwards (2025 rates)
  if (residencyStatus === 'Singapore Citizen' || residencyStatus === 'Permanent Resident Year 2') {
    // Age 55 and below: Full rates
    if (age <= 55) {
      return {
        employeeRate: 0.20, // 20%
        employerRate: 0.17, // 17%
        totalRate: 0.37
      };
    }
    
    // Age above 55 to 60: Reduced rates
    if (age > 55 && age <= 60) {
      return {
        employeeRate: 0.17, // 17%
        employerRate: 0.155, // 15.5%
        totalRate: 0.325
      };
    }
    
    // Age above 60 to 65: Further reduced rates
    if (age > 60 && age <= 65) {
      return {
        employeeRate: 0.115, // 11.5%
        employerRate: 0.12, // 12%
        totalRate: 0.235
      };
    }
    
    // Age above 65 to 70: Lower rates
    if (age > 65 && age <= 70) {
      return {
        employeeRate: 0.05, // 5%
        employerRate: 0.075, // 7.5%
        totalRate: 0.125
      };
    }
    
    // Age above 70: Minimal rates
    if (age > 70) {
      return {
        employeeRate: 0.05, // 5%
        employerRate: 0.05, // 5%
        totalRate: 0.10
      };
    }
  }

  // Default fallback (should not reach here for valid inputs)
  return {
    employeeRate: 0.20,
    employerRate: 0.17,
    totalRate: 0.37
  };
};

export const calculateCPF = (salary: number, residencyStatus: string, age: number = 30) => {
  // Work permit holders, S Pass and Employment Pass holders don't contribute to CPF
  if (residencyStatus === 'Work Permit' || residencyStatus === 'S Pass' || residencyStatus === 'Employment Pass') {
    return {
      employeeCPF: 0,
      employerCPF: 0,
      totalCPF: 0
    };
  }

  // Apply 2025 CPF wage band calculation based on attached rate table
  let employeeCPF = 0;
  let employerCPF = 0;

  // Cap salary at $6,800 monthly for CPF calculation
  const cpfSalary = Math.min(salary, 6800);

  // Age 55 and below - 2025 CPF Contribution Rate Table
  if (age <= 55) {
    if (cpfSalary <= 50) {
      // No contribution for wages $50 and below
      employeeCPF = 0;
      employerCPF = 0;
    } else if (cpfSalary <= 500) {
      // NIL employee contribution for wages above $50 but not exceeding $500
      employeeCPF = 0;
      employerCPF = cpfSalary * 0.17; // 17% employer contribution
    } else if (cpfSalary <= 750) {
      // Graduated rates for wages above $500 but not exceeding $750
      employeeCPF = Math.round((cpfSalary - 500) * 0.20 * 100) / 100; // 20% on amount above $500
      employerCPF = Math.round((85 + (cpfSalary - 500) * 0.17) * 100) / 100; // $85 + 17% on amount above $500
    } else {
      // Full rates for wages above $750
      employeeCPF = Math.round(cpfSalary * 0.20 * 100) / 100; // 20% employee
      employerCPF = Math.round(cpfSalary * 0.17 * 100) / 100; // 17% employer
    }
  }
  // Age above 55 to 60 - 2025 CPF Contribution Rate Table
  else if (age > 55 && age <= 60) {
    if (cpfSalary <= 50) {
      employeeCPF = 0;
      employerCPF = 0;
    } else if (cpfSalary <= 500) {
      // NIL employee contribution for wages above $50 but not exceeding $500
      employeeCPF = 0;
      employerCPF = Math.round(cpfSalary * 0.135 * 100) / 100; // 13.5% employer contribution
    } else if (cpfSalary <= 750) {
      // Graduated rates for wages above $500 but not exceeding $750
      employeeCPF = Math.round((cpfSalary - 500) * 0.17 * 100) / 100; // 17% on amount above $500
      employerCPF = Math.round((67.5 + (cpfSalary - 500) * 0.135) * 100) / 100; // $67.5 + 13.5% on amount above $500
    } else {
      // Full rates for wages above $750
      employeeCPF = Math.round(cpfSalary * 0.17 * 100) / 100; // 17% employee
      employerCPF = Math.round(cpfSalary * 0.155 * 100) / 100; // 15.5% employer
    }
  }
  // Age above 60 to 65 - 2025 CPF Contribution Rate Table
  else if (age > 60 && age <= 65) {
    if (cpfSalary <= 50) {
      employeeCPF = 0;
      employerCPF = 0;
    } else if (cpfSalary <= 500) {
      // NIL employee contribution for wages above $50 but not exceeding $500
      employeeCPF = 0;
      employerCPF = Math.round(cpfSalary * 0.09 * 100) / 100; // 9% employer contribution
    } else if (cpfSalary <= 750) {
      // Graduated rates for wages above $500 but not exceeding $750
      employeeCPF = Math.round((cpfSalary - 500) * 0.115 * 100) / 100; // 11.5% on amount above $500
      employerCPF = Math.round((45 + (cpfSalary - 500) * 0.09) * 100) / 100; // $45 + 9% on amount above $500
    } else {
      // Full rates for wages above $750
      employeeCPF = Math.round(cpfSalary * 0.115 * 100) / 100; // 11.5% employee
      employerCPF = Math.round(cpfSalary * 0.12 * 100) / 100; // 12% employer
    }
  }
  // Age above 65 to 70 - 2025 CPF Contribution Rate Table
  else if (age > 65 && age <= 70) {
    if (cpfSalary <= 50) {
      employeeCPF = 0;
      employerCPF = 0;
    } else if (cpfSalary <= 500) {
      // NIL employee contribution for wages above $50 but not exceeding $500
      employeeCPF = 0;
      employerCPF = Math.round(cpfSalary * 0.05 * 100) / 100; // 5% employer contribution
    } else if (cpfSalary <= 750) {
      // Graduated rates for wages above $500 but not exceeding $750
      employeeCPF = Math.round((cpfSalary - 500) * 0.05 * 100) / 100; // 5% on amount above $500
      employerCPF = Math.round((25 + (cpfSalary - 500) * 0.05) * 100) / 100; // $25 + 5% on amount above $500
    } else {
      // Full rates for wages above $750
      employeeCPF = Math.round(cpfSalary * 0.05 * 100) / 100; // 5% employee
      employerCPF = Math.round(cpfSalary * 0.075 * 100) / 100; // 7.5% employer
    }
  }
  // Age above 70 - 2025 CPF Contribution Rate Table
  else if (age > 70) {
    if (cpfSalary <= 50) {
      employeeCPF = 0;
      employerCPF = 0;
    } else if (cpfSalary <= 500) {
      // NIL employee contribution for wages above $50 but not exceeding $500
      employeeCPF = 0;
      employerCPF = Math.round(cpfSalary * 0.035 * 100) / 100; // 3.5% employer contribution
    } else if (cpfSalary <= 750) {
      // Graduated rates for wages above $500 but not exceeding $750
      employeeCPF = Math.round((cpfSalary - 500) * 0.05 * 100) / 100; // 5% on amount above $500
      employerCPF = Math.round((17.5 + (cpfSalary - 500) * 0.035) * 100) / 100; // $17.5 + 3.5% on amount above $500
    } else {
      // Full rates for wages above $750
      employeeCPF = Math.round(cpfSalary * 0.05 * 100) / 100; // 5% employee
      employerCPF = Math.round(cpfSalary * 0.05 * 100) / 100; // 5% employer
    }
  }

  // Handle PR Year 1 reduced rates - override the above calculations
  if (residencyStatus === 'Permanent Resident Year 1') {
    if (cpfSalary <= 50) {
      employeeCPF = 0;
      employerCPF = 0;
    } else {
      employeeCPF = Math.round(cpfSalary * 0.05 * 100) / 100; // 5% employee
      employerCPF = Math.round(cpfSalary * 0.04 * 100) / 100; // 4% employer
    }
  }

  return {
    employeeCPF: Math.round(employeeCPF * 100) / 100,
    employerCPF: Math.round(employerCPF * 100) / 100,
    totalCPF: Math.round((employeeCPF + employerCPF) * 100) / 100
  };
};

// Helper function to calculate age from date of birth
export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};
