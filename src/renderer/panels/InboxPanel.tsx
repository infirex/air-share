import InfoBox from '@/renderer/components/InfoBox'
import { Button, Flex, Progress, ScrollArea, Separator, Text } from '@radix-ui/themes'
import { FaFile, FaList } from 'react-icons/fa6'
import { useShallow } from 'zustand/react/shallow'
import DeviceComponent from '../components/DeviceComponent'
import { TransferStatus, useDeviceStore, useTransferStore } from '../store'
import { formatBytes } from '../Utils'
import { useEffect, useState } from 'react'

const InboxPanel: React.FC = () => {
  const { transfers, removeTransfer, updateTransferStatus } = useTransferStore(
    useShallow((state) => ({
      transfers: state.transfers,
      removeTransfer: state.removeTransfer,
      updateTransferStatus: state.updateTransferStatus
    }))
  )

  const [transferProgress, setTransferProgress] = useState<Map<string, number>>(new Map()) // transfer id, progress

  const { devices } = useDeviceStore(useShallow((state) => ({ devices: state.devices })))

  const getSenderByID = (senderID: string) => devices.find((device) => device.id === senderID)

  const handleAcceptTransfer = (transferID: string) => {
    updateTransferStatus(transferID, TransferStatus.ACCEPTED)

    window.api.approveTransfer(transferID, true)
  }

  useEffect(() => {
    window.api.progressInfo((transferID, progress) => {
      setTransferProgress((prev) => {
        const newMap = new Map(prev)

        if (progress === 100) {
          newMap.delete(transferID) // delete when progress is 100
        } else {
          newMap.set(transferID, progress) // set or update
        }
        return newMap
      })
    })

    return () => window.api.removeEventListener('progress-info')
  }, [])

  const handleRejectTransfer = (transferID: string) => {
    updateTransferStatus(transferID, TransferStatus.REJECTED)
    window.api.approveTransfer(transferID, false)
  }

  return transfers?.length ? (
    <ScrollArea style={{ paddingInline: 'var(--space-4)' }}>
      <Flex flexGrow={'1'} direction={'column'} width={'100%'} gap={'6'}>
        {transfers.map((transfer) => (
          <Flex height={'100%'} key={transfer.id} direction={'column'} p={'1'} gap={'1'}>
            <Separator
              style={{
                width: '100%',
                background: 'radial-gradient(circle, var(--gray-9), rgba(255, 255, 255, 0))'
              }}
            />
            <DeviceComponent
              name={getSenderByID(transfer.senderID)?.name ?? ''}
              os={getSenderByID(transfer.senderID)?.os}
              id={transfer.id}
              onRemove={removeTransfer}
            />
            <Flex direction={'column'} maxHeight={'10rem'} gap={'3'} className="file-list">
              <ScrollArea scrollbars="vertical" className="file-list-scrollarea">
                <Flex direction={'column'} gap={'5'} p={'5'}>
                  {transfer.files.map((file, index) => (
                    <Flex key={index} justify={'between'} align={'center'}>
                      <Flex align={'center'} gap={'3'}>
                        <FaFile size={16} />
                        <Text size={'1'}>{file.name}</Text>
                      </Flex>
                      <Flex gap={'5'} align={'center'} className="file-list-info">
                        <Text size={'1'} weight={'light'}>
                          {formatBytes(file.size)}
                        </Text>
                      </Flex>
                    </Flex>
                  ))}
                </Flex>
              </ScrollArea>
            </Flex>
            {transferProgress.has(transfer.id) && (
              <Progress size={'1'} value={transferProgress.get(transfer.id)} color="green" />
            )}
            <Flex gapX={'1'} align={'center'}>
              {transfer.status == TransferStatus.PENDING ? (
                <>
                  <Button
                    onClick={() => handleAcceptTransfer(transfer.id)}
                    style={{ width: '50%' }}
                    size={'4'}
                    color="green"
                    variant="outline"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleRejectTransfer(transfer.id)}
                    style={{ width: '50%' }}
                    size={'4'}
                    color="red"
                    variant="outline"
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <Button
                  style={{ width: '100%' }}
                  color={transfer.status === TransferStatus.ACCEPTED ? 'green' : 'red'}
                  size={'4'}
                  variant="outline"
                  disabled
                >
                  {transfer.status === TransferStatus.ACCEPTED && 'ACCEPTED'}
                  {transfer.status === TransferStatus.REJECTED && 'REJECTED'}
                </Button>
              )}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </ScrollArea>
  ) : (
    // no transfer
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

export default InboxPanel
