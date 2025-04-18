import { StyleSheet } from 'react-native';

export const getGlobalStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    headerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamily,
    },
    text: {
      color: theme.colors.onSurface,
      fontFamily: theme.fontFamily,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
      borderRadius: 8,
      paddingHorizontal: theme.spacing.sm,
      fontFamily: theme.fontFamily,
    },
  });
