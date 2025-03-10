import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

interface Section {
    title: string;
    paragraphs?: string[];
    points?: string[];
}

const termsSections: Section[] = [
    {
        title: 'Общие положения',
        paragraphs: [
            'Настоящие Условия пользования (далее — "Условия") регулируют отношения между пользователем (далее — "Пользователь") и владельцем приложения "Трекер эмоций" (далее — "Приложение") при использовании функционала Приложения.',
            'Используя Приложение, Пользователь подтверждает, что ознакомился с Условиями, полностью согласен с ними и обязуется их соблюдать.',
            'Приложение предназначено для лиц, достигших 16 лет. Для пользователей младше 16 лет требуется согласие законного представителя.'
        ]
    },
    {
        title: 'Права и обязанности Пользователя',
        points: [
            'Предоставлять достоверные данные при регистрации и использовании Приложения.',
            'Не передавать учетные данные третьим лицам.',
            'Не использовать Приложение для распространения незаконного контента, нарушения авторских прав или иных прав третьих лиц.',
            'Соблюдать нормы российского законодательства.'
        ]
    },
    {
        title: 'Персональные данные',
        paragraphs: [
            'Приложение собирает и обрабатывает данные Пользователя: электронная почта, имя, фамилия, данные об эмоциональном состоянии, фотографии (по желанию) и техническая информация (IP-адрес, тип устройства).',
            'Цели обработки включают предоставление доступа к функционалу, анализ для формирования статистики и соблюдение законодательства РФ.',
            'Данные обрабатываются в соответствии с Федеральным законом №152-ФЗ "О персональных данных", хранятся на защищенных серверах и не передаются третьим лицам без согласия Пользователя, за исключением случаев, предусмотренных законом.'
        ]
    },
    {
        title: 'Ограничение ответственности',
        paragraphs: [
            'Владелец Приложения не несет ответственности за временные сбои в работе, действия Пользователя или ущерб, возникший из-за нарушения Условий.'
        ],
        points: [
            'Ответственность за размещаемый контент полностью ложится на Пользователя.'
        ]
    },
    {
        title: 'Изменение Условий',
        paragraphs: [
            'Владелец Приложения вправе вносить изменения в Условия, вступающие в силу с момента их публикации.',
            'Продолжение использования Приложения после изменений означает согласие Пользователя с новой редакцией Условий.'
        ]
    },
    {
        title: 'Заключительные положения',
        paragraphs: [
            'Споры регулируются законодательством РФ, подсудность определяется по месту нахождения владельца Приложения.',
            'Все вопросы направляются на support@emotiontracker.ru.',
            'Дата вступления в силу: 25.02.2025',
            'Последнее обновление: 25.02.2025',
            
        ]
    }
];

export const TermsScreen = ({ navigation }: any) => {
    const theme = useTheme();
    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        scrollContainer: { padding: 20 },
        title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: theme.colors.primary },
        sectionContainer: { marginBottom: 20 },        
        sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: theme.colors.onSurface },
        paragraph: { fontSize: 14, marginBottom: 8, lineHeight: 20, color: theme.colors.onSurface },
        pointContainer: { flexDirection: 'row', marginBottom: 4 },        
        point: { fontSize: 14, lineHeight: 20, color: theme.colors.onSurface },
        button: { alignSelf: 'center', marginTop: 20, backgroundColor: theme.colors.primary },        
    }), [theme.colors]);
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>
                    Условия пользования приложением "Трекер эмоций"
                </Text>
                {termsSections.map((section, index) => (
                    <View key={index} style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.paragraphs?.map((para, pIndex) => (
                            <Text key={pIndex} style={styles.paragraph}>
                                {para}
                            </Text>
                        ))}
                        {section.points?.map((point, ptIndex) => (
                            <View key={ptIndex} style={styles.pointContainer}>
                                <Text style={styles.point}>• {point}</Text>
                            </View>
                        ))}
                    </View>
                ))}
                <Button mode="contained" style={styles.button} onPress={() => navigation.goBack()}>
                    Назад
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TermsScreen;
