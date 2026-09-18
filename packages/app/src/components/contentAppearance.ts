const categories: Record<string, { label: string; emoji: string; color: string; icon: string }> = {
  SCIENCE: { label: '과학', emoji: '🧊', color: 'teal', icon: 'flask' },
  MATH: { label: '수학', emoji: '🧩', color: 'gold', icon: 'spark' },
  HISTORY: { label: '역사', emoji: '🏺', color: 'coral', icon: 'book' },
  THINKING: { label: '생각', emoji: '💡', color: 'violet', icon: 'spark' },
  DAILY_LIFE: { label: '일상', emoji: '🌱', color: 'teal', icon: 'home' },
  NATURE: { label: '자연', emoji: '🌿', color: 'teal', icon: 'leaf' },
  FEELINGS: { label: '마음', emoji: '🌷', color: 'coral', icon: 'heart' },
  IMAGINATION: { label: '상상', emoji: '✨', color: 'violet', icon: 'spark' },
};
export const contentAppearance = (category: string) =>
  categories[category] ?? { label: '생각 이야기', emoji: '📖', color: 'teal', icon: 'book' };
