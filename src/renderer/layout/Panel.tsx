import ComposePanel from '@/renderer/panels/ComposePanel'
import InboxPanel from '@/renderer/panels/InboxPanel'
import SentPanel from '@/renderer/panels/SentPanel'
import Settings from '@/renderer/panels/Settings'
import { Flex, Text } from '@radix-ui/themes'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  useTransferStore,
  ActivePageType,
  useGlobalStore,
  TransferStatus,
  useDeviceStore
} from '@/renderer/store'

const Panel: React.FC = () => {
  const { activePage, setActivePage } = useGlobalStore(
    useShallow((state) => ({
      activePage: state.activePage,
      setActivePage: state.setActivePage
    }))
  )

  const { addDevice } = useDeviceStore(useShallow((state) => ({ addDevice: state.addDevice })))

  const { addNewTransfer } = useTransferStore(
    useShallow((state) => ({
      addNewTransfer: state.addNewTransfer
    }))
  )

  useEffect(() => {
    window.api.onDiscoverDevice(addDevice)

    return () => window.api.removeEventListener('discover-device')
  }, [])

  useEffect(() => {
    window.api.listenIncomingTransfer((newTransfer) => {
      addNewTransfer({
        date: new Date()
          .toLocaleString('en-EN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          .replace(',', ''),
        files: newTransfer.files,
        id: newTransfer.socketID,
        senderID: newTransfer.deviceID,
        status: TransferStatus.PENDING
      })

      setActivePage(ActivePageType.Inbox)
    })

    return () => window.api.removeEventListener('new-transfer')
  }, [])

  return (
    <Flex direction={'column'} p={'5'} gap={'4'} align={'center'} flexGrow={'1'}>
      <Text size={'4'}>{activePage}</Text>
      {activePage === ActivePageType.Compose && <ComposePanel />}
      {activePage === ActivePageType.Inbox && <InboxPanel />}
      {activePage === ActivePageType.Sent && <SentPanel />}
      {activePage === ActivePageType.Settings && <Settings />}
    </Flex>
  )
}

export default Panel
