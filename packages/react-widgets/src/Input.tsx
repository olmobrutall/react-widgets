import cn from 'classnames'
import * as React from 'react'

export interface InputProps extends React.AllHTMLAttributes<HTMLInputElement> {
  component?: React.ElementType
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      disabled,
      readOnly,
      value,
      tabIndex,
      type = 'text',
      component: Component = 'input',
      ...props
    },
    ref,
  ) => (
    <Component
      {...props}
      ref={ref}
      type={type}
      tabIndex={tabIndex || 0}
      autoComplete="off"
      disabled={disabled}
      readOnly={readOnly}
      aria-disabled={disabled}
      aria-readonly={readOnly}
      value={value == null ? '' : value}
      className={cn(className, 'rw-input')}
    />
  ),
)

Input.displayName = 'Input'

export default Input
