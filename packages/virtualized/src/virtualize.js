import * as React from 'react'

import VirtualList, {
  getVirtualListProps,
} from './VirtualList'

export default function virtualize(Widget) {
  let name = Widget.name || Widget.displayName || 'Widget'
  name = name[0] + name.slice(1)

  return class extends React.Component {
    static displayName = `Virtual${name}`

    render() {
      const { listProps, props } = getVirtualListProps(this.props)

      return (
        <Widget {...props} listComponent={VirtualList} listProps={listProps} />
      )
    }
  }
}
