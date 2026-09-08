import { Card, Description, Screen, Title } from '../components';

export function NotFoundScreen() {
  return (
    <Screen>
      <Card>
        <Title accessibilityRole="header">페이지를 찾을 수 없습니다</Title>
        <Description>주소를 확인하거나 이전 화면으로 돌아가 주세요.</Description>
      </Card>
    </Screen>
  );
}
