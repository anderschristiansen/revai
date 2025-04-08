import { ProtectedRoute } from "@/components/protected-route"

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>
} 