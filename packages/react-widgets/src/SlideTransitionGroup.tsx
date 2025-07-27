import cn from 'classnames'
import transitionEnd from 'dom-helpers/transitionEnd'
import * as React from 'react'


const prefix = 'rw-calendar-transition'
const active = 'rw-calendar-transition-active'
const next = 'rw-calendar-transition-next'
const prev = 'rw-calendar-transition-prev'

const clone = (el: React.ReactElement<{ className?: string }> | null | undefined, cls: string) =>
  el &&
  React.cloneElement(el, {
    className: cn(el.props.className, prefix, cls),
  })

interface SlideTransitionGroupProps {
  onTransitionEnd: (node: ChildNode, hadFocus: boolean | null) => void
  direction: 'left' | 'right' | 'top' | 'bottom';
  children: React.ReactElement<{ className?: string }>;
}

interface SlideTransitionGroupState {
  prevClasses: string
  currentClasses: string
}

class SlideTransitionGroup extends React.Component<
  SlideTransitionGroupProps,
  SlideTransitionGroupState
> {
  static defaultProps = {
    direction: 'left',
  }

  isTransitioning?: boolean
  container: React.RefObject<HTMLDivElement | null>
  current: React.ReactElement<{ className?: string }> | null;
  flush?: boolean
  prev?: React.ReactElement<{ className?: string }> | null

  constructor(args: SlideTransitionGroupProps) {
    super(args)

    this.current = this.props.children;
    this.container = React.createRef<HTMLDivElement>();

    this.state = {
      prevClasses: '',
      currentClasses: '',
    }
  }

  componentDidUpdate() {
    if (!this.flush || this.isTransitioning) return

    this.flush = false
    this.isTransitioning = true

    let previous = this.container.current!.firstChild!
    const hadFocus =
      document.activeElement && previous.contains(document.activeElement)

    this.setState({ prevClasses: '', currentClasses: next }, () => {
      let current = this.container.current!.lastChild! as HTMLElement

      current.clientHeight // eslint-disable-line

      this.setState(
        {
          prevClasses: prev,
          currentClasses: cn(next, active),
        },
        () => {
          transitionEnd(current, () => {
            this.prev = null

            if (
              (this.current as any).key !== (this.props.children as any).key
            ) {
              this.current = this.props.children;
            }

            this.setState({ prevClasses: '', currentClasses: '' }, () =>
              this.handleTransitionEnd(hadFocus),
            )
          })
        },
      )
    })
  }

  handleTransitionEnd = (hadFocus: boolean | null) => {
    this.isTransitioning = false
    let current = this.container.current!.lastChild!
    if (this.props.onTransitionEnd)
      this.props.onTransitionEnd(current, hadFocus)
  }

  render() {
    let { direction, children, onTransitionEnd: _, ...props } = this.props

    if (!this.isTransitioning) {
      if ((this.current as any).key !== (children as any).key) {
        this.prev = this.current
        this.flush = true
      }

      this.current = children;
    }

    let { prevClasses, currentClasses } = this.state
    return (
      <div
        {...props}
        ref={this.container}
        className={cn(
          `rw-calendar-transition-group`,
          direction === 'top' && 'rw-calendar-transition-top',
          direction === 'right' && 'rw-calendar-transition-right',
          direction === 'bottom' && 'rw-calendar-transition-bottom',
          direction === 'left' && 'rw-calendar-transition-left',
        )}
      >
        {clone(this.prev, prevClasses)}
        {clone(this.current, currentClasses)}
      </div>
    )
  }
}

export default SlideTransitionGroup
