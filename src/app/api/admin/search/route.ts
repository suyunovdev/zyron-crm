import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json(
        { students: [], teachers: [], groups: [] },
        { status: 200 }
      );
    }

    const [students, teachers, groups] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "student",
          OR: [
            { name: { contains: q } },
            { login: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          login: true,
          phone: true,
          status: true,
        },
        take: 5,
      }),

      prisma.user.findMany({
        where: {
          role: "teacher",
          OR: [
            { name: { contains: q } },
            { login: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          login: true,
          phone: true,
        },
        take: 5,
      }),

      prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { subject: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          _count: {
            select: { students: true },
          },
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({ students, teachers, groups });
  } catch (error) {
    logger.error("Search error:", error);
    return NextResponse.json(
      { error: "Qidiruvda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
