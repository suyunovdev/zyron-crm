import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json(
        { students: [], parents: [], teachers: [], groups: [] },
        { status: 200 }
      );
    }

    // Filial cheklovi: qidiruv natijalari ham faqat o'z filialidan
    const bId = await scopedBranchId(auth);
    const bWhere = bId ? { branchId: bId } : {};

    const [students, parents, teachers, groups] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "student",
          ...bWhere,
          OR: [
            { name: { contains: q } },
            { login: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          login: true,
          phone: true,
          status: true,
        },
        take: 6,
      }),

      prisma.user.findMany({
        where: {
          role: "parent",
          ...bWhere,
          OR: [
            { name: { contains: q } },
            { login: { contains: q } },
            { phone: { contains: q } },
            // Farzand ismi bo'yicha ham topilsin (o'quvchi ismini yozganда ota-ona chiqadi)
            { children: { some: { name: { contains: q } } } },
          ],
        },
        select: {
          id: true,
          name: true,
          login: true,
          phone: true,
          status: true,
          children: { select: { id: true, name: true } },
        },
        take: 6,
      }),

      prisma.user.findMany({
        where: {
          role: "teacher",
          ...bWhere,
          OR: [
            { name: { contains: q } },
            { login: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          login: true,
          phone: true,
        },
        take: 6,
      }),

      prisma.group.findMany({
        where: {
          ...bWhere,
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

    return NextResponse.json({ students, parents, teachers, groups });
  } catch (error) {
    logger.error("Search error:", error);
    return NextResponse.json(
      { error: "Qidiruvda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
