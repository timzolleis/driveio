import type { DataFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUser } from '~/utils/user/user.server';
import { prisma } from '../../prisma/db';
import { DateTime } from 'luxon';
import { Outlet, useLoaderData } from '@remix-run/react';
import { Separator } from '~/components/ui/Seperator';
import { BookedLessonCard } from '~/components/features/booking/BookedLessonCard';
import { requireResult } from '~/utils/db/require-result.server';
import { raise } from '~/utils/general-utils';
import { errors } from '~/messages/errors';
import { getLocationByCoordinates } from '~/utils/bing-maps';

export const loader = async ({ request, params }: DataFunctionArgs) => {
    const user = await requireUser(request);
    const lessons = await prisma.drivingLesson.findMany({
        where: {
            userId: user.id,
            start: {
                gte: DateTime.now().startOf('day').toISO() ?? undefined,
            },
            status: 'REQUESTED' || 'CONFIRMED',
        },
    });
    const lessonsWithInstructor = await Promise.all(
        lessons.map(async (lesson) => {
            const instructor = await prisma.user
                .findUnique({ where: { id: lesson.instructorId } })
                .then(requireResult);
            return { lesson, instructor };
        })
    );
    const studentData =
        (await prisma.studentData.findUnique({ where: { userId: user.id } })) ??
        raise(errors.student.noStudentData);
    const pickupLocation = await getLocationByCoordinates(
        studentData.pickupLat,
        studentData.pickupLng
    ).then((res) => res.data);

    return json({ user, lessonsWithInstructor, studentData, pickupLocation });
};

export const action = async ({ request, params }: DataFunctionArgs) => {
    return null;
};

const StudentIndexPage = () => {
    const { user, lessonsWithInstructor, studentData, pickupLocation } =
        useLoaderData<typeof loader>();
    return (
        <>
            <h3 className={'font-semibold text-2xl'}>Hallo, {user.firstName}!</h3>
            <Separator className={'my-2'} />
            <div>
                <h4 className={'font-medium text-lg'}>Meine Fahrstunden</h4>
                <p className={'text-muted-foreground text-sm'}>
                    {DateTime.now().startOf('week').toLocaleString(DateTime.DATE_MED)} -{' '}
                    {DateTime.now().endOf('week').toLocaleString(DateTime.DATE_MED)})
                </p>
                <div className={'grid gap-4 mt-4'}>
                    {lessonsWithInstructor
                        .sort((a, b) => a.lesson.start.localeCompare(b.lesson.start))
                        .map((lessonWithInstructor) => (
                            <BookedLessonCard
                                key={lessonWithInstructor.lesson.id}
                                lesson={lessonWithInstructor.lesson}
                                instructor={lessonWithInstructor.instructor}
                                studentData={studentData}
                                pickupLocation={pickupLocation}
                            />
                        ))}
                </div>
            </div>
            <Outlet />
        </>
    );
};

export default StudentIndexPage;
