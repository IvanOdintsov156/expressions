import 'react-native-paper';

declare module 'react-native-paper/lib/typescript/src/types' {
  // Расширяем MD3Theme с добавлением spacing
  interface MD3Theme {
    spacing: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    fontFamily: string;
  }
  
  // Расширяем MD3Colors с добавлением text как объекта
  interface MD3Colors {
    text: {
      primary: string;
      secondary: string;
    };
  }
}
