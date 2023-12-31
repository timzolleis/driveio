import { DateTime } from 'luxon';
import { getSafeISOStringFromDateTime } from '~/utils/luxon/parse-hour-minute';
import { LessonStatus } from '@prisma/client';
import { prisma } from '../../prisma/db';
import type { DrivingLesson } from '.prisma/client';

export async function findLesson(lessonId: string) {
    return prisma.drivingLesson.findUnique({ where: { id: lessonId }, include: { student: true } });
}

export async function findInstructorLessons(
    instructorId: string,
    date: DateTime,
    status?: LessonStatus
) {
    return prisma.drivingLesson.findMany({
        where: {
            instructorId,
            start: {
                gte: date.startOf('day').toISO() ?? undefined,
                lt: date.startOf('day').plus({ days: 1 }).toISO() ?? undefined,
            },
            status: status ? status : 'REQUESTED' || 'CONFIRMED',
        },
        include: {
            student: {
                include: {
                    studentData: true,
                },
            },
        },
    });
}

export async function findWeeklyLessons({
    instructorId,
    start,
}: {
    instructorId: string;
    start?: DateTime;
}) {
    return prisma.drivingLesson.findMany({
        where: {
            instructorId,
            start: {
                gte: start
                    ? start.startOf('week').toISO() ?? undefined
                    : DateTime.now().startOf('week').toISO() ?? undefined,
                lte: start
                    ? start.endOf('week').toISO() ?? undefined
                    : DateTime.now().endOf('week').toISO() ?? undefined,
            },
        },
        include: {
            student: true,
        },
    });
}

export async function findDailyLessons(instructorId: string, day: DateTime, status?: LessonStatus) {
    return prisma.drivingLesson.findMany({
        where: {
            instructorId,
            status,
            start: {
                gte: getSafeISOStringFromDateTime(day.startOf('day')),
                lte: getSafeISOStringFromDateTime(day.endOf('day')),
            },
        },
        include: {
            student: {
                include: {
                    studentData: true,
                },
            },
        },
    });
}

export async function shiftLessons(lessonsToShift: DrivingLesson[]) {
    for (const lessonToShift of lessonsToShift) {
        await prisma.drivingLesson.update({
            where: {
                id: lessonToShift.id,
            },
            data: {
                start: lessonToShift.start,
                end: lessonToShift.end,
            },
        });
    }
}

export async function findStudentLessons(studentId: string, date: DateTime) {
    return prisma.drivingLesson.findMany({
        where: {
            userId: studentId,
            start: {
                gte: date.startOf('week').toISO() ?? undefined,
                lte: date.endOf('week').toISO() ?? undefined,
            },
            status: 'REQUESTED' || 'CONFIRMED',
        },
    });
}

interface RequestLessonProps {
    start: DateTime;
    end: DateTime;
    userId: string;
    instructorId: string;
    description?: string;
    lessonTypeId: string;
}

export async function requestLesson({
    start,
    end,
    userId,
    instructorId,
    description,
    lessonTypeId,
}: RequestLessonProps) {
    return prisma.drivingLesson.create({
        data: {
            userId,
            instructorId,
            start: getSafeISOStringFromDateTime(start),
            end: getSafeISOStringFromDateTime(end),
            status: LessonStatus.REQUESTED,
            description,
            lessonTypeId,
        },
    });
}

export async function cancelLesson({
    lessonId,
    userId,
    description,
}: {
    lessonId: DrivingLesson['id'];
    userId: string;
    description: DrivingLesson['description'];
}) {
    return prisma.drivingLesson.update({
        where: { id: lessonId },
        data: {
            description,
            status: LessonStatus.DECLINED,
            lessonActions: {
                create: {
                    action: 'cancel',
                    userId: userId,
                },
            },
        },
    });
}
