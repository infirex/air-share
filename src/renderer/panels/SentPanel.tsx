import InfoBox from '@/renderer/components/InfoBox'
import { Separator } from '@radix-ui/themes'
import { FaList } from 'react-icons/fa6'

const SentPanel: React.FC = () => {
  return (
    <>
      <Separator
        style={{
          width: '100%',
          background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
        }}
      />
      <InfoBox
        Icon={FaList}
        description="Expecting something? Start the transfer from the sending device."
        title="Nothing here yet"
      />
    </>
  )
}

export default SentPanel
