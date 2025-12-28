/**
 * Supabase Client
 * Database connection and helpers
 */

import { createClient } from '@supabase/supabase-js';
import { UserSession, Message } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a new user session
 */
export async function createSession(): Promise<UserSession | null> {
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      state: 'financial_intake',
      suggested_cars: [],
      researched_cars: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return parseSession(data);
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<UserSession | null> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return parseSession(data);
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<UserSession>
): Promise<UserSession | null> {
  const { data, error } = await supabase
    .from('user_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    return null;
  }

  return parseSession(data);
}

/**
 * Add a message to the conversation
 */
export async function addMessage(
  sessionId: string,
  message: Omit<Message, 'timestamp'>
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  return {
    role: data.role,
    content: data.content,
    timestamp: new Date(data.created_at),
  };
}

/**
 * Get all messages for a session
 */
export async function getMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.created_at),
  }));
}

/**
 * Parse database row to UserSession type
 */
function parseSession(data: any): UserSession {
  return {
    id: data.id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    state: data.state,
    finances: data.finances || undefined,
    preferences: data.preferences || undefined,
    insuranceProfile: data.insurance_profile || undefined,
    budget: data.budget || undefined,
    suggestedCars: data.suggested_cars || [],
    researchedCars: data.researched_cars || [],
    selectedCar: data.selected_car || undefined,
    budgetPlan: data.budget_plan || undefined,
  };
}

/**
 * Clean up expired sessions (call this periodically via cron)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const { error } = await supabase.rpc('cleanup_expired_sessions');

  if (error) {
    console.error('Error cleaning up sessions:', error);
    return 0;
  }

  return 1; // Success
}

export default supabase;
