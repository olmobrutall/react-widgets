import React, {
    useEffect,
    useRef,
    useState,
    ReactNode,
    RefObject,
    useLayoutEffect,
} from 'react'

export type TransitionStatus = 'entering' | 'entered' | 'exiting' | 'exited'


export interface TransitionProps {
    in: boolean;
    appear?: boolean;
    nodeRef: RefObject<HTMLElement | null>;
    children: (status: TransitionStatus, innerProps: { ref: RefObject<any> }) => React.ReactElement;
    timeout?: number;
    addEndListener?: (done: () => void) => void;
    onEnter?: () => void;
    onEntering?: () => void;
    onEntered?: () => void;
    onExit?: () => void;
    onExited?: () => void;
}
export function Transition({
    in: inProp,
    appear = false,
    nodeRef,
    children,
    timeout,
    addEndListener,
    onEnter,
    onEntering,
    onEntered,
    onExit,
    onExited,
}: TransitionProps): React.ReactElement | null {

    const [status, setStatus] = useState<TransitionStatus>(() => {
        return inProp ? (appear ? 'exited' : 'entered') : 'exited'
    })

    const hasAppeared = useRef(false)
    const transitioningRef = useRef(false)

    useLayoutEffect(() => {
        if (!appear || hasAppeared.current) return
        hasAppeared.current = true

        if (inProp) {
            setStatus('entering')
            onEnter?.()
            onEntering?.()

            addEndListener?.(() => {
                setStatus('entered')
                onEntered?.()
            })
        }
    }, [])

    useEffect(() => {
        const node = nodeRef.current
        if (!node || transitioningRef.current) return

        if (appear && !hasAppeared.current) {
            return
        }

        let cancelled = false
        transitioningRef.current = true

        const finish = () => {
            if (cancelled) return
            if (inProp) {
                setStatus('entered')
                onEntered?.()
            } else {
                setStatus('exited')
                onExited?.()
            }
            transitioningRef.current = false
        }

        if (inProp) {
            if (status === 'entered') return
            setStatus('entering')
            onEnter?.()
            onEntering?.()
        } else {
            if (status === 'exited') return
            setStatus('exiting')
            onExit?.()
        }

        if (addEndListener) {
            addEndListener(finish)
        } else if (typeof timeout === 'number') {
            const id = setTimeout(finish, timeout)
            return () => {
                clearTimeout(id)
                cancelled = true
            }
        }

        return () => {
            cancelled = true
        }
    }, [inProp])

    return children(status, { ref: nodeRef })
}
