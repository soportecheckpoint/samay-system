type GenericHandler = (...args: unknown[]) => void;

export class HandlerRegistry {
  private readonly registry = new Map<string, Map<GenericHandler, GenericHandler>>();

  register(key: string, handler: GenericHandler, wrapped: GenericHandler): void {
    const handlers = this.registry.get(key) ?? new Map<GenericHandler, GenericHandler>();
    handlers.set(handler, wrapped);
    this.registry.set(key, handlers);
  }

  resolve(key: string, handler: GenericHandler): GenericHandler | undefined {
    const handlers = this.registry.get(key);
    return handlers?.get(handler);
  }

  unregister(key: string, handler: GenericHandler): void {
    const handlers = this.registry.get(key);
    if (!handlers) {
      return;
    }

    handlers.delete(handler);

    if (handlers.size === 0) {
      this.registry.delete(key);
    }
  }
}
