
interface CPFRates {
  employeeRate: number;
  employerRate: number;
  totalRate: number;
}

export const getCPFRates = (residencyStatus: string, age: number = 30): CPFRates => {
  // Simplified CPF rates based on residency status
  switch (residencyStatus) {
    case 'Singapore Citizen':
    case 'Permanent Resident Year 2':
      return {
        employeeRate: 0.20, // 20%
        employerRate: 0.17, // 17%
        totalRate: 0.37
      };
    case 'Permanent Resident Year 1':
      return {
        employeeRate: 0.05, // 5%
        employerRate: 0.04, // 4%
        totalRate: 0.09
      };
    case 'Work Permit':
    case 'S Pass':
    case 'Employment Pass':
      return {
        employeeRate: 0.00, // 0%
        employerRate: 0.00, // 0%
        totalRate: 0.00
      };
    default:
      return {
        employeeRate: 0.20,
        employerRate: 0.17,
        totalRate: 0.37
      };
  }
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
