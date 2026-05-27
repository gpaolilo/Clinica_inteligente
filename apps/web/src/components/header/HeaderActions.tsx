import React from 'react'
import { NotificationButton } from './NotificationButton'
import { SettingsButton } from './SettingsButton'
import { UserAvatar } from './UserAvatar'

interface HeaderActionsProps {
  initial: string
  onProfileClick: () => void
  onNotificationsClick?: () => void
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  initial,
  onProfileClick,
  onNotificationsClick
}) => {
  return (
    <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
      <NotificationButton count={3} onClick={onNotificationsClick} />
      <SettingsButton />
      <div className="h-6 w-px bg-slate-200/60 hidden sm:block"></div>
      <UserAvatar initial={initial} onClick={onProfileClick} />
    </div>
  )
}
