import cn from 'classnames'
import * as React from 'react'
import { useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useUncontrolledProp } from 'uncontrollable'
import { caretDown } from './Icon'
import Input from './Input'
import List, { ListHandle } from './List'
import { FocusListContext, useFocusList } from './FocusListContext'
import BasePopup from './Popup'
import InputAddon from './InputAddon'
import Widget from './Widget'
import WidgetPicker from './WidgetPicker'
import { useMessagesWithDefaults } from './messages'
import {
  BaseListboxInputProps,
  ChangeHandler,
  Filterable,
  PopupWidgetProps,
  SelectHandler,
  WidgetHTMLProps,
  WidgetProps,
} from './shared'
import { DataItem, WidgetHandle } from './types'
import { useActiveDescendant } from './A11y'
import { TextAccessorFn, useAccessors } from './Accessors'
import { useFilteredData } from './Filter'
import useDropdownToggle from './useDropdownToggle'
import useFocusManager from './useFocusManager'
import { notify, useFirstFocusedRender, useInstanceId } from './WidgetHelpers'
import { Spinner } from './Icon'

function indexOf<TDataItem>(
  data: readonly TDataItem[],
  searchTerm: string,
  text: TextAccessorFn,
) {
  if (!searchTerm.trim()) return -1
  for (let idx = 0; idx < data.length; idx++)
    if (text(data[idx]).toLowerCase() === searchTerm) return idx
  return -1
}

export type ComboboxHandle = WidgetHandle

export interface ComboboxProps<TDataItem = DataItem>
  extends WidgetHTMLProps,
  WidgetProps,
  PopupWidgetProps,
  Filterable<TDataItem>,
  BaseListboxInputProps<TDataItem, string | TDataItem> {
  name?: string

  /**
   * If a `data` item matches the current typed value select it automatically.
   */
  autoSelectMatches?: boolean
  onChange?: ChangeHandler<TDataItem | string>
  onSelect?: SelectHandler<TDataItem | string>

  hideCaret?: boolean
  hideEmptyPopup?: boolean

  ref?: React.RefObject<ComboboxHandle>,
}


/**
 * ---
 * shortcuts:
 *   - { key: alt + down arrow, label: open combobox }
 *   - { key: alt + up arrow, label: close combobox }
 *   - { key: down arrow, label: move focus to next item }
 *   - { key: up arrow, label: move focus to previous item }
 *   - { key: home, label: move focus to first item }
 *   - { key: end, label: move focus to last item }
 *   - { key: enter, label: select focused item }
 *   - { key: any key, label: search list for item starting with key }
 * ---
 *
 * Select an item from the list, or input a custom value. The Combobox can also make suggestions as you type.

 * @public
 */
