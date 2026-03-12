import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_PROMPT = `You are SafeStree AI, a compassionate and knowledgeable women's safety assistant. Your role is to:

1. Provide immediate safety advice and support
2. Help women assess dangerous situations
3. Suggest de-escalation strategies
4. Provide information about women's rights and legal protections
5. Offer emotional support during distressing situations
6. Guide users on how to use safety features in the app

IMPORTANT GUIDELINES:
- ONLY discuss topics related to women's safety, personal security, harassment, assault prevention, legal rights, and emergency situations
- If asked about unrelated topics, politely redirect: "I'm specifically designed to help with women's safety concerns. How can I assist you with safety-related questions?"
- Be empathetic, non-judgmental, and supportive
- Provide actionable, practical advice
- In emergencies, always remind users to call local emergency services (112 in India)
- Never provide medical, legal, or psychological diagnosis - recommend professional help when needed
- Keep responses concise (2-3 paragraphs max)
- Use simple, clear language

SAFETY TOPICS YOU CAN HELP WITH:
- Street harassment and catcalling
- Stalking and following
- Unsafe public transport situations
- Walking alone at night
- Suspicious behavior recognition
- Self-defense basics
- Legal rights and reporting procedures
- Domestic violence resources
- Workplace harassment
- Online safety and cyberstalking
- Travel safety tips
- Emergency preparedness

Remember: You are a supportive companion helping women feel safer and more empowered.`;

export default function SafetyAIChatbot() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize welcome message only when chatbot is first opened
  useEffect(() => {
    if (isExpanded && !isInitialized) {
      setMessages([
        {
          id: '1',
          text: "Hi! I'm SafeStree AI, your personal safety assistant. I'm here to help with any safety concerns, provide advice, or just listen. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      setIsInitialized(true);
    }
  }, [isExpanded, isInitialized]);

  useEffect(() => {
    // Pulse animation for the floating button - only when not expanded
    if (!isExpanded) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isExpanded]);

  useEffect(() => {
    // Slide animation for chatbox
    Animated.spring(slideAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isExpanded]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Gemini API key is not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file and restart the app.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage.text}\n\nAssistant:`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      });

      const data = await response.json();

      console.log('Gemini API Response:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.candidates[0].content.parts[0].text,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else if (data.error) {
        throw new Error(data.error.message || 'API Error');
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error && error.message.includes('API') 
          ? `API Error: ${error.message}. Please check your Gemini API key.`
          : "I'm having trouble connecting right now. For immediate help, please call emergency services at 112 or contact your emergency contacts through the SOS feature.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const toggleChatbox = () => {
    setIsExpanded(!isExpanded);
  };

  const quickActions = [
    { id: '1', text: 'I feel unsafe', icon: 'alert-circle' },
    { id: '2', text: 'Someone is following me', icon: 'walk' },
    { id: '3', text: 'Safety tips for night travel', icon: 'moon' },
    { id: '4', text: 'How to report harassment', icon: 'document-text' },
  ];

  const handleQuickAction = (text: string) => {
    setInputText(text);
  };

  return (
    <>
      {/* Floating AI Button */}
      <Animated.View
        style={[
          s.floatingButton,
          {
            transform: [{ scale: scaleAnim }],
            opacity: isExpanded ? 0 : 1,
          },
        ]}
        pointerEvents={isExpanded ? 'none' : 'auto'}
      >
        <TouchableOpacity style={s.aiButton} onPress={toggleChatbox}>
          <View style={s.aiGlow} />
          <Ionicons name="sparkles" size={28} color={Colors.white} />
          <View style={s.badge}>
            <Text style={s.badgeText}>AI</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Expanded Chatbox - Only render when expanded */}
      {isExpanded && (
        <Animated.View
          style={[
            s.chatboxContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.chatbox}
          >
            {/* Header */}
            <View style={s.chatHeader}>
              <View style={s.headerLeft}>
                <View style={s.aiAvatarSmall}>
                  <Ionicons name="sparkles" size={20} color={Colors.white} />
                </View>
                <View>
                  <Text style={s.chatTitle}>SafeStree AI</Text>
                  <View style={s.statusRow}>
                    <View style={s.onlineDot} />
                    <Text style={s.chatSubtitle}>Always here to help</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={toggleChatbox} style={s.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={s.messagesContainer}
              contentContainerStyle={s.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    s.messageBubble,
                    message.isUser ? s.userBubble : s.aiBubble,
                  ]}
                >
                  {!message.isUser && (
                    <View style={s.aiAvatarTiny}>
                      <Ionicons name="sparkles" size={12} color={Colors.white} />
                    </View>
                  )}
                  <View
                    style={[
                      s.bubbleContent,
                      message.isUser ? s.userBubbleContent : s.aiBubbleContent,
                    ]}
                  >
                    <Text
                      style={[
                        s.messageText,
                        message.isUser ? s.userMessageText : s.aiMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                </View>
              ))}

              {isLoading && (
                <View style={[s.messageBubble, s.aiBubble]}>
                  <View style={s.aiAvatarTiny}>
                    <Ionicons name="sparkles" size={12} color={Colors.white} />
                  </View>
                  <View style={s.loadingBubble}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                    <Text style={s.loadingText}>Thinking...</Text>
                  </View>
                </View>
              )}

              {messages.length === 1 && (
                <View style={s.quickActionsContainer}>
                  <Text style={s.quickActionsTitle}>Quick questions:</Text>
                  {quickActions.map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={s.quickActionBtn}
                      onPress={() => handleQuickAction(action.text)}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={16}
                        color={Colors.accent}
                      />
                      <Text style={s.quickActionText}>{action.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                placeholder="Ask me anything about safety..."
                placeholderTextColor={Colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!inputText.trim() || isLoading) && s.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && !isLoading ? Colors.white : Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const { height } = Dimensions.get('window');

const s = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 1000,
  },
  aiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  aiGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.accent,
    opacity: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.sos,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  chatboxContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    zIndex: 999,
  },
  chatbox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: height * 0.7,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.safe,
  },
  chatSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  bubbleContent: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  userBubbleContent: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  aiBubbleContent: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
  },
  aiMessageText: {
    color: Colors.text,
  },
  loadingBubble: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  quickActionsContainer: {
    marginTop: Spacing.md,
  },
  quickActionsTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  quickActionText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
});
