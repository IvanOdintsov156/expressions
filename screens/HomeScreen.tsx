import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase as sbClient } from '../lib/supabase';
import { analyzeFace } from '../endpointhf';
import { Toast } from '../elements/toast';

export const HomeScreen = () => {
  const theme = useTheme();
  const [cameraPermission, setCameraPermission] = useState<ImagePicker.PermissionResponse | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  const requestPermission = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(permission);
  };

  const openCamera = async () => {
    if (images.length >= 5) {
      showToast('Можно загрузить не более 5 фото');
      return;
    }

    if (cameraPermission && !cameraPermission.granted) {
      await requestPermission();
    }

    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Требуется разрешение на использование камеры');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    const uri = result.assets?.[0]?.uri;
    if (uri) setImages(prev => [...prev, uri]);
  };

  const openGallery = async () => {
    if (images.length >= 5) {
      showToast('Можно загрузить не более 5 фото');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    const uri = result.assets?.[0]?.uri;
    if (uri) setImages(prev => [...prev, uri]);
  };

  async function sendPhoto(photo: string) {
    try {
      setLoading(true);
      const { data: { user } } = await sbClient.auth.getUser();
      if (!user) throw new Error('Требуется авторизация');
  
      const analysis = await analyzeFace(photo);
      
      if (analysis.confidence === 0) {
        throw new Error(analysis.label);
      }
  
      if (analysis.confidence < 0.5) {
        throw new Error('Низкая уверенность: ' + analysis.label);
      }
  
      const { error } = await sbClient
        .from('emotions')
        .insert({
          emotion: analysis.label,
          user_id: user.id
        });
  
      if (error) throw error;
  
      setImages(prev => prev.filter(uri => uri !== photo));
      showToast(`Эмоция: ${analysis.label} (${(analysis.confidence * 100).toFixed(1)}%`);
      
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка обработки');
    } finally {
      setLoading(false);
    }
  }

  const confirmSendPhoto = (photo: string) => {
    Alert.alert(
      'Подтверждение',
      'Отправить это фото для анализа?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отправить', onPress: () => sendPhoto(photo) },
      ]
    );
  };

  const handleDelete = (photo: string) => {
    Alert.alert(
      'Удаление фото',
      'Вы уверены, что хотите удалить это фото?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          onPress: () => setImages(prev => prev.filter(uri => uri !== photo)),
          style: 'destructive' 
        },
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { 
      flexGrow: 1, 
      backgroundColor: theme.colors.background, 
      paddingBottom: 40 
    },
    header: { 
      padding: 40, 
      paddingTop: 64 
    },
    headerGradient: { 
      borderRadius: 16, 
      padding: 20 
    },
    headerText: { 
      color: 'white', 
      fontSize: 28, 
      fontWeight: '600', 
      textAlign: 'center' 
    },
    content: { 
      paddingHorizontal: 16, 
      marginTop: -32 
    },
    card: { 
      borderRadius: 16, 
      backgroundColor: theme.colors.surface, 
      elevation: 3, 
      marginVertical: 16 
    },
    cardTitle: { 
      marginBottom: 16, 
      textAlign: 'center' 
    },
    iconContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      marginVertical: 16 
    },
    galleryContainer: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-around' 
    },
    imageCard: { 
      borderRadius: 16, 
      backgroundColor: theme.colors.surface, 
      elevation: 3, 
      margin: 8, 
      width: 150 
    },
    imageCover: { 
      borderRadius: 16, 
      height: 150,
      resizeMode: 'cover' 
    },
    imageActions: { 
      justifyContent: 'space-around' 
    },
    actionButton: { 
      flex: 1, 
      alignItems: 'center' 
    },
    loaderContainer: { 
      marginTop: 16, 
      alignItems: 'center' 
    },
    loaderText: { 
      marginTop: 8, 
      fontSize: 16, 
      color: theme.colors.onSurface,
      textAlign: 'center' 
    },
  }), [theme]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <LinearGradient colors={['#6366f1', '#818cf8']} style={styles.headerGradient}>
            <Text style={styles.headerText}>Анализ настроения</Text>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Выберите источник
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
                    <TouchableOpacity 
                      onPress={() => confirmSendPhoto(img)} 
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="send" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDelete(img)} 
                      style={styles.actionButton}
                    >
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
              <Text style={styles.loaderText}>Анализируем эмоции...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
      />
    </>
  );
};

export default HomeScreen;