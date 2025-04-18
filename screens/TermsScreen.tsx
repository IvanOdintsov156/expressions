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
        title: 'Статус и регулирование',
        paragraphs: [
            'Приложение разработано и поддерживается Одинцовым Иваном Александровичем (далее - "Разработчик") как физическим лицом.',
            'Использование приложения означает полное согласие с условиями настоящего соглашения (п. 1 ст. 437 ГК РФ).'
        ],
        points: [
            'Гражданский кодекс РФ (ст. 1225, 1226, 1259 - интеллектуальные права)',
            'ФЗ №152 "О персональных данных"',
            'Постановление Правительства РФ №1119 "Об утверждении требований к защите ПДн"'
        ]
    },
    {
        title: 'Интеллектуальная собственность',
        paragraphs: [
            'Все права на результаты интеллектуальной деятельности принадлежат Разработчику:'
        ],
        points: [
            'Исходный код и алгоритмы приложения',
            'Дизайн, интерфейсы и графические элементы',
            'Логотипы, текстовые материалы и документация',
            'Базы данных и архитектура системы'
        ]
    },
    {
        title: 'Права и обязанности',
        paragraphs: [
            'Пользователь обязуется:'
        ],
        points: [
            'Не осуществлять реверс-инжиниринг и декомпиляцию (ст. 1280.1 ГК РФ)',
            'Не распространять копии приложения без письменного согласия',
            'Не использовать контент в коммерческих целях'
        ]
    },
    {
        title: 'Персональные данные',
        paragraphs: [
            'Обрабатываемые данные:'
        ],
        points: [
            'Биометрические (анализ мимики) - при явном согласии (п. 1 ст. 11 ФЗ-152)',
            'Технические параметры устройства',
            'История эмоциональных состояний',
            'Электронная почта для идентификации'
        ]
    },
    {
        title: 'Ограничения ответственности',
        paragraphs: [
            'Разработчик не гарантирует:'
        ],
        points: [
            'Абсолютную точность анализа эмоций',
            'Работу в условиях отсутствия интернет-соединения',
            'Совместимость с неподдерживаемыми версиями ОС'
        ]
    },
    {
        title: 'Споры и претензии',
        paragraphs: [
            'Претензии подаются через форму в приложении в течение 7 календарных дней.',
            'Срок рассмотрения обращения - 20 рабочих дней.',
            'Подсудность: Мировой суд по месту жительства Разработчика (г. Москва).'
        ]
    },
    {
        title: 'Заключительные положения',
        paragraphs: [
            'Изменения вступают в силу через 7 дней после публикации обновленной версии.',
            'При несогласии с условиями пользователь обязан прекратить использование.',
            'Разработчик вправе прекратить поддержку, уведомив за 30 календарных дней.',
            'Контактная информация:',
            'Одинцов Иван Александрович',
            'Электронная почта: support@emotiontracker.ru',
            'Телефон: +7 (495) 000-00-00',
            'Дата последнего обновления: 25.02.2024',
            'Согласие выражается действием: "Продолжая использовать приложение, вы принимаете условия" (п. 3 ст. 438 ГК РФ).',
            'Примечание:',
            'Для пользователей младше 14 лет требуется согласие родителя (ст. 14.1 ФЗ-152).',
            'Биометрические данные не передаются третьим лицам (ст. 11.1 ФЗ-152).'
        ]
    }
];

export const TermsScreen = ({ navigation }: any) => {
    const theme = useTheme();
    const styles = useMemo(() => StyleSheet.create({
        container: { 
            flex: 1, 
            backgroundColor: theme.colors.background 
        },
        scrollContainer: { 
            padding: 20 
        },
        title: { 
            fontSize: 22, 
            fontWeight: 'bold', 
            marginBottom: 24, 
            textAlign: 'center', 
            color: theme.colors.primary 
        },
        sectionContainer: { 
            marginBottom: 24 
        },
        sectionTitle: { 
            fontSize: 18, 
            fontWeight: '600', 
            marginBottom: 12, 
            color: theme.colors.onSurface,
            letterSpacing: 0.5
        },
        paragraph: { 
            fontSize: 14, 
            marginBottom: 8, 
            lineHeight: 20, 
            color: theme.colors.onSurfaceVariant 
        },
        pointContainer: { 
            flexDirection: 'row', 
            marginBottom: 6 
        },
        point: { 
            fontSize: 14, 
            lineHeight: 20, 
            color: theme.colors.onSurfaceVariant,
            flexShrink: 1
        },
        button: { 
            alignSelf: 'center', 
            marginTop: 24, 
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
            width: '60%'
        },
    }), [theme.colors]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>
                    Пользовательское соглашение
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
                <Button 
                    mode="contained" 
                    style={styles.button} 
                    onPress={() => navigation.goBack()}
                    labelStyle={{ fontSize: 16 }}
                >
                    Вернуться
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TermsScreen;