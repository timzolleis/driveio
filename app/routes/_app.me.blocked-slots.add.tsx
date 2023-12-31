import { Modal } from '~/components/ui/Modal';
import { useActionData } from '@remix-run/react';
import type { DataFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { zfd } from 'zod-form-data';
import { z, ZodError } from 'zod';
import { errors } from '~/messages/errors';
import { prisma } from '../../prisma/db';
import { DateTime } from 'luxon';
import { requireManagementPermissions } from '~/utils/user/user.server';
import { BlockedSlotForm } from '~/components/features/blocked-slots/BlockedSlotForm';
import { handleActionError } from '~/utils/general-utils';

export const timeFormatSchema = z.string().regex(/^\d{2}:\d{2}$/, errors.form.invalidTime);

const addBlockedSlotsSchema = zfd.formData({
    name: zfd.text(z.string().optional()),
    blockedSlotStartDate: zfd.text(),
    blockedSlotStartTime: zfd.text(timeFormatSchema),
    blockedSlotEndDate: zfd.text(),
    blockedSlotEndTime: zfd.text(timeFormatSchema),
    repeat: zfd.text(z.enum(['NEVER', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])),
});

export function getBlockedSlotFromFormData(formData: FormData) {
    const data = addBlockedSlotsSchema.parse(formData);
    const startDate = parseDateTime(data.blockedSlotStartDate, data.blockedSlotStartTime).toISO();
    const endDate = parseDateTime(data.blockedSlotEndDate, data.blockedSlotEndTime).toISO();
    if (!startDate || !endDate) {
        throw new Error('Error parsing dates');
    }
    return { data, startDate, endDate };
}

function parseDateTime(dateString: string, timeString: z.infer<typeof timeFormatSchema>) {
    const date = DateTime.fromISO(dateString);
    const [hours, minutes] = timeString.split(':');
    return date.set({ hour: parseInt(hours), minute: parseInt(minutes) });
}

export const action = async ({ request, params }: DataFunctionArgs) => {
    try {
        const user = await requireManagementPermissions(request);
        const { data, startDate, endDate } = getBlockedSlotFromFormData(await request.formData());
        await prisma.blockedSlot.create({
            data: {
                userId: user.id,
                startDate,
                endDate,
                name: data.name,
                repeat: data.repeat,
            },
        });
        return redirect(`/me/blocked-slots`);
    } catch (error) {
        return handleActionError(error);
    }
};

const BlockedSlotsPage = () => {
    const actionData = useActionData();
    const formErrors = actionData?.formValidationErrors;

    return (
        <Modal open={true}>
            <BlockedSlotForm intent={'ADD'} errors={formErrors}></BlockedSlotForm>
        </Modal>
    );
};

export default BlockedSlotsPage;
