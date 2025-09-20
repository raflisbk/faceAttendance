import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { generateExcelReport, generateAttendanceSummaryReport, generateUserReport } from '@/lib/excel-export'
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
          faceProfile: true,
          _count: {
            select: {
              attendances: true,
              classesAsLecturer: true,
              enrollments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.class.findMany({
        include: {
          lecturer: {
            select: {
              name: true,
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
          ...(startDate || endDate ? { timestamp: dateFilter } : {})
        },
        include: {
          user: {
            select: {
              name: true,
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
                  name: true
                }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' }
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
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
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
      generatedBy: {
        id: user.id,
        name: user.name || 'Unknown User',
        email: user.email,
        role: user.role
      }
    })

    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="admin_report_${new Date().toISOString().split('T')[0]}.xlsx"`)

    return new NextResponse(new Uint8Array(excelBuffer), {
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

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      reportType = 'comprehensive',
      startDate,
      endDate,
      filters = {}
    } = body

    // Validate dates
    let startDateObj: Date | null = null
    let endDateObj: Date | null = null

    if (startDate) {
      startDateObj = new Date(startDate)
      if (isNaN(startDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        )
      }
    }

    if (endDate) {
      endDateObj = new Date(endDate)
      if (isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date format' },
          { status: 400 }
        )
      }
    }

    const dateFilter = {
      ...(startDateObj && { gte: startDateObj }),
      ...(endDateObj && { lte: endDateObj })
    }

    let excelBuffer: Buffer

    switch (reportType) {
      case 'attendance':
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            ...(startDateObj || endDateObj ? { timestamp: dateFilter } : {}),
            ...(filters.classId && { classId: filters.classId }),
            ...(filters.userId && { userId: filters.userId }),
            ...(filters.method && { method: filters.method }),
            ...(filters.isValid !== undefined && { isValid: filters.isValid })
          },
          include: {
            user: {
              select: {
                name: true,
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
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        })

        excelBuffer = await generateAttendanceSummaryReport(
          attendanceRecords,
          { startDate: startDateObj, endDate: endDateObj },
          user
        )
        break

      case 'users':
        const userData = await prisma.user.findMany({
          where: {
            ...(filters.role && { role: filters.role }),
            ...(filters.status && { status: filters.status }),
            ...(startDateObj || endDateObj ? { createdAt: dateFilter } : {})
          },
          include: {
            faceProfile: true,
            _count: {
              select: {
                attendances: true,
                classesAsLecturer: true,
                enrollments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        excelBuffer = await generateUserReport(userData, user)
        break

      case 'comprehensive':
      default:
        // Gather all data for comprehensive report
        const [users, classes, allAttendanceRecords, locations, faceProfiles] = await Promise.all([
          prisma.user.findMany({
            include: {
              faceProfile: true,
              _count: {
                select: {
                  attendances: true,
                  classesAsLecturer: true,
                  enrollments: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }),

          prisma.class.findMany({
            include: {
              lecturer: {
                select: {
                  name: true,
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
              ...(startDateObj || endDateObj ? { timestamp: dateFilter } : {})
            },
            include: {
              user: {
                select: {
                  name: true,
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
                      name: true
                    }
                  }
                }
              }
            },
            orderBy: { timestamp: 'desc' }
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
                  name: true,
                  email: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          })
        ])

        excelBuffer = await generateExcelReport({
          reportType,
          data: {
            users,
            classes,
            attendanceRecords: allAttendanceRecords,
            locations,
            faceProfiles
          },
          dateRange: {
            startDate: startDateObj,
            endDate: endDateObj
          },
          generatedBy: {
        id: user.id,
        name: user.name || 'Unknown User',
        email: user.email,
        role: user.role
      }
        })
        break
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${reportType}_report_${timestamp}.xlsx`

    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    headers.set('Content-Length', excelBuffer.length.toString())

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Export report error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
