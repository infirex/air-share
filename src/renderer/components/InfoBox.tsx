import { Flex, Text } from '@radix-ui/themes'
import React from 'react'

interface IInfoBox {
  Icon: React.ElementType
  title: string
  description: string
}

const InfoBox: React.FC<IInfoBox> = ({ Icon, description, title }) => {
  return (
    <Flex
      p={'4'}
      width={'100%'}
      gap={'4'}
      align={'center'}
      style={{ backgroundColor: 'var(--gray-3)', borderRadius: 'var(--radius-3)' }}
    >
      <Icon size={'20'} />
      <Flex direction={'column'} gap={'1'}>
        <Text weight={'medium'} size={'2'}>
          {title}
        </Text>
        <Text size={'1'}>{description}</Text>
      </Flex>
    </Flex>
  )
}

export default InfoBox
