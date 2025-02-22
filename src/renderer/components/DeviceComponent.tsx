import { IDevice } from '@/shared/interfaces'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FaComputer, FaX } from 'react-icons/fa6'

interface IDeviceComponent extends IDevice {
  onRemove: (id: string) => void
  onSelect?: (id: string) => void
  selected?: boolean
}
const DeviceComponent: React.FC<IDeviceComponent> = (props) => {
  return (
    <Flex
      className={`device-component ${props.selected ? 'selected' : ''}`}
      gap={'4'}
      justify={'between'}
      px={'4'}
      py={'1'}
      align={'center'}
      onClick={() => props.onSelect && props.onSelect(props.id)}
    >
      <Flex gap={'5'} align={'center'}>
        <FaComputer size={24} />
        <Flex direction={'column'}>
          <Text weight={'bold'}>{props.name}</Text>
          <Text weight={'light'} size={'1'}>
            {props.os}
          </Text>
        </Flex>
      </Flex>

      <IconButton color="gray" variant="ghost" onClick={() => props.onRemove(props.id)}>
        <FaX size={'12'} />
      </IconButton>
    </Flex>
  )
}

export default DeviceComponent
