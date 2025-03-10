import axios from 'axios';
import { Buffer } from 'buffer';
import Config from 'react-native-config';
import { supabase } from './lib/supabase';

export type EmotionEntry = {
  emotion: string;
  created_at: string;
};

// Сформулировать промпт для генерации недельного отчета
export const summarizeEmotions = async (user_id: string) => {
  try {
    const { data: emotions, error: fetchError } = await supabase
      .from('emotions')
      .select('emotion, created_at')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

    if (fetchError) throw fetchError;

    const emotionsSummary = emotions.reduce((acc: Record<string, number>, { emotion }: EmotionEntry) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});

    const prompt = `Сформулируйте недельный отчет по эмоциям: ${Object.entries(emotionsSummary)
      .map(([emotion, count]) => `${emotion}: ${count}`)
      .join(', ')}`;

    const response = await axios.post(
      'https://api.blackbox.ai/api/chat',
      {
        messages: [
          {
            content: prompt,
            role: 'user',
          },
        ],
        model: 'deepseek-ai/DeepSeek-V3',
        max_tokens: 1000,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.data || !response.data.messages || !response.data.messages.length) {
      throw new Error('Invalid response from the AI service');
    }

    const { data: weeklyReport, error: insertError } = await supabase
      .from('weekly_reports')
      .insert([{ report: response.data.messages[0].content, generated_at: new Date().toISOString(), user_id }]);

    if (insertError) throw insertError;

    return weeklyReport;
  } catch (error) {
    console.error('Error summarizing emotions:', error);
    throw error;
  }
};

