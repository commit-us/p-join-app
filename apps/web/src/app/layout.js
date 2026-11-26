import "./globals.css";

export const metadata = {
  title: "P Join",
  description: "함께 만들 프로젝트와 팀원을 찾는 P Join",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
