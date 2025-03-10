import React, { useRef, useState } from 'react';
import { Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase as sbClient } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export const CameraScreen = () => {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Необходимо предоставить доступ к камере</Text>
        <Button onPress={requestPermission} title="Предоставить" />
      </View>
    );
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets && result.assets.length > 0 ? result.assets[0].uri : (result as any).uri;
      setPhotoUri(uri);
    }
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function clearPreview() {
    setPhotoUri(null);
  }

  async function sendPhoto() {
    if (photoUri) {
      try {
        const { data: { user } } = await sbClient.auth.getUser();
        const userId = user ? user.id : null;
        if (!userId) {
          console.error('No authenticated user found.');
          return;
        }
        const { error } = await sbClient
          .from('emotions')
          .insert({
            photo: photoUri,
            emotion: 'unknown',
            user_id: userId,
          });
        if (error) throw error;
        clearPreview();
      } catch (error) {
        console.error('Error sending photo:', error);
      }
    }
  }

  return (
    <View style={styles.container}>
      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: photoUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <Button title="Confirm" onPress={sendPhoto} />
          <Button title="Retake" onPress={clearPreview} />
        </View>
      ) : (
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#333',
  },
  camera: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#ffffff80',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginTop: 5,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: '70%',
    borderRadius: 10,
    marginBottom: 20,
  },
});
