import * as React from 'react'
import { ReactNode } from 'react'

import ListOption from './ListOption'

export const CREATE_OPTION = {}

export interface AddToListOptionProps {
  children: ReactNode
  onSelect: (event: React.MouseEvent) => void
}

function AddToListOption({ children, ...props }: AddToListOptionProps) {
  return (
    <ListOption
      {...props}
      dataItem={CREATE_OPTION}
      className={'rw-list-option-create'}
      selected={false}
    >
      {children}
    </ListOption>
  )
}


export default AddToListOption
