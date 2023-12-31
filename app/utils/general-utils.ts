import type { Params } from '@remix-run/react';
import { ZodError } from 'zod';
import { json, redirect, TypedResponse } from '@remix-run/node';
import { errors } from '~/messages/errors';
import type React from 'react';
import { useState } from 'react';
import type { SchemaValidationErrorActionData } from '~/types/general-types';
import { toastMessage } from '~/utils/flash/toast.server';
import { getSafeISODate, getSafeISOStringFromDateTime } from '~/utils/luxon/parse-hour-minute';
import { DateTime } from 'luxon';
import type { User } from '.prisma/client';

export function requireParameter(parameter: string, parameters: Params) {
    const value = parameters[parameter];
    if (!value) {
        throw new Error(`The parameter ${parameter} is required`);
    }
    return value;
}

export function getQuery(request: Request, query: string) {
    const url = new URL(request.url);
    return url.searchParams.get(query);
}

export function raise(error: string): never {
    throw new Error(error);
}

export function handleActionError(error: unknown) {
    if (error instanceof Response) {
        const url = error.headers.get('location');
        if (url) return redirect(url);
    }

    if (error instanceof ZodError) {
        return json({ formValidationErrors: error.formErrors.fieldErrors });
    }
    if (error instanceof Error) {
        return json({ error: error.message }, {});
    }
    return json({ error: errors.unknown });
}

export function handleModalIntent(formData: FormData, redirectTo: string) {
    const intent = formData.get('intent')?.toString();
    if (intent === 'cancel') {
        throw redirect(redirectTo);
    }
    return intent;
}

export function mergeHeaders(...headers: Array<ResponseInit['headers']>) {
    const merged = new Headers();
    for (const header of headers) {
        for (const [key, value] of new Headers(header).entries()) {
            merged.set(key, value);
        }
    }
    return merged;
}

export function combineHeaders(...headers: Array<ResponseInit['headers']>) {
    const combined = new Headers();
    for (const header of headers) {
        for (const [key, value] of new Headers(header).entries()) {
            combined.append(key, value);
        }
    }
    return combined;
}

function callAll<Args extends Array<unknown>>(
    ...fns: Array<((...args: Args) => unknown) | undefined>
) {
    return (...args: Args) => fns.forEach((fn) => fn?.(...args));
}

export function useDoubleCheck() {
    const [doubleCheck, setDoubleCheck] = useState(false);

    function getButtonProps(props?: React.ButtonHTMLAttributes<HTMLButtonElement>) {
        const onBlur: React.ButtonHTMLAttributes<HTMLButtonElement>['onBlur'] = () =>
            setDoubleCheck(false);

        const onClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = doubleCheck
            ? undefined
            : (e) => {
                  e.preventDefault();
                  setDoubleCheck(true);
              };

        return {
            ...props,
            onBlur: callAll(onBlur, props?.onBlur),
            onClick: callAll(onClick, props?.onClick),
        };
    }

    return { doubleCheck, getButtonProps };
}

export function transformErrors<T>(
    errors: SchemaValidationErrorActionData<T>['formValidationErrors'] | undefined
) {
    if (!errors) return undefined;
    const transformedErrors: { [P in keyof T]?: string } = {};
    const keys = Object.keys(errors);
    keys.forEach((key) => {
        transformedErrors[key as keyof typeof errors] = errors?.[key as keyof typeof errors]?.[0];
    });
    return transformedErrors;
}

export function getBookingLink() {
    return `/book`;
}

export function safeParseFloat(value: string | undefined | null | number) {
    try {
        if (typeof value === 'number') return value;
        return value ? parseFloat(value) : undefined;
    } catch (error) {
        return undefined;
    }
}

export function getGreeting(user: User) {
    const hour = DateTime.now().hour;
    let timeGreeting = 'Morgen';
    const noon = hour >= 12 && hour < 14;
    const afternoon = hour >= 14 && hour < 18;
    const evening = hour >= 18;
    if (noon) {
        timeGreeting = 'Mittag';
    }
    if (afternoon) {
        timeGreeting = 'Nachmittag';
    }
    if (evening) {
        timeGreeting = 'Abend';
    }
    return `Guten ${timeGreeting}, ${user.firstName}`;
}

export function getRandomCode(length: number) {
    return Math.floor(
        Math.pow(10, length - 1) +
            Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
    );
}
