import ModuleGuard from '@/components/auth/ModuleGuard';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="ROOM_BOOKING">{children}</ModuleGuard>;
}
