import cn from 'classnames'
import * as React from 'react'

function WidgetPicker({
  className,
  ...props
}: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        className,
        'rw-widget-picker',
        'rw-widget-container'
      )}
    />
  )
}

export default WidgetPicker
