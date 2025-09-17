import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { generateExcelReport } from '@/lib/excel-export'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'comprehensive'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Date range for the report
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) })
    }

    // Gather comprehensive data
    const [
      users,
      classes,
      attendanceRecords,
      locations,
      faceProfiles
    ] = await Promise.all([
      prisma.user.findMany({
        include: {
          profile: true,
          _count: {
            select: {
              attendances: true,
              teachingClasses: true,
              enrolledClasses: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.class.findMany({
        include: {
          lecturer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          location: {
            select: {
              name: true,
              building: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              attendances: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.attendance.findMany({
        where: {
          ...(startDate || endDate ? { date: dateFilter } : {})
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              email: true
            }
          },
          class: {
            select: {
              name: true,
              code: true,
              lecturer: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      
      prisma.location.findMany({
        include: {
          _count: {
            select: {
              classes: true
            }
          }
        }
      }),
      
      prisma.faceProfile.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      })
    ])

    // Generate Excel report
    const excelBuffer = await generateExcelReport({
      reportType,
      data: {
        users,
        classes,
        attendanceRecords,
        locations,
        faceProfiles
      },
      dateRange: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      generatedBy: user
    })

    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="admin_report_${new Date().toISOString().split('T')[0]}.xlsx"`)

    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Export report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
