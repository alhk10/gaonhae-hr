
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

  // Age-based rates for Singapore Citizens and PR Year 2 onwards
  if (residencyStatus === 'Singapore Citizen' || residencyStatus === 'Permanent Resident Year 2') {
    // Age 16-35: Full rates
    if (age >= 16 && age <= 35) {
      return {
        employeeRate: 0.20, // 20%
        employerRate: 0.17, // 17%
        totalRate: 0.37
      };
    }
    
    // Age 36-45: Full rates
    if (age >= 36 && age <= 45) {
      return {
        employeeRate: 0.20, // 20%
        employerRate: 0.17, // 17%
        totalRate: 0.37
      };
    }
    
    // Age 46-50: Full rates
    if (age >= 46 && age <= 50) {
      return {
        employeeRate: 0.20, // 20%
        employerRate: 0.17, // 17%
        totalRate: 0.37
      };
    }
    
    // Age 51-55: Reduced rates
    if (age >= 51 && age <= 55) {
      return {
        employeeRate: 0.19, // 19%
        employerRate: 0.16, // 16%
        totalRate: 0.35
      };
    }
    
    // Age 56-60: Reduced rates
    if (age >= 56 && age <= 60) {
      return {
        employeeRate: 0.135, // 13.5%
        employerRate: 0.115, // 11.5%
        totalRate: 0.25
      };
    }
    
    // Age 61-65: Further reduced rates
    if (age >= 61 && age <= 65) {
      return {
        employeeRate: 0.075, // 7.5%
        employerRate: 0.09, // 9%
        totalRate: 0.165
      };
    }
    
    // Age 66-70: Minimal rates
    if (age >= 66 && age <= 70) {
      return {
        employeeRate: 0.05, // 5%
        employerRate: 0.075, // 7.5%
        totalRate: 0.125
      };
    }
    
    // Age 71 and above: Minimal rates
    if (age >= 71) {
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
  const rates = getCPFRates(residencyStatus, age);
  const employeeCPF = salary * rates.employeeRate;
  const employerCPF = salary * rates.employerRate;
  
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
