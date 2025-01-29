import InfoBox from '@/renderer/components/InfoBox'
import { Flex, Link, Separator, Text } from '@radix-ui/themes'
import { FaComputer } from 'react-icons/fa6'

const Settings: React.FC = () => {
  return (
    <>
      <Separator
        style={{
          width: '100%',
          background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
        }}
      />
      <InfoBox description="Laptop" title="Pigon-Erdem" icon={<FaComputer size={'36'} />} />
      <Text mt={'6'} weight={'light'} color="gray" size={'2'}>
        About
      </Text>
      <Separator
        style={{
          width: '100%',
          background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
        }}
      />
      <Flex direction={'column'} gap={'3'} width={'100%'} align={'start'}>
        <Text size={'1'}>Air Share vX.X.X</Text>
        <Link size={'1'}>Help and Feedback</Link>
      </Flex>
    </>
  )
}

export default Settings
