import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, IconButton, useTheme, Avatar, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { Toast } from '../elements/toast';

type Message = {
  id: string;
  text: string;
  created_at: string;
  role: 'user' | 'assistant';
};

type Emotion = {
  emotion: string;
  created_at: string;
};

const PAGE_SIZE = 20;
const INITIAL_MESSAGE = "Привет! Я ваш эмоциональный ассистент. Давайте обсудим ваше эмоциональное состояние.";
const API_CONFIG = {
  method: 'POST',
  url: 'https://chatgpt-42.p.rapidapi.com/gpt4',
  headers: {
    'x-rapidapi-key': '79563b5594msh0bb99bd5ae77425p181019jsn08b8c0263be9',
    'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
};

const ChatScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = useCallback((message: string, duration = 3000) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), duration);
  }, []);

  // Загрузка истории чата и эмоций
  const loadInitialData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const [emotionsResponse, messagesResponse] = await Promise.all([
        supabase
          .from('emotions')
          .select('emotion, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('chats')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .range(0, PAGE_SIZE - 1)
      ]);

      setEmotions(emotionsResponse.data || []);

      const totalCount = messagesResponse.count || 0;
      setHasMore(totalCount > PAGE_SIZE);
      
      // Добавление приветственного сообщения если история пуста
      const initialMessages = messagesResponse.data?.length 
        ? messagesResponse.data
        : [{
            id: 'welcome',
            text: INITIAL_MESSAGE,
            role: 'assistant',
            created_at: new Date().toISOString()
          }];

      setMessages(initialMessages);

    } catch (error) {
      showToast('Ошибка загрузки данных');
      console.error('Initial load error:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Подгрузка предыдущих сообщений
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isHistoryLoading) return;

    try {
      setIsHistoryLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, count } = await supabase
        .from('chats')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      setHasMore((count || 0) > (page + 1) * PAGE_SIZE);
      setMessages(prev => [...prev, ...(data || [])]);
      setPage(p => p + 1);
    } catch (error) {
      showToast('Ошибка загрузки истории');
      console.error('Load more error:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [page, hasMore]);

  // Очистка истории
  const clearHistory = useCallback(async () => {
    Alert.alert(
      'Очистить историю',
      'Вы уверены, что хотите удалить всю историю чата?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              await supabase
                .from('chats')
                .delete()
                .eq('user_id', user.id);

              setMessages([{
                id: 'welcome',
                text: INITIAL_MESSAGE,
                role: 'assistant',
                created_at: new Date().toISOString()
              }]);
              setPage(1);
              setHasMore(false);
            } catch (error) {
              showToast('Ошибка очистки истории');
              console.error('Clear history error:', error);
            }
          }
        }
      ]
    );
  }, []);

  // Сохранение сообщения
  const saveMessage = useCallback(async (message: Omit<Message, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('chats')
        .insert([{ ...message, user_id: user.id }])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Save message error:', error);
      return null;
    }
  }, []);

  // Отправка сообщения
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const userMessage = {
        text: inputText,
        role: 'user' as const,
        created_at: new Date().toISOString()
      };

      // Сохранение сообщения пользователя
      const savedUserMessage = await saveMessage(userMessage);
      if (savedUserMessage) {
        setMessages(prev => [...prev, savedUserMessage]);
      }

      // Формирование контекста
      const emotionsContext = emotions
        .slice(0, 5)
        .map(e => `${dayjs(e.created_at).format('DD.MM')}: ${e.emotion}`)
        .join('\n');

      const contextMessage = emotions.length > 0
        ? `Учитывай мои последние эмоции:\n${emotionsContext}\n\nСообщение: ${inputText}`
        : inputText;

      // Получение ответа
      const response = await axios.request({
        ...API_CONFIG,
        data: {
          messages: [{ role: 'user', content: contextMessage }],
          web_access: false
        }
      });

      // Сохранение ответа ассистента
      const assistantMessage = {
        text: response.data?.result || 'Не удалось получить ответ',
        role: 'assistant' as const,
        created_at: new Date().toISOString()
      };

      const savedAssistantMessage = await saveMessage(assistantMessage);
      if (savedAssistantMessage) {
        setMessages(prev => [...prev, savedAssistantMessage]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

    } catch (error) {
      showToast('Ошибка отправки сообщения');
      console.error('Send message error:', error);
    } finally {
      setInputText('');
      setIsLoading(false);
    }
  }, [inputText, emotions]);

  // Рендер сообщений
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' 
        ? styles.userContainer 
        : styles.assistantContainer
    ]}>
      {item.role === 'assistant' && (
        <Avatar.Icon 
          size={36} 
          icon="robot-happy"
          style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}
          color={theme.colors.primary}
        />
      )}
      
      <View style={[
        styles.bubble,
        { 
          backgroundColor: item.role === 'user' 
            ? theme.colors.primary 
            : theme.colors.surfaceVariant
        }
      ]}>
        <Text style={[
          styles.messageText,
          { 
            color: item.role === 'user' 
              ? theme.colors.onPrimary 
              : theme.colors.onSurface 
          }
        ]}>
          {item.text}
        </Text>
        <Text style={[styles.time, { color: theme.colors.outline }]}>
          {dayjs(item.created_at).format('HH:mm')}
        </Text>
      </View>
    </View>
  ), [theme]);

  // Стили
  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    listContainer: {
      paddingVertical: 16,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginVertical: 8,
      gap: 12,
    },
    userContainer: {
      justifyContent: 'flex-end',
    },
    assistantContainer: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
      elevation: 2,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    time: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'right',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderTopWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.background,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      paddingHorizontal: 16,
      marginRight: 8,
      maxHeight: 120,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    avatar: {
      marginRight: 8,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
  }), [theme]);

  useEffect(() => {
    loadInitialData();
    navigation.setOptions({
      headerRight: () => (
        <Appbar.Action
          icon="delete"
          onPress={clearHistory}
          color={theme.colors.error}
        />
      )
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            initialNumToRender={20}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isHistoryLoading ? (
                <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
              ) : null
            }
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 100,
            }}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Напишите сообщение..."
              placeholderTextColor={theme.colors.outline}
              multiline
              editable={!isLoading}
              onSubmitEditing={handleSend}
            />
            
            <IconButton
              icon="send"
              size={28}
              onPress={handleSend}
              disabled={isLoading || !inputText.trim()}
              iconColor={theme.colors.primary}
            />
          </View>

          {isLoading && (
            <ActivityIndicator 
              size="small" 
              style={{ position: 'absolute', bottom: 72, alignSelf: 'center' }} 
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} />
    </SafeAreaView>
  );
};

export default ChatScreen;