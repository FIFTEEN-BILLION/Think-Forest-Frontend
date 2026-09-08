import { Card, Description, Screen, Title } from '../components';

export function HomeScreen() {
  return (
    <Screen>
      <Card>
        <Title accessibilityRole="header">JJCP</Title>
        <Description>프로젝트를 시작할 준비가 되었습니다.</Description>
        <Description>웹과 앱이 같은 화면을 공유합니다.</Description>
      </Card>
    </Screen>
  );
}
