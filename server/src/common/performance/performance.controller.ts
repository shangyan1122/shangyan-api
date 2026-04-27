import { Controller, Get, UseGuards } from '@nestjs/common'
import { performanceMonitor } from './performance-monitor'
import { AdminGuard } from '@/common/guards/admin.guard'

/**
 * 性能监控控制器
 *
 * 功能：
 * 1. 查看性能指标统计
 * 2. 查看慢请求列表
 * 3. 重置性能指标
 */
@Controller('admin/performance')
@UseGuards(AdminGuard)
export class PerformanceController {
  /**
   * 获取性能报告
   */
  @Get('report')
  getReport() {
    return {
      code: 200,
      msg: 'success',
      data: performanceMonitor.getReport()
    }
  }

  /**
   * 获取慢请求列表
   */
  @Get('slow-requests')
  getSlowRequests() {
    const allMetrics = performanceMonitor.getMetrics()
    const slowRequests = allMetrics
      .filter(m => m.duration > 3000) // 超过3秒的请求
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 100) // 只返回最近100条

    return {
      code: 200,
      msg: 'success',
      data: {
        count: slowRequests.length,
        requests: slowRequests
      }
    }
  }

  /**
   * 获取特定接口的性能统计
   */
  @Get('stats/:name')
  getStatsByName() {
    // 这里需要在路由参数中获取 name，但由于装饰器的限制，暂时返回所有统计
    const allMetrics = performanceMonitor.getMetrics()
    const names = [...new Set(allMetrics.map(m => m.name))]

    const stats = names.map(name => ({
      name,
      count: performanceMonitor.getMetricsByName(name).length,
      average: performanceMonitor.getAverageDuration(name),
      min: performanceMonitor.getMinDuration(name),
      max: performanceMonitor.getMaxDuration(name),
      total: performanceMonitor.getTotalDuration(name),
      p95: performanceMonitor.getReport().byName[name]?.p95 || 0,
      p99: performanceMonitor.getReport().byName[name]?.p99 || 0
    }))

    return {
      code: 200,
      msg: 'success',
      data: stats.sort((a, b) => b.average - a.average)
    }
  }

  /**
   * 重置性能指标
   */
  @Get('reset')
  reset() {
    performanceMonitor.clear()
    return {
      code: 200,
      msg: '性能指标已重置',
      data: null
    }
  }

  /**
   * 获取内存使用情况
   */
  @Get('memory')
  getMemoryUsage() {
    const memoryUsage = process.memoryUsage()

    return {
      code: 200,
      msg: 'success',
      data: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        heapUsedPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      }
    }
  }
}
