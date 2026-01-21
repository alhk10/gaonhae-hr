import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const setEmployeePin = async (employeeId: string, pin: string): Promise<boolean> => {
  try {
    const hashedPin = await bcrypt.hash(pin, SALT_ROUNDS);
    
    const { error } = await supabase
      .from('employees')
      .update({ security_pin: hashedPin })
      .eq('id', employeeId);
    
    if (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error hashing PIN:', error);
    return false;
  }
};

export const verifyEmployeePin = async (employeeId: string, pin: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('security_pin')
      .eq('id', employeeId)
      .single();
    
    if (error || !data?.security_pin) {
      console.error('Error fetching PIN:', error);
      return false;
    }
    
    const isValid = await bcrypt.compare(pin, data.security_pin);
    return isValid;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
};

export const hasEmployeePin = async (employeeId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('security_pin')
      .eq('id', employeeId)
      .single();
    
    if (error) {
      console.error('Error checking PIN:', error);
      return false;
    }
    
    return !!data?.security_pin;
  } catch (error) {
    console.error('Error checking PIN:', error);
    return false;
  }
};

export const removeEmployeePin = async (employeeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('employees')
      .update({ security_pin: null })
      .eq('id', employeeId);
    
    if (error) {
      console.error('Error removing PIN:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error removing PIN:', error);
    return false;
  }
};
