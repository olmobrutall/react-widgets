import cn from 'classnames'
import { DateUnit } from 'date-arithmetic'
import * as React from 'react'
import { useEffect, useRef } from 'react'
import { useUncontrolledProp } from 'uncontrollable'
import CalendarHeader from './CalendarHeader'
import Century from './Century'
import Decade from './Decade'
import { useLocalizer, DateFormats } from './Localization'
import Month, { RenderDayProp } from './Month'
import SlideTransitionGroup from './SlideTransitionGroup'
import Widget from './Widget'
import Year from './Year'
import { WidgetHTMLProps, WidgetProps, InferFormat } from './shared'

import dates from './dates'
import useAutoFocus from './useAutoFocus'
import useFocusManager from './useFocusManager'
import { notify, useInstanceId } from './WidgetHelpers'

type Direction = 'DOWN' | 'UP' | 'LEFT' | 'RIGHT'

type SlideDirection = 'bottom' | 'top' | 'left' | 'right'

let last: <T>(array: T[]) => T = (a) => a[a.length - 1]

const CELL_CLASSNAME = 'rw-cell'
const FOCUSED_CELL_SELECTOR = `.${CELL_CLASSNAME}[tabindex]`

const MIN = new Date(1900, 0, 1)
const MAX = new Date(2099, 11, 31)

const VIEW_OPTIONS: View[] = ['month', 'year', 'decade', 'century']

const VIEW_UNIT: Record<View, DateUnit> = {
  month: 'day',
  year: 'month',
  decade: 'year',
  century: 'decade',
}

const VIEW = {
  month: Month,
  year: Year,
  decade: Decade,
  century: Century,
}

const ARROWS_TO_DIRECTION = {
  ArrowDown: 'DOWN',
  ArrowUp: 'UP',
  ArrowRight: 'RIGHT',
  ArrowLeft: 'LEFT',
}

