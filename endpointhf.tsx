import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const HF_API_KEY = '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'; // Замените на свой ключ

// Словарь русских переводов эмоций
const EMOTION_TRANSLATIONS: { [key: string]: string } = {
  angry: 'Злой',
  disgust: 'Отвращение',
  fear: 'Страх',
  happy: 'Счастливый',
  sad: 'Грустный',
  surprise: 'Удивление',
  neutral: 'Нейтральный',
  unknown: 'Неизвестно'
};

export async function analyzeFace(photoUri: string) {
  try {
    // 1. Получение изображения в формате base64
    let base64: string;

    if (Platform.OS === 'web') {
      // Для веб-платформы
      const response = await fetch(photoUri);
      if (!response.ok) throw new Error('Не удалось загрузить изображение');
      
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = (reader.result as string).split(',')[1];
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(blob);
      });
    } else {
      // Для мобильных платформ
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      if (!fileInfo.exists) throw new Error('Файл не найден');
      
      base64 = await FileSystem.readAsStringAsync(photoUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
    }

    // 2. Отправка запроса к API Hugging Face
    const response = await fetch(
      'https://api-inference.huggingface.co/models/trpakov/vit-face-expression',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: base64 }),
      }
    );

    // 3. Обработка ответа сервера
    const rawResponse = await response.text();

    if (!response.ok) {
      throw new Error(`Ошибка API (${response.status}): ${rawResponse.slice(0, 100)}`);
    }

    const data = JSON.parse(rawResponse);

    // 4. Валидация структуры ответа
    if (!Array.isArray(data) || !data[0]?.label) {
      throw new Error('Некорректный формат ответа от сервера');
    }

    // 5. Нормализация и перевод эмоции
    const originalEmotion = data[0].label.trim().toLowerCase();
    const translatedEmotion = EMOTION_TRANSLATIONS[originalEmotion] 
      || EMOTION_TRANSLATIONS.unknown;

    // 6. Возврат результата
    return {
      label: translatedEmotion,
      confidence: Number(data[0].score.toFixed(2)),
    };

  } catch (error) {
    // 7. Обработка ошибок
    console.error('Ошибка анализа эмоций:', error);
    
    return {
      label: error instanceof Error && error.message.includes('API') 
        ? 'Ошибка сервера' 
        : 'Не удалось распознать',
      confidence: 0,
    };
  }
}