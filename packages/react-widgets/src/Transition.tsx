import React, { useState, useEffect, useRef, useCallback, ReactElement, ReactNode, RefObject } from 'react';

// Transition states
export const TRANSITION_STATES = {
    ENTERING: 'entering',
    ENTERED: 'entered',
    EXITING: 'exiting',
    EXITED: 'exited'
} as const;

export type TransitionStatus = typeof TRANSITION_STATES[keyof typeof TRANSITION_STATES];

// Transition component props interface
export interface TransitionProps {
    in: boolean;
    timeout?: number | { enter?: number; exit?: number };
    appear?: boolean;
    enter?: boolean;
    exit?: boolean;
    mountOnEnter?: boolean;
    unmountOnExit?: boolean;
    nodeRef?: RefObject<HTMLElement | null>;
    addEndListener?: (node: HTMLElement, done: () => void) => void;
    onEnter?: (node?: HTMLElement) => void;
    onEntering?: (node?: HTMLElement) => void;
    onEntered?: (node?: HTMLElement) => void;
    onExit?: (node?: HTMLElement) => void;
    onExiting?: (node?: HTMLElement) => void;
    onExited?: (node?: HTMLElement) => void;
    children: ReactNode | ((status: TransitionStatus, nodeRef?: RefObject<HTMLElement | null>) => ReactNode);
}

// Internal callback interface
interface NextCallback {
    (event?: Event): void;
    cancel?: () => void;
}

// Custom Transition component
export const Transition: React.FC<TransitionProps> = ({
    in: inProp,
    timeout = 300,
    appear = false,
    enter = true,
    exit = true,
    mountOnEnter = false,
    unmountOnExit = false,
    nodeRef,
    addEndListener,
    onEnter,
    onEntering,
    onEntered,
    onExit,
    onExiting,
    onExited,
    children
}) => {
    const [status, setStatus] = useState<TransitionStatus | null>(() => {
        if (inProp) {
            return appear ? TRANSITION_STATES.EXITED : TRANSITION_STATES.ENTERED;
        }
        return mountOnEnter || unmountOnExit ? null : TRANSITION_STATES.EXITED;
    });

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const nextCallbackRef = useRef<NextCallback | null>(null);

    const getNode = useCallback(() => {
        return nodeRef?.current || null;
    }, [nodeRef]);

    const getTimeout = useCallback((phase: 'enter' | 'exit') => {
        if (typeof timeout === 'number') {
            return timeout;
        }
        return timeout[phase] || 0;
    }, [timeout]);

    const clearTimeoutHandler = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const setNextCallback = useCallback((callback: () => void): NextCallback => {
        let active = true;

        const nextCallback: NextCallback = () => {
            if (active) {
                callback();
            }
        };

        nextCallback.cancel = () => {
            active = false;
        };

        nextCallbackRef.current = nextCallback;
        return nextCallback;
    }, []);

    const performEnter = useCallback(() => {
        const node = getNode();

        if (!enter) {
            setStatus(TRANSITION_STATES.ENTERED);
            onEntered?.(node || undefined);
            return;
        }

        onEnter?.(node || undefined);
        setStatus(TRANSITION_STATES.ENTERING);
        onEntering?.(node || undefined);

        const next = setNextCallback(() => {
            setStatus(TRANSITION_STATES.ENTERED);
            onEntered?.(node || undefined);
        });

        if (addEndListener && node) {
            addEndListener(node, next);
        } else {
            timeoutRef.current = setTimeout(next, getTimeout('enter'));
        }
    }, [enter, onEnter, onEntering, onEntered, setNextCallback, getTimeout, getNode, addEndListener]);

    const performExit = useCallback(() => {
        const node = getNode();

        if (!exit) {
            setStatus(TRANSITION_STATES.EXITED);
            onExited?.(node || undefined);
            return;
        }

        onExit?.(node || undefined);
        setStatus(TRANSITION_STATES.EXITING);
        onExiting?.(node || undefined);

        const next = setNextCallback(() => {
            setStatus(TRANSITION_STATES.EXITED);
            onExited?.(node || undefined);
        });

        if (addEndListener && node) {
            addEndListener(node, next);
        } else {
            timeoutRef.current = setTimeout(next, getTimeout('exit'));
        }
    }, [exit, onExit, onExiting, onExited, setNextCallback, getTimeout, getNode, addEndListener]);

    useEffect(() => {
        if (inProp && (status === TRANSITION_STATES.EXITED || status === null)) {
            if (status === null) {
                setStatus(TRANSITION_STATES.EXITED);
            }
            performEnter();
        } else if (!inProp && (status === TRANSITION_STATES.ENTERED || status === TRANSITION_STATES.ENTERING)) {
            performExit();
        }
    }, [inProp, status, performEnter, performExit]);

    useEffect(() => {
        return () => {
            clearTimeoutHandler();
            if (nextCallbackRef.current?.cancel) {
                nextCallbackRef.current.cancel();
            }
        };
    }, [clearTimeoutHandler]);

    // Handle mounting/unmounting logic
    if (mountOnEnter && status === null) {
        return null;
    }

    if (unmountOnExit && status === TRANSITION_STATES.EXITED) {
        return null;
    }

    if (typeof children === 'function') {
        return <>{children(status!, nodeRef)}</>;
    }

    return React.cloneElement(children as ReactElement, {
        transitionStatus: status,
        ref: nodeRef
    } as any);
};