import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const fetchEmotions = async (userId: string) => {
  const { data, error } = await supabase
    .from('emotions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching emotions:', error);
    return [];
  }

  return data;
};

export const insertEmotion = async (emotionData: {
  emotion: string;
  photo: string;
  user_id: string;
}) => {
  const { data, error } = await supabase
    .from('emotions')
    .insert([emotionData])
    .single();

  if (error) {
    console.error('Error inserting emotion:', error);
    return null;
  }

  return data;
};
