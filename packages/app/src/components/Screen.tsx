import styled from '@emotion/native';

export const Screen = styled.View(({ theme }) => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing.lg,
  backgroundColor: theme.colors.background,
}));

export const Card = styled.View(({ theme }) => ({
  width: '100%',
  maxWidth: 560,
  padding: theme.spacing.lg,
  gap: theme.spacing.md,
  borderRadius: 20,
  backgroundColor: theme.colors.surface,
  borderWidth: 1,
  borderColor: theme.colors.border,
}));

export const Title = styled.Text(({ theme }) => ({
  color: theme.colors.text,
  fontSize: 28,
  fontWeight: '700',
}));

export const Description = styled.Text(({ theme }) => ({
  color: theme.colors.muted,
  fontSize: 16,
  lineHeight: 26,
}));