const OPPOSITE_DIRECTION: Record<'RIGHT' | 'LEFT', 'RIGHT' | 'LEFT'> = {
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

const MULTIPLIER = {
  year: 1,
  decade: 10,
  century: 100,
}

function inRangeValue(_value: Date | undefined | null, min: Date, max: Date) {
  let value = dateOrNull(_value)
  if (value === null) return value
  return dates.max(dates.min(value, max), min)
}

const useViewState = (views: View[], view = views[0], currentDate: Date) => {
  const lastView = useRef(view)
  const lastDate = useRef(currentDate)

  let slideDirection: SlideDirection
  if (view !== lastView.current) {
    slideDirection =
      views.indexOf(lastView.current) > views.indexOf(view) ? 'top' : 'bottom'
  } else if (lastDate.current !== currentDate) {
    slideDirection = dates.gt(currentDate, lastDate.current) ? 'left' : 'right'
  }

  useEffect(() => {
    lastDate.current = currentDate
    lastView.current = view
  })

  return slideDirection!
}

type View = 'month' | 'year' | 'decade' | 'century'

export interface CalendarProps<TLocalizer = unknown>
  extends WidgetHTMLProps,
  WidgetProps {
  bordered?: boolean
  views?: View[]
  disabled?: boolean
  readOnly?: boolean

  value?: Date | null
  defaultValue?: Date
  onChange?: (nextValue: Date) => void

  min?: Date
  max?: Date

  view?: View
  defaultView?: View
  onViewChange?: (nextView: View) => void

  currentDate?: Date
  defaultCurrentDate?: Date
  onCurrentDateChange?: (nextDate: Date) => void

  onNavigate?: (
    date: Date,
    slideDirection: SlideDirection,
    nextView: View,
  ) => void
  renderDay?: RenderDayProp
  formats?: DateFormats<InferFormat<TLocalizer>>

  messages?: {
    moveBack?: string
    moveForward?: string
    moveToday?: string
  }
}

/**
 * @public
 */
function Calendar({
  id,
  autoFocus,
  bordered = true,
  views = VIEW_OPTIONS,
  tabIndex = 0,
  disabled,
  readOnly,
  className,

  value,
  defaultValue,
  onChange,

  currentDate: pCurrentDate,
  defaultCurrentDate,
  onCurrentDateChange,

  min = MIN,
  max = MAX,

  view,
  defaultView = views[0],
  onViewChange,

  onKeyDown,
  onNavigate,
  renderDay,
  messages,
  formats,
  ...elementProps
}: CalendarProps) {
  const [currentValue, handleChange] = useUncontrolledProp(
    value,
    defaultValue,
    onChange,
  )
  const [currentDate, handleCurrentDateChange] = useUncontrolledProp(
    pCurrentDate,
    defaultCurrentDate || currentValue || new Date(),
    onCurrentDateChange,
  )
  const [currentView, handleViewChange] = useUncontrolledProp(
    view,
    defaultView,
    onViewChange,
  )

  const localizer = useLocalizer(messages, formats)
  const ref = useRef<HTMLDivElement>(null)

  const viewId = useInstanceId(id, '_calendar')
  const labelId = useInstanceId(id, '_calendar_label')

  useAutoFocus(!!autoFocus, ref)

  const slideDirection = useViewState(views, currentView, currentDate!)

  const [, focused] = useFocusManager(
    ref,
    { disabled },
    {
      willHandle() {
        if (tabIndex == -1) return false
      },
    },
  )

  const lastValue = useRef(currentValue)
  useEffect(() => {
    const inValue = inRangeValue(currentValue, min, max)
    const last = lastValue.current
    lastValue.current = currentValue

    if (!dates.eq(inValue, dateOrNull(last), VIEW_UNIT[currentView]))
      maybeSetCurrentDate(inValue)
  })

  const isDisabled = disabled || readOnly

  /**
   * Handlers
   */

  const handleViewChangeImpl = () => {
    navigate('UP')
  }

  const handleMoveBack = () => {
    navigate('LEFT')
  }

  const handleMoveForward = () => {
    navigate('RIGHT')
  }

  const handleDateChange = (date: Date) => {
    if (views[0] === currentView) {
      maybeSetCurrentDate(date)

      notify(handleChange, [date])

      focus()
      return
    }

    navigate('DOWN', date)
  }

  const handleMoveToday = () => {
    let date = new Date()
    let firstView = views[0]

    notify(onChange, [date])

    if (dates.inRange(date, min, max, firstView)) {
      focus()
      maybeSetCurrentDate(date)
      notify(handleViewChange, [firstView])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let ctrl = e.ctrlKey || e.metaKey
    let key = e.key
    let direction: Direction = ARROWS_TO_DIRECTION[
      key as keyof typeof ARROWS_TO_DIRECTION
    ] as Direction
    let unit = VIEW_UNIT[currentView]

    if (key === 'Enter') {
      e.preventDefault()
      return handleDateChange(currentDate)
    }

    if (direction) {
      if (ctrl) {
        e.preventDefault()
        navigate(direction)
      } else {
        const isRTL =
          getComputedStyle(e.currentTarget).getPropertyValue('direction') ===
          'rtl'

        if (isRTL && direction in OPPOSITE_DIRECTION)
          direction = OPPOSITE_DIRECTION[direction as 'LEFT' | 'RIGHT']

        let nextDate = Calendar.move(
          currentDate,
          min,
          max,
          currentView,
          direction,
        )

        if (!dates.eq(currentDate, nextDate, unit)) {
          e.preventDefault()

          if (dates.gt(nextDate, currentDate, currentView))
            navigate('RIGHT', nextDate)
          else if (dates.lt(nextDate, currentDate, currentView))
            navigate('LEFT', nextDate)
          else maybeSetCurrentDate(nextDate)
        }
      }
    }

    notify(onKeyDown, [e])
  }

  function navigate(direction: Direction, date?: Date) {
    let nextView = currentView
    let slideDir: SlideDirection =
      direction === 'LEFT' || direction === 'UP' ? 'right' : 'left'

    if (direction === 'UP')
      nextView = views[views.indexOf(currentView) + 1] || nextView

    if (direction === 'DOWN')
      nextView = views[views.indexOf(currentView) - 1] || nextView

    if (!date)
      date =
        ['LEFT', 'RIGHT'].indexOf(direction) !== -1
          ? nextDate(direction)
          : currentDate

    if (dates.inRange(date!, min, max, nextView)) {
      notify(onNavigate, [date!, slideDir, nextView])

      //this.focus()
      maybeSetCurrentDate(date)
      notify(handleViewChange, [nextView])
    }
  }

  const focus = () => {
    const node = ref.current?.querySelector(FOCUSED_CELL_SELECTOR) as any
    node?.focus()
  }

  const moveFocus = (node: HTMLElement, hadFocus: boolean) => {
    let current = document.activeElement

    if (hadFocus && (!current || !node.contains(current))) {
      node.focus()
    }
  }

  function maybeSetCurrentDate(date: Date | null | undefined) {
    let inRangeDate = inRangeValue(
      date ? new Date(date) : currentDate,
      min,
      max,
    )

    if (
      date === currentDate ||
      dates.eq(inRangeDate, dateOrNull(currentDate), VIEW_UNIT[currentView])
    )
      return

    notify(handleCurrentDateChange, [inRangeDate!])
  }

  function nextDate(direction: Direction) {
    let method = direction === 'LEFT' ? 'subtract' : 'add'

    let unit = currentView === 'month' ? currentView : 'year'
    let multi = (MULTIPLIER as any)[currentView] || 1

    return (dates as any)[method](currentDate, 1 * multi, unit)
  }

  function getHeaderLabel() {
    switch (currentView) {
      case 'month':
        return localizer.formatDate(currentDate, 'header')

      case 'year':
        return localizer.formatDate(currentDate, 'year')

      case 'decade':
        return localizer.formatDate(
          dates.startOf(currentDate, 'decade'),
          'decade',
        )
      case 'century':
        return localizer.formatDate(
          dates.startOf(currentDate, 'century'),
          'century',
        )
    }
  }

  let View = VIEW[currentView]
  let todayNotInRange = !dates.inRange(new Date(), min, max, currentView!)

  let key = currentView + '_' + dates[currentView](currentDate)

  // let elementProps = Props.pickElementProps(this),
  // let viewProps = pick(uncontrolledProps, View)

  const prevDisabled =
    isDisabled || !dates.inRange(nextDate('LEFT'), min, max, currentView!)

  const nextDisabled =
    isDisabled || !dates.inRange(nextDate('RIGHT'), min, max, currentView!)

  return (
    <Widget
      {...elementProps}
      role="group"
      ref={ref}
      focused={focused}
      disabled={disabled}
      readOnly={readOnly}
      tabIndex={tabIndex}
      className={cn(
        className,
        'rw-calendar',
        bordered && 'rw-calendar-contained',
      )}
    >
      <CalendarHeader
        label={getHeaderLabel()}
        labelId={labelId}
        localizer={localizer}
        upDisabled={isDisabled || currentView === last(views)}
        prevDisabled={prevDisabled}
        todayDisabled={isDisabled || todayNotInRange}
        nextDisabled={nextDisabled}
        onViewChange={handleViewChangeImpl}
        onMoveLeft={handleMoveBack}
        onMoveRight={handleMoveForward}
        onMoveToday={handleMoveToday}
      />
      <Calendar.Transition
        direction={slideDirection}
        onTransitionEnd={moveFocus}
      >
        <View
          key={key}
          min={min}
          max={max}
          id={viewId}
          value={currentValue}
          localizer={localizer}
          disabled={isDisabled}
          focusedItem={currentDate}
          onChange={handleDateChange}
          onKeyDown={handleKeyDown}
          aria-labelledby={labelId}
          renderDay={renderDay}
        />
      </Calendar.Transition>
    </Widget>
  )
}

function dateOrNull(dt?: Date | null) {
  if (dt && !isNaN(dt.getTime())) return dt
  return null
}

Calendar.displayName = 'Calendar'

// Calendar.defaultProps = {
//   min: new Date(1900, 0, 1),
//   max: new Date(2099, 11, 31),
//   views: VIEW_OPTIONS,
//   tabIndex: '0',
// }

Calendar.Transition = SlideTransitionGroup

Calendar.move = (
  date: Date,
  min: Date,
  max: Date,
  view: View,
  direction: Direction,
) => {
  let isMonth = view === 'month'
  let isUpOrDown = direction === 'UP' || direction === 'DOWN'
  let rangeUnit = view && VIEW_UNIT[view]
  let addUnit = isMonth && isUpOrDown ? 'week' : VIEW_UNIT[view]
  let amount = isMonth || !isUpOrDown ? 1 : 4
  let newDate

  if (direction === 'UP' || direction === 'LEFT') amount *= -1

  newDate = dates.add(date, amount, addUnit)

  return dates.inRange(newDate, min, max, rangeUnit) ? newDate : date
}

export default Calendar
