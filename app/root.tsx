import type { DataFunctionArgs, LinksFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
    useRouteError,
} from '@remix-run/react';

import stylesheet from '~/tailwind-output.css';
import { getUser } from '~/utils/user/user.server';
import { getToastMessage } from '~/utils/flash/toast.server';
import { Toaster } from '~/components/ui/Toaster';
import * as React from 'react';
import { useEffect } from 'react';
import { useToast } from '~/components/ui/use-toast';
import { ErrorComponent } from '~/components/ui/ErrorComponent';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: stylesheet }];

export const loader = async ({ request }: DataFunctionArgs) => {
    const user = await getUser(request);
    if (!user) {
        if (request.url.includes('login')) {
            const { header, toastMessage } = await getToastMessage(request);
            return json({ user, toastMessage }, { headers: { 'Set-Cookie': header } });
        }
        if (request.url.includes('register')) {
            const { header, toastMessage } = await getToastMessage(request);
            return json({ user, toastMessage }, { headers: { 'Set-Cookie': header } });
        } else {
            return redirect('/login');
        }
    }

    const { header, toastMessage } = await getToastMessage(request);
    return json({ user, toastMessage }, { headers: { 'Set-Cookie': header } });
};

export default function App() {
    const { toastMessage } = useLoaderData<typeof loader>();
    const { toast } = useToast();

    useEffect(() => {
        if (toastMessage) {
            toast(toastMessage);
        }
    }, [toastMessage]);

    return (
        <html lang='en'>
            <head>
                <meta charSet='utf-8' />
                <meta name='viewport' content='width=device-width,initial-scale=1' />
                <Meta />
                <Links />
            </head>
            <body>
                <Toaster />
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
