import { supabase } from "@/integrations/supabase/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Helper to refresh session if JWT is expired
const refreshSessionIfNeeded = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('Session expired or not found, attempting refresh...');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !data.session) {
        console.error('Failed to refresh session:', refreshError);
        return false;
      }
      console.log('Session refreshed successfully');
    }
    return true;
  } catch (error) {
    console.error('Error checking/refreshing session:', error);
    return false;
  }
};

export const setEmployeePin = async (employeeId: string, pin: string): Promise<boolean> => {
  try {
    // Refresh session if needed before making the request
    const sessionValid = await refreshSessionIfNeeded();
    if (!sessionValid) {
      console.error('Cannot set PIN: Session could not be refreshed');
      return false;
    }

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
    // Refresh session if needed
    await refreshSessionIfNeeded();

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
    // Refresh session if needed
    const sessionValid = await refreshSessionIfNeeded();
    if (!sessionValid) {
      // If we can't refresh session, assume user may have a PIN to prevent false prompts
      console.warn('Session could not be verified, assuming PIN may exist');
      return true;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('security_pin')
      .eq('id', employeeId)
      .single();
    
    if (error) {
      console.error('Error checking PIN:', error);
      // On error, assume PIN exists to prevent prompting user who already has one
      return true;
    }
    
    return !!data?.security_pin;
  } catch (error) {
    console.error('Error checking PIN:', error);
    // On error, assume PIN exists to prevent prompting
    return true;
  }
};

export const removeEmployeePin = async (employeeId: string): Promise<boolean> => {
  try {
    // Refresh session if needed
    await refreshSessionIfNeeded();

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
