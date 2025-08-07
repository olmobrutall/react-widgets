import cn from 'classnames'
import { useImperativeHandle, useRef, useCallback } from 'react'
import * as React from 'react'
import { useUncontrolled } from 'uncontrollable'
import Calendar, { CalendarProps } from './Calendar'
import DatePickerInput, { DatePickerInputProps } from './DatePickerInput'
import { calendar } from './Icon'
import { useLocalizer, DateFormats } from './Localization'
import BasePopup, { PopupProps } from './Popup'
import TimeInput, { TimeInputProps } from './TimeInput'
import Widget, { WidgetProps } from './Widget'
import WidgetPicker from './WidgetPicker'
import dates from './dates'
import useDropdownToggle from './useDropdownToggle'
import useTabTrap from './useTabTrap'
import useFocusManager from './useFocusManager'
import { notify, useFirstFocusedRender, useInstanceId } from './WidgetHelpers'

import { TransitionProps } from 'react-transition-group/Transition'
import { WidgetHTMLProps, InferFormat } from './shared'
import useEventCallback from '@restart/hooks/useEventCallback'
import InputAddon from './InputAddon'
import { SlideDownTransitionProps } from './SlideDownTransition'
import { omitUndefined } from './omitUndefined'

const defaultProps: Partial<CalendarProps> = {
  ...(Calendar as any).defaultProps,

  min: new Date(1900, 0, 1),
  max: new Date(2099, 11, 31),
  selectIcon: calendar,
  formats: {},
}

export interface DatePickerProps<TLocalizer = unknown>
  extends Omit<WidgetHTMLProps, 'onChange' | 'defaultValue'>,
  Omit<WidgetProps, 'onChange' | 'onSelect' | 'defaultValue' | 'onToggle'> {

  ref?: React.Ref<DatePickerHandle>,

  /**
   * @example ['valuePicker', [ ['new Date()', null] ]]
   */
  value?: Date | null

  defaultValue?: Date | null

  /**
   * @example ['onChangePicker', [ ['new Date()', null] ]]
   */
  onChange?: (date: Date | null | undefined, rawValue: string) => void

  /**
   * @example ['openDateTime']
   */
  open?: boolean
  onToggle?: (isOpen: boolean) => void

  /**
   * Default current date at which the calendar opens. If none is provided, opens at today's date or the `value` date (if any).
   */
  currentDate?: Date

  /**
   * Change event Handler that is called when the currentDate is changed. The handler is called with the currentDate object.
   */
  onCurrentDateChange?: () => void

  onSelect?: (date: Date | null, rawValue: string) => void

  /**
   * The minimum Date that can be selected. Min only limits selection, it doesn't constrain the date values that
   * can be typed or pasted into the widget. If you need this behavior you can constrain values via
   * the `onChange` handler.
   *
   * @example ['prop', ['min', 'new Date()']]
   */
  min?: Date

  /**
   * The maximum Date that can be selected. Max only limits selection, it doesn't constrain the date values that
   * can be typed or pasted into the widget. If you need this behavior you can constrain values via
   * the `onChange` handler.
   *
   * @example ['prop', ['max', 'new Date()']]
   */
  max?: Date

  /**
   * The amount of minutes between each entry in the time list.
   *
   * @example ['prop', { step: 90 }]
   */
  step?: number

  /**
   * Enable the time list component of the picker.
   */
  includeTime?: boolean

  timePrecision?: 'minutes' | 'seconds' | 'milliseconds'

  timeInputProps?: Partial<TimeInputProps>

  /** Specify the element used to render the calendar dropdown icon. */
  selectIcon?: React.ReactNode

  /**
   * @example ['prop', { dropUp: true }]
   */
  dropUp?: boolean

  popupProps?: object
  popupTransition?: React.ComponentType<SlideDownTransitionProps>
  popupComponent?: React.ComponentType<PopupProps>

  placeholder?: string
  name?: string
  autoFocus?: boolean
  /**
   * @example ['disabled', ['new Date()']]
   */
  disabled?: boolean
  /**
   * @example ['readOnly', ['new Date()']]
   */
  readOnly?: boolean

  /**
   * Determines how the widget parses the typed date string into a Date object. You can provide a date format
   * or a function that returns a date to handle parsing yourself. When `parse` is unspecified and
   * the default `localizer.parse` is used and passed the string as well as `valueDisplayFormat` or `valueEditFormat`.
   */
  parse?: string | ((str: string, localizer?: TLocalizer) => Date | undefined)

  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onKeyPress?: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onBlur?: () => void
  onFocus?: () => void

  /** Adds a css class to the input container element. */
  containerClassName?: string

  calendarProps?: Partial<CalendarProps>
  inputProps?: Partial<DatePickerInputProps>

  valueFormat?: InferFormat<TLocalizer>
  valueDisplayFormat?: InferFormat<TLocalizer>
  valueEditFormat?: InferFormat<TLocalizer>

  formats?: DateFormats<InferFormat<TLocalizer>>

  messages?: CalendarProps['messages'] & {
    dateButton?: string
  }
}

