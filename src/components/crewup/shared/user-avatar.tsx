'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PublicUser } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function UserAvatar({ user, className }: { user: Pick<PublicUser, 'name' | 'avatarUrl'>; className?: string }) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <Avatar className={cn('border border-border', className)}>
      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
    </Avatar>
  )
}
