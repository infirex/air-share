import { IDevice, IFile } from '@/shared/interfaces'
import { useDeviceStore } from '@/renderer/store/useDeviceStore'
import { Badge, Button, Flex, IconButton, ScrollArea, Separator, Text } from '@radix-ui/themes'
import { FileRejection, useDropzone } from 'react-dropzone'
import {
  FaArrowDown,
  FaBoxArchive,
  FaComputer,
  FaFile,
  FaFileAudio,
  FaFilePdf,
  FaFileVideo,
  FaImage,
  FaLaptopCode,
  FaPaste,
  FaX
} from 'react-icons/fa6'
import { useList } from 'react-use'
import { useShallow } from 'zustand/react/shallow'
import { useEffect } from 'react'

interface IDeviceComponent extends IDevice {
  onRemove: (id: string) => void
  onSelect: (id: string) => void
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
      onClick={() => props.onSelect(props.id)}
    >
      <Flex gap={'5'} align={'center'}>
        <FaComputer size={30} />
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

const ComposePanel: React.FC = () => {
  const [files, handlers] = useList<IFile>([])

  const { devices, removeDevice, addDevice, selectDevice, selectedDevice } = useDeviceStore(
    useShallow((state) => ({
      devices: state.devices,
      removeDevice: state.removeDevice,
      selectDevice: state.selectDevice,
      selectedDevice: state.selectedDevice,
      addDevice: state.addDevice
    }))
  )

  useEffect(() => {
    window.api.onDiscoverDevice(addDevice)
  }, [])

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onerror = () => console.log('Error reading file')

      reader.onload = async () => {
        console.log(file.type)
        handlers.push({
          id: crypto.randomUUID(), // TODO: handle this
          name: file.name,
          path: file.path,
          size: file.size,
          type: file.type
        })
      }

      reader.readAsArrayBuffer(file)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    useFsAccessApi: false,
    maxSize: 10 * 1024 * 1024 * 1024 // 10GB
  })
  console.log(isDragActive)
  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = sizes[i]

    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))
    return `${value} ${size}`
  }

  const getFileTypeIcon = (fileType: string): JSX.Element => {
    const size = 16
    const type = fileType.split('/')[0].toLowerCase()

    switch (type) {
      case 'text':
        return <FaFile size={size} />

      case 'image':
        return <FaImage size={size} />

      case 'application':
        if (fileType === 'application/pdf') {
          return <FaFilePdf size={size} />
        } else if (fileType === 'application/zip' || fileType === 'application/x-rar-compressed') {
          return <FaBoxArchive size={size} />
        }
        return <FaLaptopCode size={size} />

      case 'audio':
        return <FaFileAudio size={size} />

      case 'video':
        return <FaFileVideo size={size} />

      default:
        console.log('Unknown file type:', fileType)
        return <FaFile size={size} />
    }
  }

  return (
    <>
      {files.length > 0 && (
        <Flex direction={'column'} width={'100%'} maxHeight={'30%'} gap={'3'} className="file-list">
          <Flex justify={'end'} align={'center'} gap={'3'} className="file-list-utils">
            <IconButton color="gray" variant="ghost">
              <FaPaste size={12} />
            </IconButton>
            <IconButton onClick={() => handlers.clear()} color="gray" variant="ghost">
              <FaX size={12} />
            </IconButton>
          </Flex>
          <ScrollArea scrollbars="vertical" className="file-list-scrollarea">
            <Flex direction={'column'} gap={'5'} p={'5'}>
              {files.map((file, index) => (
                <Flex key={file.id} justify={'between'} align={'center'}>
                  <Flex align={'center'} gap={'3'}>
                    {getFileTypeIcon(file.type)}
                    <Text size={'1'}>{file.name}</Text>
                  </Flex>
                  <Flex gap={'5'} align={'center'} className="file-list-info">
                    <Text size={'1'} weight={'light'}>
                      {formatBytes(file.size)}
                    </Text>
                    <IconButton
                      color="gray"
                      variant="ghost"
                      onClick={() => handlers.removeAt(index)}
                    >
                      <FaX size={'12'} />
                    </IconButton>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          </ScrollArea>
        </Flex>
      )}

      <Flex {...getRootProps()} width={'100%'}>
        <input {...getInputProps()} />
        <Flex className="dropzone-area" flexGrow={'1'} justify={'start'} align={'center'} gap={'4'}>
          {isDragActive ? (
            <>
              <FaArrowDown className="animated-arrow" />
              <Text align={'center'}>Drop files here</Text>
            </>
          ) : (
            <>
              <FaFile />
              <Text>Drag and drop files here or click to upload</Text>
            </>
          )}
        </Flex>
      </Flex>

      <Badge size={'3'} color="indigo" radius="full" variant="surface">
        <FaComputer size={21} />
      </Badge>
      <Separator
        style={{
          width: '100%',
          background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
        }}
      />
      <ScrollArea style={{ flex: '1' }}>
        <Flex direction={'column'} px={'3'} gap={'3'}>
          {devices?.map((device) => (
            <DeviceComponent
              key={device.id}
              id={device.id}
              name={device.name}
              selected={device.id === selectedDevice?.id}
              onSelect={selectDevice}
              onRemove={removeDevice}
              os={device.os}
            />
          ))}
        </Flex>
      </ScrollArea>

      <Button
        disabled={!selectedDevice}
        mt={'auto'}
        size={'3'}
        variant="outline"
        color="gray"
        style={{ width: '100%' }}
      >
        Send
      </Button>
    </>
  )
}

export default ComposePanel