function ComboboxImpl<TDataItem>(
  {
    id,
    className,
    containerClassName,
    placeholder,
    autoFocus,

    textField,
    dataKey,
    autoSelectMatches,

    focusFirstItem = false,

    value,
    defaultValue = '',
    onChange,

    open,
    defaultOpen = false,
    onToggle,

    filter = true,
    busy,
    disabled,
    readOnly,
    selectIcon = caretDown,
    hideCaret,
    hideEmptyPopup,
    busySpinner,
    dropUp,
    tabIndex,
    popupTransition,
    name,
    onSelect,
    onKeyDown,
    onBlur,
    onFocus,
    inputProps,
    listProps,
    popupProps,
    groupBy,
    renderListItem,
    renderListGroup,
    optionComponent,
    listComponent: ListComponent = List,
    popupComponent: Popup = BasePopup,
    data: rawData = [],
    messages: userMessages,
    ref: outerRef,
    ...elementProps
  }: ComboboxProps<TDataItem>,
) {
  let [currentValue, handleChange] = useUncontrolledProp(
    value,
    defaultValue,
    onChange,
  )
  const [currentOpen, handleOpen] = useUncontrolledProp(
    open,
    defaultOpen,
    onToggle,
  )

  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<ListHandle>(null)

  const [suggestion, setSuggestion] = useState<TDataItem | null>(null)
  const shouldFilter = useRef(false)

  const inputId = useInstanceId(id, '_input')
  const listId = useInstanceId(id, '_listbox')
  const activeId = useInstanceId(id, '_listbox_active_option')

  const accessors = useAccessors(textField, dataKey)
  const messages = useMessagesWithDefaults(userMessages)
  const toggle = useDropdownToggle(currentOpen, handleOpen)

  const isDisabled = disabled === true
  const isReadOnly = !!readOnly

  const data = useFilteredData(
    rawData,
    filter,
    shouldFilter.current ? accessors.text(currentValue) : void 0,
    accessors.text,
  )

  const selectedItem = useMemo(
    () => data[accessors.indexOf(data, currentValue)],
    [data, currentValue, accessors],
  )

  const list = useFocusList<TDataItem>({
    activeId,
    scope: ref,
    focusFirstItem,
    anchorItem: currentOpen ? selectedItem : undefined,
  })

  const [focusEvents, focused] = useFocusManager(
    ref,
    { disabled: isDisabled, onBlur, onFocus },
    {
      didHandle(focused) {
        if (!focused) {
          shouldFilter.current = false
          toggle.close()
          setSuggestion(null)
          list.focus(undefined)
        } else {
          focus({ preventScroll: true })
        }
      },
    },
  )

  useActiveDescendant(ref, activeId, currentOpen, [list.getFocused()])

  /**
   * Handlers
   */

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly || isDisabled) return

    // prevents double clicks when in a <label>
    e.preventDefault()

    focus()
    toggle()
  }

  const handleSelect = (
    data: string | TDataItem,
    originalEvent: React.SyntheticEvent,
  ) => {
    toggle.close()
    shouldFilter.current = false

    setSuggestion(null)
    notify(onSelect, [data, { originalEvent }])
    change(data, originalEvent, true)
    focus({ preventScroll: true })
  }

  const handleInputKeyDown = ({
    key,
  }: React.KeyboardEvent<HTMLInputElement>) => {
    if (key === 'Backspace' || key === 'Delete') {
      list.focus(null)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let idx = autoSelectMatches
      ? indexOf(rawData, event.target.value.toLowerCase(), accessors.text)
      : -1

    shouldFilter.current = true

    setSuggestion(null)

    const nextValue = idx === -1 ? event.target.value : rawData[idx]

    change(nextValue, event)

    if (!nextValue) toggle.close()
    else toggle.open()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return

    let { key, altKey, shiftKey } = e

    notify(onKeyDown, [e])

    if (e.defaultPrevented) return

    const select = (item: TDataItem | undefined) =>
      item != null && handleSelect(item, e)

    const setFocused = (el?: HTMLElement) => {
      if (!el) return
      setSuggestion(list.toDataItem(el)!)
      list.focus(el)
    }

    if (key === 'End' && currentOpen && !shiftKey) {
      e.preventDefault()
      setFocused(list.last())
    } else if (key === 'Home' && currentOpen && !shiftKey) {
      e.preventDefault()
      setFocused(list.first())
    } else if (key === 'Escape' && currentOpen) {
      e.preventDefault()
      setSuggestion(null)
      toggle.close()
    } else if (key === 'Enter' && currentOpen) {
      e.preventDefault()
      select(list.getFocused()!)
    } else if (key === 'ArrowDown') {
      e.preventDefault()
      if (currentOpen) {
        setFocused(list.next())
      } else {
        return toggle.open()
      }
    } else if (key === 'ArrowUp') {
      e.preventDefault()
      if (altKey) return toggle.close()

      if (currentOpen) {
        setFocused(list.prev())
      }
    }
  }

  /**
   * Methods
   */

  function focus(opts?: FocusOptions) {
    if (inputRef.current) inputRef.current.focus(opts)
  }

  function change(
    nextValue: TDataItem | string,
    originalEvent?: React.SyntheticEvent,
    selected = false,
  ) {
    handleChange(nextValue, {
      lastValue: currentValue,
      originalEvent,
      source: selected ? 'listbox' : 'input',
    })
  }

  /**
   * Rendering
   */

  useImperativeHandle(outerRef, () => ({
    focus,
  }))

  let shouldRenderPopup = useFirstFocusedRender(focused, currentOpen!)

  let valueItem = accessors.findOrSelf(data, currentValue)
  let inputValue = accessors.text(suggestion || valueItem)

  let completeType = filter ? ('list' as const) : ('none' as const)

  let popupOpen = currentOpen && (!hideEmptyPopup || !!data.length)
  let inputReadOnly =
    // @ts-ignore
    inputProps?.readOnly != null ? inputProps?.readOnly : readOnly

  let inputAddon: React.ReactNode = false

  if (!hideCaret) {
    inputAddon = (
      <InputAddon
        busy={busy}
        icon={selectIcon}
        spinner={busySpinner}
        onClick={handleClick}
        disabled={!!isDisabled || isReadOnly}
        // FIXME
        label={messages.openCombobox()}
      />
    )
  } else if (busy) {
    inputAddon = (
      <span aria-hidden="true" className="rw-btn rw-picker-caret">
        {busySpinner || Spinner}
      </span>
    )
  }

  return (
    <Widget
      {...elementProps}
      ref={ref}
      open={currentOpen}
      dropUp={dropUp}
      focused={focused}
      disabled={isDisabled}
      readOnly={isReadOnly}
      {...focusEvents}
      onKeyDown={handleKeyDown}
      className={cn(className, 'rw-combobox')}
    >
      <WidgetPicker
        className={cn(
          containerClassName,
          hideCaret && 'rw-widget-input',
          hideCaret && !busy && 'rw-hide-caret',
        )}
      >
        <Input
          {...inputProps}
          role="combobox"
          name={name}
          id={inputId}
          className={cn(
            // @ts-ignore
            inputProps && inputProps.className,
            'rw-combobox-input',
            !hideCaret && 'rw-widget-input',
          )}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          disabled={isDisabled}
          readOnly={inputReadOnly}
          aria-busy={!!busy}
          aria-owns={listId}
          aria-autocomplete={completeType}
          aria-expanded={currentOpen}
          aria-haspopup={true}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          ref={inputRef}
        />
        {inputAddon}
      </WidgetPicker>
      <FocusListContext.Provider value={list.context}>
        {shouldRenderPopup && (
          <Popup
            {...popupProps}
            dropUp={dropUp}
            open={popupOpen}
            transition={popupTransition}
            onEntering={() => listRef.current!.scrollIntoView()}
          >
            <ListComponent
              {...listProps}
              id={listId}
              tabIndex={-1}
              data={data}
              groupBy={groupBy}
              disabled={disabled}
              accessors={accessors}
              renderItem={renderListItem}
              renderGroup={renderListGroup}
              optionComponent={optionComponent}
              value={selectedItem}
              searchTerm={(valueItem && accessors.text(valueItem)) || ''}
              aria-hidden={!popupOpen}
              aria-labelledby={inputId}
              aria-live={popupOpen ? 'polite' : void 0}
              onChange={(d, meta) =>
                handleSelect(d as TDataItem, meta.originalEvent!)
              }
              ref={listRef}
              messages={{
                emptyList: rawData.length
                  ? messages.emptyFilter
                  : messages.emptyList,
              }}
            />
          </Popup>
        )}
      </FocusListContext.Provider>
    </Widget>
  )
}

ComboboxImpl.displayName = 'Combobox'

export default ComboboxImpl
