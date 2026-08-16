import type { Metadata } from "next";

// Login sahifasiga o'z sarlavhasi (root template bilan: "Kirish — <Brend>").
export const metadata: Metadata = {
  title: "Kirish",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
