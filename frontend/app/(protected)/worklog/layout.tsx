import ModuleGuard from '@/components/auth/ModuleGuard';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="WORK_LOG">{children}</ModuleGuard>;
}
