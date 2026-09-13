import { Link } from 'react-router-dom';

export function NotFoundScreen() {
  return (
    <section className="panel empty">
      <div className="eyebrow">A LITTLE DETOUR</div>
      <h1>아직 길이 나지 않은 곳이에요.</h1>
      <p>주소를 확인하거나 생각숲의 첫 화면으로 돌아가 주세요.</p>
      <Link className="btn" to="/">
        마을로 돌아가기
      </Link>
    </section>
  );
}
