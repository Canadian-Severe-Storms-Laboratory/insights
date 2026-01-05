import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isFormFieldInvalid(field: {
    state: { meta: { isTouched: boolean; isValid: boolean } };
}) {
    return field.state.meta.isTouched && !field.state.meta.isValid;
}
