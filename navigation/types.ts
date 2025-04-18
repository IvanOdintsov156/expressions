export type RootStackParamList = {
  Auth: undefined;
  PhoneAuth: { phone: string } | undefined;
  Home: undefined;
  Camera: undefined;
  Stats: undefined;
  History: undefined;
  Profile: { userId: string } | undefined;
};

