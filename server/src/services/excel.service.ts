import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  label: string
  width?: number
}

/**
 * Excel 导出服务
 */
@Injectable()
export class ExcelService {
  /**
   * 导出数据到 Excel
   * @param data 数据数组
   * @param columns 列定义
   * @param filename 文件名
   */
  async exportToExcel<T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    filename: string
  ): Promise<Buffer> {
    // 1. 转换数据格式
    const worksheetData = data.map(row => {
      const rowData: any = {}
      columns.forEach(col => {
        rowData[col.label] = row[col.key] ?? ''
      })
      return rowData
    })

    // 2. 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    // 3. 设置列宽
    const colWidths = columns.map(col => ({
      wch: col.width || 15
    }))
    worksheet['!cols'] = colWidths

    // 4. 创建工作簿并添加工作表
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 5. 生成 Buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer'
    })

    return excelBuffer
  }

  /**
   * 导出多个工作表到一个 Excel 文件
   */
  async exportMultipleSheets(
    sheets: Array<{
      name: string
      data: any[]
      columns: ExportColumn[]
    }>,
    filename: string
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new()

    sheets.forEach(sheet => {
      const worksheetData = sheet.data.map(row => {
        const rowData: any = {}
        sheet.columns.forEach(col => {
          rowData[col.label] = row[col.key] ?? ''
        })
        return rowData
      })

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)

      // 设置列宽
      const colWidths = sheet.columns.map(col => ({
        wch: col.width || 15
      }))
      worksheet['!cols'] = colWidths

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    })

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer'
    })

    return excelBuffer
  }

  /**
   * 格式化日期
   */
  formatDate(date: string | Date): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleString('zh-CN')
  }

  /**
   * 格式化金额
   */
  formatAmount(amount: number): string {
    return `¥${(amount / 100).toFixed(2)}`
  }

  /**
   * 格式化手机号（脱敏）
   */
  formatPhone(phone: string): string {
    if (!phone) return ''
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
}
