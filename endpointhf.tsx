import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export async function analyzeFace(photoUri: string) {
  try {
    let base64;
    if (Platform.OS === 'web') {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: FileSystem.EncodingType.Base64 });
    }

    const response = await fetch('https://router.huggingface.co/hf-inference/models/trpakov/vit-face-expression', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: base64 }),
    });

    const data = await response.json();
    if (!data || !data[0] || !data[0].label) {
      throw new Error('Invalid response structure');
    }
    
    return data[0].label;
  } catch (error) {
    console.error('Error analyzing face:', error);
    return null;
  }
}

