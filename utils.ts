import { createDefine } from 'fresh'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  status?: string
  [key: string]: unknown
}

export interface SessionSession {
  id: string
  userId: string
  [key: string]: unknown
}

export interface State {
  user: SessionUser | null
  session: SessionSession | null
}

export const define = createDefine<State>()
