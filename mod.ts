import { Abortable } from "https://deno.land/x/abortable/mod.ts"

export type EventPriority =
  "before" | "normal" | "after";

export type EventListener<V> =
  (x: V) => unknown | Promise<unknown>

export type EventListeners<T> = {
  [K in keyof T]?: EventListener<T[K]>[]
}

export class Cancelled {
  constructor(readonly reason?: string) { }
}

export class EventEmitter<T> {
  listeners: {
    [P in EventPriority]: EventListeners<T>
  } = {
      "before": {},
      "normal": {},
      "after": {}
    }

  /**
   * Get the listeners of the given event type and priority
   * @param type Event type
   * @param priority Event priority
   * @returns Listeners of the given event type and priority
   */
  listenersOf<K extends keyof T>(
    type: K, priority: EventPriority = "normal"
  ) {
    let listeners = this.listeners[priority][type]
    if (!listeners) this.listeners[priority][type] = []
    return this.listeners[priority][type]!;
  }

  /**
   * Execute the given listener each time the given event type is emitted
   * @param [type, priority] Event type and priority
   * @param listener Listener
   * @returns Cleanup function
   */
  on<K extends keyof T>(
    [type, priority = "normal"]: [K, EventPriority?],
    listener: EventListener<T[K]>
  ) {
    const i = this.listenersOf(type, priority).push(listener)
    return () => delete this.listenersOf(type, priority)[i]
  }

  /**
   * Execute the given listener once the given event type is emitted
   * (self-cancelling event listener)
   * @param [type, priority] Event type and priority
   * @param listener Listener
   * @returns Cleanup function
   */
  once<K extends keyof T>(
    [type, priority = "normal"]: [K, EventPriority?],
    listener: EventListener<T[K]>
  ) {
    const off = this.on([type, priority],
      (e) => { off(); listener(e) })
    return off
  }

  /**
   * Abortable promise that resolves (with the result) when the given event type is emitted
   * @param [type, priority] Event type and priority
   * @param filter Only resolve if it returns true
   * @returns Abortable promise
   */
  wait<K extends keyof T>(
    [type, priority = "normal"]: [K, EventPriority?],
    filter?: (data: T[K]) => boolean
  ) {
    return Abortable.create<T[K]>((ok) =>
      this.on([type, priority],
        d => (!filter || filter?.(d)) && ok(d)))
  }

  /**
   * Promise that rejects (with the result) when the given event type is emitted
   * @param [type, priority] Event type and priority
   * @param filter Only reject if it returns true
   * @returns Abortable promise
   */
  error<K extends keyof T>(
    [type, priority = "normal"]: [K, EventPriority?],
    filter?: (data: T[K]) => boolean
  ) {
    return Abortable.create<never>((_, err) =>
      this.on([type, priority],
        d => (!filter || filter?.(d)) && err(d)))
  }

  /**
   * Asynchronously emits the given data on the given event type
   * @param type Event type
   * @param data Event data
   * @returns Cancelled if any listener threw Cancelled; nothing else
   * @throws An unknown if any listener threw something (except Cancelled); nothing else
   */
  async emit<K extends keyof T>(type: K, data: T[K]): Promise<Cancelled | undefined> {
    try {
      for (const listener of [
        ...this.listenersOf(type, "before"),
        ...this.listenersOf(type, "normal"),
        ...this.listenersOf(type, "after")
      ]) await listener(data)
    } catch (e: unknown) {
      if (e instanceof Cancelled)
        return e
      throw e
    }
  }

  /**
   * Synchronously emits the given data on the given event type
   * @param type Event type
   * @param data Event data
   * @returns Cancelled if any listener (synchronously) threw Cancelled; nothing else
   * @throws An unknown if any listener (synchronously) threw something (except Cancelled); nothing else
   */
  emitSync<K extends keyof T>(type: K, data: T[K]) {
    try {
      for (const listener of [
        ...this.listenersOf(type, "before"),
        ...this.listenersOf(type, "normal"),
        ...this.listenersOf(type, "after")
      ]) listener(data)
    } catch (e: unknown) {
      if (e instanceof Cancelled)
        return e
      throw e
    }
  }

  /**
   * Shortcut for creating an event listener
   * that reemits the data on the given event type
   * @param type Event type you want to reemit to
   * @example sub.on(["close"], this.reemit("close"))
   */
  reemit<K extends keyof T>(type: K) {
    return (data: T[K]) => this.emit(type, data)
  }

  /**
   * Shortcut for creating an event listener that
   * synchronously reemits the data on the given event type
   * @param type Event type you want to reemit to
   * @example this.on(["close"], this.reemitSync("close"))
   */
  reemitSync<K extends keyof T>(type: K) {
    return (data: T[K]) => this.emitSync(type, data)
  }
}