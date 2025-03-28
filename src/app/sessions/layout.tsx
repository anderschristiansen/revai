import { ProtectedRoute } from "@/components/protected-route"

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>
} 