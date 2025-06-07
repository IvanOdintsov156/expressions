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
  ViewStyle,
} from 'react-native';
import { Text, IconButton, useTheme, Avatar, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import DynamicGradient from '../elements/DynamicGradient';
import axios from 'axios';
import { useThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { Toast } from '../elements/toast';

type Message = {
  id: string; // Ensure id is always present
  text?: string;
  created_at: string;
  role: 'user' | 'assistant';
  type?: 'typing' | 'message'; // Explicitly mark regular messages
};

type DateSeparator = {
  id: string;
  type: 'date_separator';
  date: string; // YYYY-MM-DD
  label: string; // "Today", "Yesterday", "Month D, YYYY"
};

type ListItemType = Message | DateSeparator;

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
  const [messages, setMessages] = useState<Message[]>([]); // This will still hold only raw messages
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

      // Add user message to state first
      const savedUserMessage = await saveMessage(userMessage);
      if (savedUserMessage) {
        // Ensure savedUserMessage has type 'message' if not already set
        setMessages(prev => [...prev, { ...savedUserMessage, type: 'message' }]);
      } else {
        // If saving user message fails, don't proceed
        setIsLoading(false);
        showToast('Ошибка сохранения вашего сообщения');
        return;
      }

      // Add typing indicator
      const typingIndicatorMessage: Message = { // Explicitly Message type
        id: 'TYPING_INDICATOR',
        role: 'assistant',
        type: 'typing',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, typingIndicatorMessage]);
      flatListRef.current?.scrollToEnd({ animated: true });

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

      // Remove typing indicator before adding new message or handling error
      setMessages(prev => prev.filter(msg => msg.id !== 'TYPING_INDICATOR'));

      // Сохранение ответа ассистента
      const assistantMessageData = {
        text: response.data?.result || 'Не удалось получить ответ',
        role: 'assistant' as const,
        created_at: new Date().toISOString(),
        type: 'message' as const, // Add type for assistant message
      };

      const savedAssistantMessage = await saveMessage(assistantMessageData);
      if (savedAssistantMessage) {
        setMessages(prev => [...prev, { ...savedAssistantMessage, type: 'message' }]);
      } else {
        // If saving assistant message fails, show a temporary error message in chat
        const errorResponseMessage: Message = { // Explicitly Message type
          id: `error-${new Date().getTime()}`,
          text: 'Ошибка: Ответ ассистента не был сохранен.',
          role: 'assistant',
          created_at: new Date().toISOString(),
          type: 'message',
        };
        setMessages(prev => [...prev, errorResponseMessage]);
      }
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== 'TYPING_INDICATOR'));
      showToast('Ошибка отправки сообщения');
      console.error('Send message error:', error);
      const errorChatMessage: Message = { // Explicitly Message type
        id: `error-chat-${new Date().getTime()}`,
        text: 'Не удалось получить ответ от ассистента.',
        role: 'assistant',
        created_at: new Date().toISOString(),
        type: 'message',
      };
      setMessages(prev => [...prev, errorChatMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setInputText('');
      setIsLoading(false);
    }
  }, [inputText, emotions, saveMessage, showToast]);

  const processedMessagesWithSeparators = useMemo(() => {
    const items: ListItemType[] = [];
    let lastDateStamp: string | null = null;

    // Ensure messages are sorted by created_at. Supabase query already does this.
    // If messages were not pre-sorted, you'd sort them here.
    // const sortedMessages = [...messages].sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());

    messages.forEach(message => {
      // Typing indicators don't get date separators and are handled by their own logic in renderMessage
      if (message.type === 'typing') {
        items.push(message);
        return;
      }

      const currentDate = dayjs(message.created_at);
      const currentDateStamp = currentDate.format('YYYY-MM-DD');

      if (currentDateStamp !== lastDateStamp) {
        let label = '';
        if (currentDate.isSame(dayjs(), 'day')) {
          label = 'Today';
        } else if (currentDate.isSame(dayjs().subtract(1, 'day'), 'day')) {
          label = 'Yesterday';
        } else {
          label = currentDate.format('MMMM D, YYYY');
        }
        items.push({
          id: `sep-${currentDateStamp}`,
          type: 'date_separator',
          date: currentDateStamp,
          label: label,
        });
        lastDateStamp = currentDateStamp;
      }
      // Ensure all messages pushed have a 'type', default to 'message' if not present
      items.push({ ...message, type: message.type || 'message' });
    });
    return items;
  }, [messages]);

  // Рендер сообщений
  const renderMessage = useCallback(({ item }: { item: ListItemType }) => {
    if (item.type === 'date_separator') {
      return (
        <View style={styles.separatorContainer}>
          <View style={styles.separatorBubble}>
            <Text style={styles.separatorText}>{item.label}</Text>
          </View>
        </View>
      );
    }

    // Handle typing indicator separately as it's not a standard message bubble
    if (item.type === 'typing') {
      // Cast item to Message for typing indicator specific rendering
      const currentItem = item as Message;
      return (
        <View style={[styles.messageContainer, styles.assistantContainer]}>
          <Avatar.Icon
            size={36}
            icon="robot-happy"
            style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}
            color={theme.colors.primary}
          />
          <View style={[
            styles.bubbleBase,
            styles.assistantBubbleContainer,
            styles.typingIndicatorBubble,
          ]}>
            <DynamicGradient style={styles.gradientBubbleContent}>
              <LottieView
                source={require('../assets/animations/robot-animation.json')}
                autoPlay
                loop
                style={styles.lottieIndicator}
              />
            </DynamicGradient>
          </View>
        </View>
      );
    }

    // Standard message rendering (casting to Message type)
    const currentMessage = item as Message;

    return (
      <View style={[
        styles.messageContainer,
        currentMessage.role === 'user'
          ? styles.userContainer
          : styles.assistantContainer
      ]}>
        {currentMessage.role === 'assistant' && (
          <Avatar.Icon
            size={36}
            icon="robot-happy"
            style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}
            color={theme.colors.primary}
          />
        )}
        <View style={[
          styles.bubbleBase,
            currentMessage.role === 'user' ? styles.userBubbleContainer : styles.assistantBubbleContainer
        ]}>
          <DynamicGradient style={styles.gradientBubbleContent}>
            <Text style={[
              styles.messageText,
              {
                color: theme.dark ? theme.colors.onSurface : theme.colors.onSurface
              }
            ]}>
                {currentMessage.text}
            </Text>
            <Text style={[styles.time, {
              color: theme.dark ? theme.colors.onSurfaceVariant : theme.colors.onSurfaceVariant
            }]}>
                {dayjs(currentMessage.created_at).format('HH:mm')}
            </Text>
          </DynamicGradient>
        </View>
        {currentMessage.role === 'user' && (
        <Avatar.Icon
          size={36}
          icon="account-circle"
          style={[styles.avatar, styles.userAvatar, { backgroundColor: theme.colors.surfaceVariant }]}
          color={theme.colors.primary}
        />
      )}
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
    bubbleBase: { // Outer container for the bubble
      maxWidth: '80%',
      elevation: 2,
      // Margins if necessary, or handled by messageContainer's gap
    },
    gradientBubbleContent: { // Styles for the DynamicGradient component
      padding: 12,
      borderRadius: 16,
      // flex: 1, // If DynamicGradient needs to expand within bubbleBase
    },
    userBubbleContainer: { // Specific layout for user bubble container if needed
      // e.g., if bubbleBase needs different margins/alignment
    },
    assistantBubbleContainer: { // Specific layout for assistant bubble container if needed
      // e.g., if bubbleBase needs different margins/alignment
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    typingIndicatorBubble: {
      // Adjust padding or size for the Lottie animation if needed
      // For example, if DynamicGradient adds too much padding by default for a small animation
      maxWidth: '30%', // Example: make it smaller than regular text bubbles
    },
    lottieIndicator: {
      width: 60, // Adjust size as needed
      height: 40, // Adjust size as needed
      alignSelf: 'center',
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
      backgroundColor: theme.colors.elevation.level1, // Changed from theme.colors.background
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surface, // Will evaluate this against elevation.level1
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
    userAvatar: {
      marginLeft: 8,
      marginRight: 0, // Reset marginRight for user avatar
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
            data={processedMessagesWithSeparators}
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