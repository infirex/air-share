import '@radix-ui/themes/styles.css'
import '@/assets/styles/main.css'
import { Flex } from '@radix-ui/themes'
import Navbar from './layout/Navbar'
import Panel from './layout/Panel'

function App() {
  return (
    <Flex direction={'row'} height={'100vh'}>
      <Navbar />
      <Panel />
    </Flex>
  )
}

export default App
