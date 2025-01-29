import { Flex, Text } from '@radix-ui/themes'
import React from 'react'

interface IInfoBox {
  icon: JSX.Element
  title: string
  description: string
}

const InfoBox: React.FC<IInfoBox> = (props) => {
  return (
    <Flex
      p={'5'}
      width={'100%'}
      gap={'4'}
      align={'center'}
      style={{ backgroundColor: 'var(--gray-3)', borderRadius: 'var(--radius-3)' }}
    >
      {props.icon}
      <Flex direction={'column'}>
        <Text weight={'medium'} size={'4'}>
          {props.title}
        </Text>
        <Text>{props.description}</Text>
      </Flex>
    </Flex>
  )
}

export default InfoBox
