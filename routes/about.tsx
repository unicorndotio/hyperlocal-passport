import { define } from '@/utils.ts'
import { Countdown } from '@/islands/Countdown.tsx'

export default define.page(() => {
  return (
    <main>
      <h1>About</h1>
      <p>This is the about page.</p>
      <Countdown />
    </main>
  )
})
