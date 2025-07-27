import cn from 'classnames'
import * as React from 'react'

interface Props extends Omit<React.HTMLProps<HTMLDivElement>, 'onSelect'> {
  component?: React.ElementType
}

function ListOptionGroup({ children, className, component = 'div' }: Props) {
  let Tag = component
  return (
    <Tag
      tabIndex="-1"
      role="separator"
      className={cn(className, 'rw-list-optgroup')}
    >
      {children}
    </Tag>
  )
}

export default ListOptionGroup