export interface DatePickerHandle {
  focus(): void
}

/**
 * ---
 * subtitle: DatePicker, TimePicker
 * localized: true
 * shortcuts:
 *   - { key: alt + down arrow, label:  open calendar or time }
 *   - { key: alt + up arrow, label: close calendar or time }
 *   - { key: down arrow, label: move focus to next item }
 *   - { key: up arrow, label: move focus to previous item }
 *   - { key: home, label: move focus to first item }
 *   - { key: end, label: move focus to last item }
 *   - { key: enter, label: select focused item }
 *   - { key: any key, label: search list for item starting with key }
 * ---
 *
 * @public
 * @extends Calendar
 */
function DatePicker(props: DatePickerProps) {
  const {
    id,
    value,
    onChange,
    onSelect,
    onToggle,
    onKeyDown,
    onKeyPress,
    onCurrentDateChange,
    inputProps,
    calendarProps,
    timeInputProps,
    popupProps,
    autoFocus,
    tabIndex,
    disabled,
    readOnly,
    className,
    // @ts-ignore
    valueFormat,
    valueDisplayFormat = valueFormat,
    valueEditFormat = valueFormat,
    containerClassName,
    name,
    selectIcon,
    placeholder,
    includeTime = false,
    min,
    max,
    open,
    dropUp,
    parse,
    messages,
    formats,
    currentDate,
    popupTransition,
    popupComponent: Popup = BasePopup,
    timePrecision,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    ref: outerRef,
    ...elementProps
  } = useUncontrolled({ ...defaultProps, ...omitUndefined(props) }, {
    open: 'onToggle',
    value: 'onChange',
    currentDate: 'onCurrentDateChange',
  })
  const localizer = useLocalizer(messages, formats)

  const ref = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLDivElement>(null)

  const tabTrap = useTabTrap(calRef)

  const inputId = useInstanceId(id, '_input')
  const dateId = useInstanceId(id, '_date')

  const currentFormat = includeTime ? 'datetime' : 'date'

  const toggle = useDropdownToggle(open, onToggle!)

  const [focusEvents, focused] = useFocusManager(ref, props, {
    didHandle(focused) {
      if (!focused) {
        toggle.close()
        tabTrap.stop()
      } else if (open) {
        tabTrap.focus()
      }
    },
  })

  const dateParser = useCallback(
    (str: string) => {
      if (typeof parse == 'function') {
        return parse(str, localizer) ?? null
      }

      return (
        localizer.parseDate(
          str,
          parse ?? valueEditFormat ?? valueDisplayFormat,
        ) ?? null
      )
    },
    [localizer, parse, valueDisplayFormat, valueEditFormat],
  )
  /**
   * Handlers
   */

  const handleChange = useEventCallback(
    (date: Date | null | undefined, str: string, constrain?: boolean) => {
      if (readOnly || disabled) return
      if (constrain) date = inRangeValue(date)

      if (onChange) {
        if (date == null || value == null) {
          if (
            date != value //eslint-disable-line eqeqeq
          )
            onChange(date, str)
        } else if (!dates.eq(date, value)) {
          onChange(date, str)
        }
      }
    },
  )

  const handleKeyDown = useEventCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) return

      notify(onKeyDown, [e])

      if (e.defaultPrevented) return

      if (e.key === 'Escape' && open) {
        toggle.close()
      } else if (e.altKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          toggle.open()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          toggle.close()
        }
      }
    },
  )

  const handleKeyPress = useEventCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      notify(onKeyPress, [e])

      if (e.defaultPrevented) return
    },
  )

  const handleDateSelect = useEventCallback((date) => {
    let dateTime = dates.merge(date, value, currentDate)
    let dateStr = formatDate(date)

    if (!includeTime) toggle.close()

    notify(onSelect, [dateTime, dateStr])
    handleChange(dateTime, dateStr, true)
    ref.current?.focus()
  })

  const handleTimeChange = useEventCallback((date) => {
    handleChange(date, formatDate(date), true)
  })

  const handleCalendarClick = useEventCallback((e: React.MouseEvent) => {
    if (readOnly || disabled) return

    // prevents double clicks when in a <label>
    e.preventDefault()
    toggle()
  })

  const handleOpening = () => {
    tabTrap.start()
    requestAnimationFrame(() => {
      tabTrap.focus()
    })
  }

  const handleClosing = () => {
    tabTrap.stop()
    if (focused) focus()
  }

  /**
   * Methods
   */

  function focus() {
    if (open) calRef.current?.focus()
    else ref.current?.focus()
  }

  function inRangeValue(value: Date | null | undefined) {
    if (value == null) return value

    return dates.max(dates.min(value, (max ?? null)!), (min ?? null)!)
  }

  function formatDate(date: Date) {
    return date instanceof Date && !isNaN(date.getTime())
      ? localizer.formatDate(date, currentFormat)
      : ''
  }

  useImperativeHandle(props.ref, () => ({
    focus,
  }))

  let shouldRenderList = useFirstFocusedRender(focused, open!)

  const inputReadOnly =
    inputProps?.readOnly != null ? inputProps?.readOnly : readOnly;

  return (
    <Widget
      {...elementProps}
      defaultValue={undefined}
      open={!!open}
      dropUp={dropUp}
      focused={focused}
      disabled={disabled}
      readOnly={readOnly}
      onKeyDown={handleKeyDown}
      onKeyPress={handleKeyPress}
      {...focusEvents}
      className={cn(className, 'rw-date-picker')}
    >
      <WidgetPicker className={containerClassName}>
        <DatePickerInput
          {...inputProps}
          id={inputId}
          ref={ref}
          role="combobox"
          name={name}
          value={value}
          tabIndex={tabIndex}
          autoFocus={autoFocus}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={inputReadOnly}
          formatter={currentFormat}
          displayFormat={valueDisplayFormat}
          editFormat={valueEditFormat}
          editing={focused}
          localizer={localizer}
          parse={dateParser}
          onChange={handleChange}
          aria-haspopup
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-expanded={!!open}
          aria-owns={dateId}
        />

        <InputAddon
          icon={selectIcon}
          label={localizer.messages.dateButton()}
          disabled={disabled || readOnly}
          onClick={handleCalendarClick}
        />
      </WidgetPicker>

      {!!shouldRenderList && (
        <Popup
          {...popupProps}
          dropUp={dropUp}
          open={open}
          role="dialog"
          ref={calRef}
          id={dateId}
          className="rw-calendar-popup"
          transition={popupTransition}
          onEntering={handleOpening}
          onExited={handleClosing}
        >
          <Calendar
            min={min}
            max={max}
            bordered={false}
            {...calendarProps}
            messages={{
              ...messages,
              ...calendarProps?.messages,
            }}
            tabIndex={-1}
            value={value}
            autoFocus={false}
            onChange={handleDateSelect}
            currentDate={currentDate}
            onCurrentDateChange={onCurrentDateChange}
            aria-hidden={!open}
            aria-live="polite"
            aria-labelledby={inputId}
          />
          {includeTime && (
            <TimeInput
              {...timeInputProps}
              value={value}
              precision={timePrecision!}
              onChange={handleTimeChange}
              datePart={currentDate}
            />
          )}
        </Popup>
      )}
    </Widget>
  )
}

DatePicker.displayName = 'DatePicker'

export default DatePicker
