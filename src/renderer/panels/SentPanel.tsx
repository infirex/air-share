import InfoBox from '@/renderer/components/InfoBox'
import { Separator } from '@radix-ui/themes'
import { useDropzone } from 'react-dropzone'
import { FaList } from 'react-icons/fa6'

const SentPanel: React.FC = () => {
  const { getRootProps, getInputProps } = useDropzone({
    useFsAccessApi: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    }
  })

  return (
    <>
      <Separator
        style={{
          width: '100%',
          background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
        }}
      />
      <InfoBox
        icon={<FaList size={'24'} />}
        description="Expecting something? Start the transfer from the sending device."
        title="Nothing here yet"
      />
    </>
  )
}

export default SentPanel
