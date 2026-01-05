export function singleton<Value>(name: string, value: () => Value): Value {
    const globalAny: any = global;
    globalAny.__singletons = globalAny.__singletons || {};

    if (!globalAny.__singletons[name]) {
        globalAny.__singletons[name] = value();
    }

    return globalAny.__singletons[name];
}
