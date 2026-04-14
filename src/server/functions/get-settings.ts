import { createServerFn } from '@tanstack/react-start'
import { homedir as osHomedir } from 'node:os'

export const homedir = createServerFn({ method: 'GET' }).handler(async () => {
  return osHomedir()
})
