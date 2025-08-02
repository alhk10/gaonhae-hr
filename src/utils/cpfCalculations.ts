
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
  const rates = getCPFRates(residencyStatus, age);
  
  // Apply wage caps based on 2025 CPF rules
  let cpfSalary = salary;
  
  // Age 55 and below: Ordinary Wage Cap S$6,800, Additional Wage Cap S$102,000
  if (age <= 55) {
    cpfSalary = Math.min(salary, 6800); // Monthly wage cap
  }
  // Age above 55 to 60: Ordinary Wage Cap S$6,800, Additional Wage Cap S$102,000  
  else if (age > 55 && age <= 60) {
    cpfSalary = Math.min(salary, 6800); // Monthly wage cap
  }
  // Age above 60 to 65: Ordinary Wage Cap S$6,800, Additional Wage Cap S$102,000
  else if (age > 60 && age <= 65) {
    cpfSalary = Math.min(salary, 6800); // Monthly wage cap
  }
  // Age above 65 to 70: Ordinary Wage Cap S$6,800, Additional Wage Cap S$102,000
  else if (age > 65 && age <= 70) {
    cpfSalary = Math.min(salary, 6800); // Monthly wage cap
  }
  // Age above 70: Ordinary Wage Cap S$6,800, Additional Wage Cap S$102,000
  else if (age > 70) {
    cpfSalary = Math.min(salary, 6800); // Monthly wage cap
  }
  
  const employeeCPF = cpfSalary * rates.employeeRate;
  const employerCPF = cpfSalary * rates.employerRate;
  
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
