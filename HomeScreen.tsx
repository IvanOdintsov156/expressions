import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator, TextStyle, ViewStyle, ImageStyle } from 'react-native';
import { Card, Text, Snackbar, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase as sbClient } from '../lib/supabase';
import { analyzeFace } from '../endpointhf'; // добавляем импорт

export const HomeScreen = () => {
  const theme = useTheme();
  const [cameraPermission, setCameraPermission] = React.useState<ImagePicker.PermissionResponse | null>(null);
  const [images, setImages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const requestPermission = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(permission);
  };

  const openCamera = async () => {
    if (cameraPermission && !cameraPermission.granted) {
      await requestPermission();
    }

    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Sorry, we need camera permissions to make this work!',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets && result.assets.length > 0 ? result.assets[0].uri : (result as any).uri;
      setImages(prev => [...prev, uri]);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets && result.assets.length > 0 ? result.assets[0].uri : (result as any).uri;
      setImages(prev => [...prev, uri]);
    }
  };

  async function sendPhoto(photo: string) {
    try {
      const { data: { user } } = await sbClient.auth.getUser();
      const userId = user ? user.id : null;
      if (!userId) {
        console.error('No authenticated user found.');
        return;
      }
      // Вызываем analyzeFace и ожидаем распознавание эмоций
      const result = await analyzeFace(photo);
      const recognizedEmotion = result.label || 'неизвестно';

      const { error } = await sbClient
        .from('emotions')
        .insert({
          photo,
          emotion: recognizedEmotion,
          user_id: userId,
        });
      if (error) throw error;

      setSnackbar({ visible: true, message: `Фото отправлено. Эмоция: ${recognizedEmotion}` });
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending photo:', error);
    }
  }

  const confirmSendPhoto = (photo: string) => {
    Alert.alert(
      'Подтверждение',
      'Вы уверены, что хотите отправить фото?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отправить', onPress: () => sendPhoto(photo) },
      ],
      { cancelable: true }
    );
  };

  const handleDelete = (photo: string) => {
    Alert.alert(
      'Подтверждение',
      'Удалить это фото?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          onPress: () =>
            setImages(prev => prev.filter(uri => uri !== photo)),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: theme.colors.background, paddingBottom: 40 },
    header: { padding: 40, paddingTop: 64 },
    headerGradient: { borderRadius: 16, padding: 20 },
    headerText: { color: 'white', fontSize: 28, fontWeight: '600', textAlign: 'center' },
    content: { paddingHorizontal: 16, marginTop: -32 },
    card: { borderRadius: 16, backgroundColor: theme.colors.surface, elevation: 3, marginVertical: 16 },
    cardTitle: { marginBottom: 16, textAlign: 'center' },
    iconContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
    galleryContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
    imageCard: { borderRadius: 16, backgroundColor: theme.colors.surface, elevation: 3, margin: 8, width: 150 },
    imageCover: { borderRadius: 16, height: 150 },
    imageActions: { justifyContent: 'space-around' },
    actionButton: { flex: 1, alignItems: 'center' },
    loaderContainer: { marginTop: 16, alignItems: 'center' },
    loaderText: { marginTop: 8, fontSize: 16, color: theme.colors.onSurface },
    snackbar: { backgroundColor: 'rgba(0,0,0,0.7)' },
  }), [theme]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <LinearGradient colors={['#6366f1', '#818cf8']} style={styles.headerGradient}>
            <Text style={styles.headerText}>Какое у Вас сегодня настроение?</Text>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Сделаем селфи?
              </Text>
              <View style={styles.iconContainer}>
                <TouchableOpacity onPress={openCamera}>
                  <MaterialIcons name="camera-alt" size={32} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openGallery}>
                  <Ionicons name="images" size={32} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
          {images.length > 0 && (
            <View style={styles.galleryContainer}>
              {images.map((img, index) => (
                <Card style={styles.imageCard} key={index}>
                  <Card.Cover source={{ uri: img }} style={styles.imageCover} />
                  <Card.Actions style={styles.imageActions}>
                    <TouchableOpacity onPress={() => confirmSendPhoto(img)} style={styles.actionButton}>
                      <MaterialIcons name="send" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(img)} style={styles.actionButton}>
                      <MaterialIcons name="delete" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </Card.Actions>
                </Card>
              ))}
            </View>
          )}
          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loaderText}>Ожидание ответа...</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
};

export default HomeScreen;


