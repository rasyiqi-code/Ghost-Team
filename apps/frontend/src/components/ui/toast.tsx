import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={8}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          title: 'text-sm font-semibold',
          description: 'text-xs text-muted-foreground',
          error: 'group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive',
          success: 'group-[.toaster]:border-emerald-500/30',
          closeButton:
            'group-[.toaster]:bg-background group-[.toaster]:text-muted-foreground group-[.toaster]:border-border group-[.toaster]:hover:text-foreground',
        },
      }}
    />
  )
}
