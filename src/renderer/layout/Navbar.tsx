import { ActivePageType, useGlobalStore } from '@/renderer/store/useGlobalStore'
import { Flex, Text, Tooltip } from '@radix-ui/themes'
import { FaInbox, FaLaptop, FaPencil, FaSignsPost } from 'react-icons/fa6'
import { useShallow } from 'zustand/react/shallow'

const Navbar: React.FC = () => {
  const pages = Object.keys(ActivePageType).map((page) => page as ActivePageType)

  const { activePage, setActivePage } = useGlobalStore(
    useShallow((state) => ({
      activePage: state.activePage,
      setActivePage: state.setActivePage
    }))
  )

  return (
    <Flex direction={'column'} align={'center'} gap={'5'} justify={'between'} className="navbar">
      <Flex direction={'column'} gap={'4'} align={'center'} flexGrow={'1'}>
        {pages.map((page) => (
          <Tooltip
            key={page}
            delayDuration={500}
            content={<Text size={'2'}>{page}</Text>}
            side="right"
          >
            <Flex
              mt={page === ActivePageType.Settings ? 'auto' : undefined}
              className="navbar-menu-item"
              data-active={page === activePage}
              onClick={() => setActivePage(page)}
              p={'2'}
            >
              {page === ActivePageType.Compose && <FaPencil size={18} />}
              {page === ActivePageType.Inbox && <FaInbox size={18} />}
              {page === ActivePageType.Sent && <FaSignsPost size={18} />}
              {page === ActivePageType.Settings && <FaLaptop size={18} />}
            </Flex>
          </Tooltip>
        ))}
      </Flex>
    </Flex>
  )
}

export default Navbar
